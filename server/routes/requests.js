const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { requireRole, auditLog } = require('../middleware/auth');

const router = express.Router();

// Debug endpoint to check database structure (remove in production)
router.get('/debug/table-structure', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'teacher_requests' 
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      table: 'teacher_requests',
      columns: result.rows
    });
  } catch (error) {
    console.error('Error checking table structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check table structure',
      error: error.message
    });
  }
});

// Debug endpoint to check actual data (remove in production)
router.get('/debug/requests-data', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        tr.*,
        u.name as processed_by_name,
        u.email as processed_by_email
      FROM teacher_requests tr
      LEFT JOIN users u ON tr.processed_by = u.id
      ORDER BY tr.requested_at DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error checking requests data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check requests data',
      error: error.message
    });
  }
});

// Get all teacher requests (Principal and Super Admin only)
router.get('/', requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { status, type, priority, teacher_id } = req.query;
    
    let query = `
      SELECT 
        tr.id,
        tr.request_type,
        tr.title,
        tr.description,
        tr.start_date,
        tr.end_date,
        tr.status,
        tr.priority,
        tr.requested_at,
        tr.processed_at,
        tr.notes,
        u.name as teacher_name,
        u.email as teacher_email,
        u2.email as processed_by_email
      FROM teacher_requests tr
      JOIN users u ON tr.teacher_id = u.id
      LEFT JOIN users u2 ON tr.processed_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status && status !== 'all') {
      paramCount++;
      query += ` AND tr.status = $${paramCount}`;
      params.push(status);
    }
    
    if (type && type !== 'all') {
      paramCount++;
      query += ` AND tr.request_type = $${paramCount}`;
      params.push(type);
    }
    
    if (priority && priority !== 'all') {
      paramCount++;
      query += ` AND tr.priority = $${paramCount}`;
      params.push(priority);
    }
    
    if (teacher_id) {
      paramCount++;
      query += ` AND tr.teacher_id = $${paramCount}`;
      params.push(teacher_id);
    }
    
    query += ` ORDER BY tr.requested_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching teacher requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher requests',
      error: error.message
    });
  }
});

// Get a specific request by ID (for teachers to see their own request details)
router.get('/my-requests/:id', requireRole(['TEACHER']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    
    const query = `
      SELECT 
        tr.id,
        tr.request_type,
        tr.title,
        tr.description,
        tr.start_date,
        tr.end_date,
        tr.status,
        tr.priority,
        tr.requested_at,
        tr.processed_at,
        tr.notes,
        u.name as processed_by_name,
        u.email as processed_by_email
      FROM teacher_requests tr
      LEFT JOIN users u ON tr.processed_by = u.id
      WHERE tr.id = $1 AND tr.teacher_id = $2
    `;
    
    const result = await pool.query(query, [id, teacherId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or access denied'
      });
      }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request details',
      error: error.message
    });
  }
});

// Get teacher requests by teacher ID (for teachers to see their own requests)
router.get('/my-requests', requireRole(['TEACHER']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const query = `
      SELECT 
        tr.id,
        tr.request_type,
        tr.title,
        tr.description,
        tr.start_date,
        tr.end_date,
        tr.status,
        tr.priority,
        tr.requested_at,
        tr.processed_at,
        tr.notes,
        u.name as processed_by_name,
        u.email as processed_by_email
      FROM teacher_requests tr
      LEFT JOIN users u ON tr.processed_by = u.id
      WHERE tr.teacher_id = $1
      ORDER BY tr.requested_at DESC
    `;
    
    const result = await pool.query(query, [teacherId]);
    
    console.log('Teacher requests fetched for teacher:', teacherId, 'Count:', result.rows.length);
    console.log('Sample request data:', result.rows[0] || 'No requests found');
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching teacher requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher requests',
      error: error.message
    });
  }
});

// Create new teacher request
router.post('/', requireRole(['TEACHER']), [
  body('request_type').isIn(['leave', 'schedule_change', 'room_change', 'other']).withMessage('Invalid request type'),
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').optional().isISO8601().withMessage('End date must be valid if provided'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { request_type, title, description, start_date, end_date, priority = 'medium' } = req.body;
    const teacherId = req.user.id;
    
    const query = `
      INSERT INTO teacher_requests (teacher_id, request_type, title, description, start_date, end_date, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      teacherId, request_type, title, description, start_date, end_date, priority
    ]);
    
    // Audit log
    await auditLog(req.user.id, 'CREATE', 'teacher_requests', result.rows[0].id, {
      request_type,
      title,
      priority
    });
    
    res.status(201).json({
      success: true,
      message: 'Request submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating teacher request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create teacher request',
      error: error.message
    });
  }
});

// Update request status (approve/reject) - Principal and Super Admin only
router.put('/:id/status', requireRole(['PRINCIPAL', 'SUPER_ADMIN']), [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const { status, notes } = req.body;
    const processedBy = req.user.id;
    
    // Check if request exists and is pending
    const checkQuery = 'SELECT status FROM teacher_requests WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been processed'
      });
    }
    
    const updateQuery = `
      UPDATE teacher_requests 
      SET status = $1, processed_at = CURRENT_TIMESTAMP, processed_by = $2, notes = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    console.log('Updating request status:', { id, status, processedBy, notes });
    
    const result = await pool.query(updateQuery, [status, processedBy, notes, id]);
    
    // Verify the update was successful
    if (result.rows.length === 0) {
      console.error('Failed to update request status - no rows affected');
      return res.status(500).json({
        success: false,
        message: 'Failed to update request status'
      });
    }
    
    console.log('Request status updated successfully:', result.rows[0]);
    
    // Audit log
    await auditLog(req.user.id, 'UPDATE', 'teacher_requests', id, {
      status,
      notes,
      action: 'status_change'
    });
    
    res.json({
      success: true,
      message: `Request ${status} successfully`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update request status',
      error: error.message
    });
  }
});

// Update request (teachers can update their own pending requests)
router.put('/:id', requireRole(['TEACHER']), [
  body('title').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Title must be less than 255 characters'),
  body('description').optional().trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('start_date').optional().isISO8601().withMessage('Start date must be valid'),
  body('end_date').optional().isISO8601().withMessage('End date must be valid if provided'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const teacherId = req.user.id;
    const updateFields = req.body;
    
    // Check if request exists and belongs to teacher
    const checkQuery = 'SELECT status FROM teacher_requests WHERE id = $1 AND teacher_id = $2';
    const checkResult = await pool.query(checkQuery, [id, teacherId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or access denied'
      });
    }
    
    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be updated'
      });
    }
    
    // Build dynamic update query
    const setClause = [];
    const values = [];
    let paramCount = 0;
    
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] !== undefined) {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        values.push(updateFields[key]);
      }
    });
    
    if (setClause.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    values.push(id, teacherId);
    
    const updateQuery = `
      UPDATE teacher_requests 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount + 1} AND teacher_id = $${paramCount + 2}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    // Audit log
    await auditLog(req.user.id, 'UPDATE', 'teacher_requests', id, {
      updated_fields: Object.keys(updateFields)
    });
    
    res.json({
      success: true,
      message: 'Request updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating teacher request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher request',
      error: error.message
    });
  }
});

// Delete request (teachers can delete their own pending requests)
router.delete('/:id', requireRole(['TEACHER']), async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    // Check if request exists and belongs to teacher
    const checkQuery = 'SELECT status FROM teacher_requests WHERE id = $1 AND teacher_id = $2';
    const checkResult = await pool.query(checkQuery, [id, teacherId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or access denied'
      });
    }
    
    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be deleted'
      });
    }
    
    const deleteQuery = 'DELETE FROM teacher_requests WHERE id = $1 AND teacher_id = $2 RETURNING *';
    const result = await pool.query(deleteQuery, [id, teacherId]);
    
    // Audit log
    await auditLog(req.user.id, 'DELETE', 'teacher_requests', id, {
      action: 'request_deleted'
    });
    
    res.json({
      success: true,
      message: 'Request deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting teacher request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete teacher request',
      error: error.message
    });
  }
});

// Get request statistics
router.get('/stats', requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
      FROM teacher_requests
    `;
    
    const result = await pool.query(statsQuery);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching request statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request statistics',
      error: error.message
    });
  }
});

module.exports = router;

