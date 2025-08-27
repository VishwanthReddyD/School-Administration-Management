const express = require('express');
const router = express.Router();
const { requireRole, authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

// Get audit logs (Super Admin and Principal only)
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, action, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (user_id) {
      paramCount++;
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(user_id);
    }
    
    if (action) {
      paramCount++;
      whereClause += ` AND action = $${paramCount}`;
      params.push(action);
    }
    
    if (start_date) {
      paramCount++;
      whereClause += ` AND timestamp >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      whereClause += ` AND timestamp <= $${paramCount}`;
      params.push(end_date);
    }
    
    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get logs with pagination
    paramCount++;
    const logsResult = await db.query(
      `SELECT 
        al.*,
        u.email as user_email,
        u.role as user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.timestamp DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );
    
    res.json({
      logs: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit log by ID (Super Admin and Principal only)
router.get('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        al.*,
        u.email as user_email,
        u.role as user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get user activity summary (Super Admin and Principal only)
router.get('/user/:user_id/summary', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { user_id } = req.params;
    const { start_date, end_date } = req.query;
    
    let whereClause = 'WHERE user_id = $1';
    const params = [user_id];
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND timestamp >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND timestamp <= $${params.length}`;
    }
    
    // Get action counts
    const actionStats = await db.query(
      `SELECT action, COUNT(*) as count 
       FROM audit_logs 
       ${whereClause}
       GROUP BY action
       ORDER BY count DESC`,
      params
    );
    
    // Get recent activity
    const recentActivity = await db.query(
      `SELECT * FROM audit_logs 
       ${whereClause}
       ORDER BY timestamp DESC 
       LIMIT 10`,
      params
    );
    
    // Get total count
    const totalResult = await db.query(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      params
    );
    
    res.json({
      user_id,
      total_actions: parseInt(totalResult.rows[0].count),
      action_breakdown: actionStats.rows,
      recent_activity: recentActivity.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user activity summary' });
  }
});

// Get system activity summary (Super Admin only)
router.get('/system/summary', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND timestamp >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND timestamp <= $${params.length}`;
    }
    
    // Get action counts
    const actionStats = await db.query(
      `SELECT action, COUNT(*) as count 
       FROM audit_logs 
       ${whereClause}
       GROUP BY action
       ORDER BY count DESC`,
      params
    );
    
    // Get user activity counts
    const userStats = await db.query(
      `SELECT 
         u.email,
         u.role,
         COUNT(al.id) as action_count
       FROM users u
       LEFT JOIN audit_logs al ON u.id = al.user_id ${whereClause.replace('WHERE 1=1', '')}
       GROUP BY u.id, u.email, u.role
       ORDER BY action_count DESC
       LIMIT 10`,
      params
    );
    
    // Get hourly activity
    const hourlyStats = await db.query(
      `SELECT 
         EXTRACT(HOUR FROM timestamp) as hour,
         COUNT(*) as count
       FROM audit_logs 
       ${whereClause}
       GROUP BY EXTRACT(HOUR FROM timestamp)
       ORDER BY hour`,
      params
    );
    
    res.json({
      action_breakdown: actionStats.rows,
      top_users: userStats.rows,
      hourly_activity: hourlyStats.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system activity summary' });
  }
});

// Export audit logs (Super Admin only)
router.get('/export/csv', authenticateToken, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND timestamp >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND timestamp <= $${params.length}`;
    }
    
    const result = await db.query(
      `SELECT 
         al.timestamp,
         u.email as user_email,
         u.role as user_role,
         al.action,
         al.details,
         al.ip_address
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.timestamp DESC`,
      params
    );
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    
    // Create CSV content
    const csvHeader = 'Timestamp,User Email,User Role,Action,Details,IP Address\n';
    const csvContent = result.rows.map(row => 
      `"${row.timestamp}","${row.user_email || 'N/A'}","${row.user_role || 'N/A'}","${row.action}","${row.details || ''}","${row.ip_address || 'N/A'}"`
    ).join('\n');
    
    res.send(csvHeader + csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

module.exports = router;
