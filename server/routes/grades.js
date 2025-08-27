const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const pool = require('../config/database');

// Get grades for current teacher (define BEFORE parameterized teacher route)
router.get('/teacher/me', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const result = await pool.query(`
      SELECT g.*, u.name as teacher_name
      FROM grades g
      JOIN users u ON g.submitted_by = u.id
      WHERE g.submitted_by = $1
      ORDER BY g.submitted_at DESC
    `, [teacherId]);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching current teacher grades:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher grades' });
  }
});

// Get grades for a specific subject
router.get('/subject/:subjectId', authenticateToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const result = await pool.query(`
      SELECT g.*, u.name as teacher_name
      FROM grades g
      JOIN users u ON g.submitted_by = u.id
      WHERE g.subject_id = $1
      ORDER BY g.submitted_at DESC
    `, [subjectId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch grades' });
  }
});

// Get grades for a specific student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await pool.query(`
      SELECT g.*, u.name as teacher_name
      FROM grades g
      JOIN users u ON g.submitted_by = u.id
      WHERE g.student_id = $1
      ORDER BY g.submitted_at DESC
    `, [studentId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student grades' });
  }
});

// Get grades submitted by a teacher
router.get('/teacher/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const result = await pool.query(`
      SELECT g.*, u.name as teacher_name
      FROM grades g
      JOIN users u ON g.submitted_by = u.id
      WHERE g.submitted_by = $1
      ORDER BY g.submitted_at DESC
    `, [teacherId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching teacher grades:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher grades' });
  }
});

// Get grades for current teacher
router.get('/teacher/me', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const result = await pool.query(`
      SELECT g.*, u.name as teacher_name
      FROM grades g
      JOIN users u ON g.submitted_by = u.id
      WHERE g.submitted_by = $1
      ORDER BY g.submitted_at DESC
    `, [teacherId]);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching current teacher grades:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher grades' });
  }
});

// Add a new grade
router.post('/', authenticateToken, requireRole(['TEACHER', 'PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const {
      student_id,
      subject_id,
      class_id,
      assignment_type,
      title,
      score,
      max_score,
      grade_letter,
      feedback,
      academic_year
    } = req.body;

    const submitted_by = req.user.id;

    const result = await pool.query(`
      INSERT INTO grades (student_id, subject_id, class_id, assignment_type, title, score, max_score, grade_letter, feedback, academic_year, submitted_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [student_id, subject_id, class_id, assignment_type, title, score, max_score, grade_letter, feedback, academic_year, submitted_by]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Grade added successfully'
    });
  } catch (error) {
    console.error('Error adding grade:', error);
    res.status(500).json({ success: false, message: 'Failed to add grade' });
  }
});

// Update a grade
router.put('/:gradeId', authenticateToken, requireRole(['TEACHER', 'PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { gradeId } = req.params;
    const {
      score,
      max_score,
      grade_letter,
      feedback
    } = req.body;

    const result = await pool.query(`
      UPDATE grades 
      SET score = $1, max_score = $2, grade_letter = $3, feedback = $4, updated_at = NOW()
      WHERE id = $5 AND submitted_by = $6
      RETURNING *
    `, [score, max_score, grade_letter, feedback, gradeId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grade not found or unauthorized' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Grade updated successfully'
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ success: false, message: 'Failed to update grade' });
  }
});

// Delete a grade
router.delete('/:gradeId', authenticateToken, requireRole(['TEACHER', 'PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { gradeId } = req.params;
    
    const result = await pool.query(`
      DELETE FROM grades 
      WHERE id = $1 AND submitted_by = $2
      RETURNING id
    `, [gradeId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grade not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Grade deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ success: false, message: 'Failed to delete grade' });
  }
});

// Get grade statistics for a teacher
router.get('/stats/teacher/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_grades,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(DISTINCT subject_id) as unique_subjects,
        AVG(percentage) as average_percentage,
        MIN(percentage) as min_percentage,
        MAX(percentage) as max_percentage
      FROM grades 
      WHERE submitted_by = $1
    `, [teacherId]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching grade statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch grade statistics' });
  }
});

// Grade statistics for current teacher
// Place 'me' stats route before parameterized route to avoid 'me' matching :teacherId
router.get('/stats/teacher/me', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_grades,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(DISTINCT subject_id) as unique_subjects,
        AVG(percentage) as average_percentage,
        MIN(percentage) as min_percentage,
        MAX(percentage) as max_percentage
      FROM grades 
      WHERE submitted_by = $1
    `, [teacherId]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching current teacher grade statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch grade statistics' });
  }
});

module.exports = router;
