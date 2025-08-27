const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const pool = require('../config/database');

// Get all sections with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { class_id, search } = req.query;
    
    let query = `
      SELECT s.*, c.name as class_name, u.name as created_by_name
      FROM sections s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (class_id) {
      paramCount++;
      query += ` AND s.class_id = $${paramCount}`;
      params.push(class_id);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (s.name ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY c.name, s.name`;
    
    const result = await pool.query(query, params);

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

// Get section by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT s.*, c.name as class_name, u.name as created_by_name
      FROM sections s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = $1 AND s.is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch section' });
  }
});

// Create new section
router.post('/', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { name, description, class_id } = req.body;
    const created_by = req.user.id;

    const result = await pool.query(`
      INSERT INTO sections (name, description, class_id, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, class_id, created_by]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Section created successfully'
    });
  } catch (error) {
    console.error('Error creating section:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ success: false, message: 'Section name already exists for this class' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create section' });
    }
  }
});

// Update section
router.put('/:id', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, class_id, is_active } = req.body;

    const result = await pool.query(`
      UPDATE sections 
      SET name = $1, description = $2, class_id = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, description, class_id, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Section updated successfully'
    });
  } catch (error) {
    console.error('Error updating section:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ success: false, message: 'Section name already exists for this class' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update section' });
    }
  }
});

// Delete section (soft delete)
router.delete('/:id', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE sections 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ success: false, message: 'Failed to delete section' });
  }
});

// Get students in a section
router.get('/:id/students', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT st.*, c.name as class_name, s.name as section_name
      FROM students st
      JOIN classes c ON st.class_id = c.id
      JOIN sections s ON st.section_id = s.id
      WHERE st.section_id = $1 AND st.is_active = true
      ORDER BY st.name
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching section students:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch section students' });
  }
});

// Get section statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get student count
    const studentResult = await pool.query(`
      SELECT COUNT(*) as student_count
      FROM students
      WHERE section_id = $1 AND is_active = true
    `, [id]);
    
    // Get teacher count
    const teacherResult = await pool.query(`
      SELECT COUNT(DISTINCT tsc.teacher_id) as teacher_count
      FROM teacher_subject_class tsc
      JOIN sections s ON tsc.section_id = s.id
      WHERE s.id = $1 AND tsc.is_active = true
    `, [id]);
    
    // Get subject count
    const subjectResult = await pool.query(`
      SELECT COUNT(DISTINCT tsc.subject_id) as subject_count
      FROM teacher_subject_class tsc
      JOIN sections s ON tsc.section_id = s.id
      WHERE s.id = $1 AND tsc.is_active = true
    `, [id]);
    
    // Get average attendance for the section
    const attendanceResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(*) as total_count
      FROM attendance a
      JOIN schedules s ON a.schedule_id = s.id
      JOIN sections sec ON s.section_id = sec.id
      WHERE sec.id = $1
    `, [id]);
    
    const studentCount = parseInt(studentResult.rows[0]?.student_count || 0);
    const teacherCount = parseInt(teacherResult.rows[0]?.teacher_count || 0);
    const subjectCount = parseInt(subjectResult.rows[0]?.subject_count || 0);
    
    const presentCount = parseInt(attendanceResult.rows[0]?.present_count || 0);
    const totalCount = parseInt(attendanceResult.rows[0]?.total_count || 0);
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    res.json({
      success: true,
      data: {
        student_count: studentCount,
        teacher_count: teacherCount,
        subject_count: subjectCount,
        attendance_percentage: attendancePercentage,
        present_count: presentCount,
        total_attendance_count: totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching section statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch section statistics' });
  }
});

module.exports = router;

