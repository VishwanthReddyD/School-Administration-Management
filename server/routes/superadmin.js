const express = require('express');
const router = express.Router();
const { requireSuperAdmin } = require('../middleware/auth');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Get all users (Super Admin only)
router.get('/users', requireSuperAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, role, name, is_active, last_login, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (Super Admin only)
router.get('/users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id, email, role, name, is_active, last_login, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (Super Admin only)
router.post('/users', requireSuperAdmin, async (req, res) => {
  try {
    const { email, role, password, name } = req.body;
    
    // Validate required fields
    if (!email || !role || !password || !name) {
      return res.status(400).json({ error: 'Name, email, role, and password are required' });
    }
    
    // Validate role
    const normalizedRole = (role || '').toUpperCase();
    if (!['SUPER_ADMIN', 'PRINCIPAL', 'TEACHER'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be SUPER_ADMIN, PRINCIPAL, or TEACHER' });
    }
    
    // Check if email already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password_hash, role, name, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, name, is_active, created_at',
      [email, hashedPassword, normalizedRole, name, true]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (Super Admin only)
router.put('/users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, is_active, password, name } = req.body;
    
    // Validate role if provided
    if (role && !['SUPER_ADMIN', 'PRINCIPAL', 'TEACHER'].includes((role || '').toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role. Must be SUPER_ADMIN, PRINCIPAL, or TEACHER' });
    }
    
    // Check if email already exists for other users
    if (email) {
      const existingUser = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    let query = 'UPDATE users SET';
    const params = [];
    let paramCount = 0;
    
    if (email) {
      paramCount++;
      query += ` email = $${paramCount}`;
      params.push(email);
    }
    
    if (role) {
      paramCount++;
      query += paramCount === 1 ? ` role = $${paramCount}` : `, role = $${paramCount}`;
      params.push((role || '').toUpperCase());
    }
    
    if (typeof is_active === 'boolean') {
      paramCount++;
      query += paramCount === 1 ? ` is_active = $${paramCount}` : `, is_active = $${paramCount}`;
      params.push(is_active);
    }
    
    if (name) {
      paramCount++;
      query += paramCount === 1 ? ` name = $${paramCount}` : `, name = $${paramCount}`;
      params.push(name);
    }
    
    if (password) {
      paramCount++;
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      query += paramCount === 1 ? ` password_hash = $${paramCount}` : `, password_hash = $${paramCount}`;
      params.push(hashedPassword);
    }
    
    query += `, updated_at = NOW() WHERE id = $${paramCount + 1} RETURNING id, email, role, name, is_active, created_at, updated_at`;
    params.push(id);
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (Super Admin only)
router.delete('/users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Toggle user status (Super Admin only)
router.patch('/users/:id/toggle-status', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deactivation
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }
    
    const result = await db.query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, email, role, name, is_active',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// Get system statistics (Super Admin only)
router.get('/stats', requireSuperAdmin, async (req, res) => {
  try {
    const stats = {};
    
    // User counts by role
    const userStats = await db.query('SELECT role, COUNT(*)::int as count FROM users GROUP BY role');
    stats.users = userStats.rows;

    // Totals
    const totals = await db.query(
      `SELECT 
         (SELECT COUNT(*)::int FROM users) as users,
         (SELECT COUNT(*)::int FROM users WHERE role = 'TEACHER') as teachers,
         (SELECT COUNT(*)::int FROM subjects) as subjects,
         (SELECT COUNT(*)::int FROM classrooms) as classrooms,
         (SELECT COUNT(*)::int FROM schedules) as schedules`
    );
    stats.totals = totals.rows[0];
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

module.exports = router;
