const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const pool = require('../config/database');

// Get all students with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { class_id, section_id, search } = req.query;
    
    let query = `
      SELECT st.*, c.name as class_name, s.name as section_name, u.name as created_by_name
      FROM students st
      LEFT JOIN classes c ON st.class_id = c.id
      LEFT JOIN sections s ON st.section_id = s.id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE st.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (class_id) {
      paramCount++;
      query += ` AND st.class_id = $${paramCount}`;
      params.push(class_id);
    }
    
    if (section_id) {
      paramCount++;
      query += ` AND st.section_id = $${paramCount}`;
      params.push(section_id);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (st.name ILIKE $${paramCount} OR st.student_id ILIKE $${paramCount} OR st.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY st.name`;
    
    const result = await pool.query(query, params);

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

// Get student by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT st.*, c.name as class_name, s.name as section_name, u.name as created_by_name
      FROM students st
      LEFT JOIN classes c ON st.class_id = c.id
      LEFT JOIN sections s ON st.section_id = s.id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE st.id = $1 AND st.is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
});

// Create new student
router.post('/', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const {
      student_id,
      name,
      email,
      phone,
      date_of_birth,
      gender,
      class_id,
      section_id,
      admission_date
    } = req.body;
    
    const created_by = req.user.id;

    const result = await pool.query(`
      INSERT INTO students (student_id, name, email, phone, date_of_birth, gender, class_id, section_id, admission_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [student_id, name, email, phone, date_of_birth, gender, class_id, section_id, admission_date, created_by]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Student created successfully'
    });
  } catch (error) {
    console.error('Error creating student:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ success: false, message: 'Student ID already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create student' });
    }
  }
});

// Update student
router.put('/:id', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      student_id,
      name,
      email,
      phone,
      date_of_birth,
      gender,
      class_id,
      section_id,
      admission_date,
      is_active
    } = req.body;

    const result = await pool.query(`
      UPDATE students 
      SET student_id = $1, name = $2, email = $3, phone = $4, date_of_birth = $5, 
          gender = $6, class_id = $7, section_id = $8, admission_date = $9, is_active = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [student_id, name, email, phone, date_of_birth, gender, class_id, section_id, admission_date, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Student updated successfully'
    });
  } catch (error) {
    console.error('Error updating student:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ success: false, message: 'Student ID already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update student' });
    }
  }
});

// Delete student (soft delete)
router.delete('/:id', authenticateToken, requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE students 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'Failed to delete student' });
  }
});

// Get student attendance summary
router.get('/:id/attendance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [id];
    
    if (start_date && end_date) {
      dateFilter = ` AND a.date BETWEEN $2 AND $3`;
      params.push(start_date, end_date);
    }
    
    const result = await pool.query(`
      SELECT 
        a.date,
        a.status,
        s.subject_name,
        c.name as class_name,
        sec.name as section_name,
        u.name as teacher_name
      FROM attendance a
      JOIN schedules s ON a.schedule_id = s.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN users u ON s.teacher_id = u.id
      WHERE a.student_id = $1${dateFilter}
      ORDER BY a.date DESC
    `, params);

    // Calculate attendance statistics
    const totalDays = result.rows.length;
    const presentDays = result.rows.filter(r => r.status === 'present').length;
    const absentDays = result.rows.filter(r => r.status === 'absent').length;
    const lateDays = result.rows.filter(r => r.status === 'late').length;
    const excusedDays = result.rows.filter(r => r.status === 'excused').length;
    
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({
      success: true,
      data: {
        attendance_records: result.rows,
        statistics: {
          total_days: totalDays,
          present_days: presentDays,
          absent_days: absentDays,
          late_days: lateDays,
          excused_days: excusedDays,
          attendance_percentage: attendancePercentage
        }
      }
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student attendance' });
  }
});

// Get student grades
router.get('/:id/grades', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_id, academic_year } = req.query;
    
    let query = `
      SELECT g.*, s.name as subject_name, c.name as class_name, u.name as teacher_name
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      JOIN classes c ON g.class_id = c.id
      JOIN users u ON g.submitted_by = u.id
      WHERE g.student_id = $1
    `;
    
    const params = [id];
    let paramCount = 1;
    
    if (subject_id) {
      paramCount++;
      query += ` AND g.subject_id = $${paramCount}`;
      params.push(subject_id);
    }
    
    if (academic_year) {
      paramCount++;
      query += ` AND g.academic_year = $${paramCount}`;
      params.push(academic_year);
    }
    
    query += ` ORDER BY g.submitted_at DESC`;
    
    const result = await pool.query(query, params);

    // Calculate grade statistics
    const totalAssignments = result.rows.length;
    const averageScore = totalAssignments > 0 
      ? Math.round((result.rows.reduce((sum, g) => sum + parseFloat(g.percentage), 0) / totalAssignments) * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        grades: result.rows,
        statistics: {
          total_assignments: totalAssignments,
          average_percentage: averageScore
        }
      }
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student grades' });
  }
});

module.exports = router;

