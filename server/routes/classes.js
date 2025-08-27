const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const pool = require('../config/database');

// Get all classes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name as created_by_name,
             COUNT(DISTINCT s.id) as section_count,
             COUNT(DISTINCT st.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN sections s ON c.id = s.class_id
      LEFT JOIN students st ON c.id = st.class_id
      WHERE c.is_active = true
      GROUP BY c.id, u.name
      ORDER BY c.name
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT c.*, u.name as created_by_name
      FROM classes c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1 AND c.is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch class' });
  }
});

// Create new class
router.post('/', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { name, description, academic_year } = req.body;
    const created_by = req.user.id;

    const result = await pool.query(`
      INSERT INTO classes (name, description, academic_year, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, academic_year, created_by]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Class created successfully'
    });
  } catch (error) {
    console.error('Error creating class:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ success: false, message: 'Class name already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create class' });
    }
  }
});

// Update class
router.put('/:id', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, academic_year, is_active } = req.body;

    const result = await pool.query(`
      UPDATE classes 
      SET name = $1, description = $2, academic_year = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, description, academic_year, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Class updated successfully'
    });
  } catch (error) {
    console.error('Error updating class:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ success: false, message: 'Class name already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update class' });
    }
  }
});

// Delete class (soft delete)
router.delete('/:id', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if class has students or sections
    const checkResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM students WHERE class_id = $1) as student_count,
        (SELECT COUNT(*) FROM sections WHERE class_id = $1) as section_count
    `, [id]);

    if (checkResult.rows[0].student_count > 0 || checkResult.rows[0].section_count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete class with existing students or sections' 
      });
    }

    const result = await pool.query(`
      UPDATE classes 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ success: false, message: 'Failed to delete class' });
  }
});

// Get sections for a class
router.get('/:id/sections', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT s.*, u.name as created_by_name,
             COUNT(st.id) as student_count
      FROM sections s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN students st ON s.id = st.section_id
      WHERE s.class_id = $1 AND s.is_active = true
      GROUP BY s.id, u.name
      ORDER BY s.name
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sections' });
  }
});

// Get students for a class
router.get('/:id/students', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT st.*, s.name as section_name
      FROM students st
      LEFT JOIN sections s ON st.section_id = s.id
      WHERE st.class_id = $1 AND st.is_active = true
      ORDER BY st.name
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

// Get class statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.name as class_name,
        COUNT(DISTINCT s.id) as section_count,
        COUNT(DISTINCT st.id) as student_count,
        COUNT(DISTINCT tsc.teacher_id) as teacher_count,
        COUNT(DISTINCT tsc.subject_id) as subject_count
      FROM classes c
      LEFT JOIN sections s ON c.id = s.class_id AND s.is_active = true
      LEFT JOIN students st ON c.id = st.class_id AND st.is_active = true
      LEFT JOIN teacher_subject_class tsc ON c.id = tsc.class_id AND tsc.is_active = true
      WHERE c.id = $1 AND c.is_active = true
      GROUP BY c.id, c.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching class statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch class statistics' });
  }
});

module.exports = router;

