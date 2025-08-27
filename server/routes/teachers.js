const express = require('express');
const router = express.Router();
const { requireRole, authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Get all teachers (Principal and Super Admin only)
router.get('/', requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, is_active, NULL::text as department 
       FROM users WHERE role = 'TEACHER' ORDER BY name`
    );
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Get teacher by ID
router.get('/:id', requireRole(['PRINCIPAL', 'SUPER_ADMIN', 'TEACHER']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, name, email, is_active, NULL::text as department 
       FROM users WHERE id = $1 AND role = 'TEACHER'`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teacher' });
  }
});

// Create new teacher (Super Admin only)
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { name, email, department, specialization, max_hours_per_day } = req.body;
    
    // Validate required fields
    if (!name || !email || !department) {
      return res.status(400).json({ error: 'Name, email, and department are required' });
    }
    
    // Check if email already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('password123', saltRounds);
    
    // Create user first
    const userResult = await db.query(
      'INSERT INTO users (email, password_hash, role, name, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashedPassword, 'TEACHER', name, true]
    );
    
    const userId = userResult.rows[0].id;
    
    // Teacher data is stored directly in users table
    res.status(201).json({
      id: userId,
      email,
      role: 'TEACHER',
      name,
      department,
      specialization,
      max_hours_per_day: max_hours_per_day || 6
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// Update teacher (Super Admin only)
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, specialization, max_hours_per_day } = req.body;
    
    const result = await db.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role, name, is_active',
      [name, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// Delete teacher (Super Admin only)
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if teacher has schedules
    const schedulesResult = await db.query('SELECT id FROM schedules WHERE teacher_id = $1 LIMIT 1', [id]);
    if (schedulesResult.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete teacher with existing schedules' });
    }
    
    // Delete user directly (teacher data is in users table)
    const result = await db.query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id', [id, 'TEACHER']);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

// Get teacher workload
router.get('/:id/workload', requireRole(['PRINCIPAL', 'SUPER_ADMIN', 'TEACHER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        DATE(s.start_time) as date,
        COUNT(*) as total_classes,
        SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600) as total_hours
      FROM schedules s 
      WHERE s.teacher_id = $1
    `;
    
    const params = [id];
    
    if (start_date && end_date) {
      query += ' AND DATE(s.start_time) BETWEEN $2 AND $3';
      params.push(start_date, end_date);
    }
    
    query += ' GROUP BY DATE(s.start_time) ORDER BY date';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teacher workload' });
  }
});

module.exports = router;
