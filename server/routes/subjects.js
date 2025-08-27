const express = require('express');
const router = express.Router();
const { requireRole, authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM subjects ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Get subject by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM subjects WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
});

// Create new subject (Super Admin and Principal only)
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { name, code, description, color_code, credits } = req.body;
    
    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }
    
    // Check if code already exists
    const existingSubject = await db.query('SELECT id FROM subjects WHERE code = $1', [code]);
    if (existingSubject.rows.length > 0) {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    
    const result = await db.query(
      'INSERT INTO subjects (name, code, description, color, credits, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, code, description || null, color_code || '#3B82F6', credits || 3, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// Update subject (Super Admin and Principal only)
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, color_code, credits } = req.body;
    
    // Check if code already exists for other subjects
    if (code) {
      const existingSubject = await db.query('SELECT id FROM subjects WHERE code = $1 AND id != $2', [code, id]);
      if (existingSubject.rows.length > 0) {
        return res.status(400).json({ error: 'Subject code already exists' });
      }
    }
    
    const result = await db.query(
      'UPDATE subjects SET name = $1, code = $2, description = $3, color = $4, credits = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
      [name, code, description, color_code, credits, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete subject (Super Admin and Principal only)
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if subject has schedules
    const schedulesResult = await db.query('SELECT id FROM schedules WHERE subject_id = $1 LIMIT 1', [id]);
    if (schedulesResult.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete subject with existing schedules' });
    }
    
    const result = await db.query('DELETE FROM subjects WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Get subjects by department
router.get('/department/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const result = await db.query(
      'SELECT * FROM subjects WHERE department = $1 ORDER BY name',
      [department]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects by department' });
  }
});

module.exports = router;
