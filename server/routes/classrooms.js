const express = require('express');
const router = express.Router();
const { requireRole, authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

// Get all classrooms
router.get('/', requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, room_number as name, capacity, building, floor FROM classrooms ORDER BY room_number'
    );
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

// Get classroom by ID
router.get('/:id', requireRole(['PRINCIPAL', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id, room_number as name, capacity, building, floor FROM classrooms WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classroom' });
  }
});

// Create new classroom (Super Admin and Principal only)
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { name, capacity, building, floor, room_type, facilities } = req.body;
    
    // Validate required fields
    if (!name || !capacity) {
      return res.status(400).json({ error: 'Name and capacity are required' });
    }
    
    // Check if name already exists
    const existingClassroom = await db.query('SELECT id FROM classrooms WHERE name = $1', [name]);
    if (existingClassroom.rows.length > 0) {
      return res.status(400).json({ error: 'Classroom name already exists' });
    }
    
    const result = await db.query(
      'INSERT INTO classrooms (room_number, capacity, building, floor, has_projector, has_computer, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, capacity, building || null, floor || null, false, false, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create classroom' });
  }
});

// Update classroom (Super Admin and Principal only)
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity, building, floor, room_type, facilities } = req.body;
    
    // Check if name already exists for other classrooms
    if (name) {
      const existingClassroom = await db.query('SELECT id FROM classrooms WHERE name = $1 AND id != $2', [name, id]);
      if (existingClassroom.rows.length > 0) {
        return res.status(400).json({ error: 'Classroom name already exists' });
      }
    }
    
    const result = await db.query(
      'UPDATE classrooms SET room_number = $1, capacity = $2, building = $3, floor = $4, has_projector = $5, has_computer = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, capacity, building, floor, false, false, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update classroom' });
  }
});

// Delete classroom (Super Admin and Principal only)
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if classroom has schedules
    const schedulesResult = await db.query('SELECT id FROM schedules WHERE classroom_id = $1 LIMIT 1', [id]);
    if (schedulesResult.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete classroom with existing schedules' });
    }
    
    const result = await db.query('DELETE FROM classrooms WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    
    res.json({ message: 'Classroom deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete classroom' });
  }
});

// Get classrooms by building
router.get('/building/:building', async (req, res) => {
  try {
    const { building } = req.params;
    const result = await db.query(
      'SELECT * FROM classrooms WHERE building = $1 ORDER BY floor, name',
      [building]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classrooms by building' });
  }
});

// Get available classrooms for a time slot
router.get('/available/:date/:start_time/:end_time', async (req, res) => {
  try {
    const { date, start_time, end_time } = req.params;
    
    const result = await db.query(`
      SELECT c.* FROM classrooms c
      WHERE c.id NOT IN (
        SELECT DISTINCT s.classroom_id 
        FROM schedules s 
        WHERE DATE(s.start_time) = $1 
        AND (
          (s.start_time < $3 AND s.end_time > $2)
          OR (s.start_time >= $2 AND s.start_time < $3)
          OR (s.end_time > $2 AND s.end_time <= $3)
        )
      )
      ORDER BY c.name
    `, [date, start_time, end_time]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available classrooms' });
  }
});

// Get classroom utilization
router.get('/:id/utilization', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        DATE(s.start_time) as date,
        COUNT(*) as total_classes,
        SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600) as total_hours
      FROM schedules s 
      WHERE s.classroom_id = $1
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
    res.status(500).json({ error: 'Failed to fetch classroom utilization' });
  }
});

module.exports = router;
