const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { 
  requirePrincipal, 
  teacherDataIsolation,
  auditLog 
} = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateSchedule = [
  body('teacher_id').isUUID().withMessage('Valid teacher ID is required'),
  body('subject_id').isUUID().withMessage('Valid subject ID is required'),
  body('classroom_id').isUUID().withMessage('Valid classroom ID is required'),
  body('class_id').isUUID().withMessage('Valid class ID is required'),
  body('section_id').optional().isUUID().withMessage('Valid section ID is required'),
  body('academic_year').notEmpty().withMessage('Academic year is required'),
  body('day_of_week')
    .isInt({ min: 1, max: 7 })
    .withMessage('Day of week must be between 1 (Monday) and 7 (Sunday)'),
  body('start_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM:SS format'),
  body('end_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM:SS format'),
  
];

// Check for scheduling conflicts
const checkConflicts = async (teacherId, classroomId, dayOfWeek, startTime, endTime, excludeId = null) => {
  const conflicts = [];
  
  // Check teacher conflicts
  const teacherQuery = `
    SELECT id, subject_id, classroom_id, start_time, end_time
    FROM schedules 
    WHERE teacher_id = $1 
      AND day_of_week = $2 
      AND (
        (start_time < $4 AND end_time > $3) OR
        (start_time >= $3 AND start_time < $4) OR
        (end_time > $3 AND end_time <= $4)
      )
      ${excludeId ? 'AND id != $5' : ''}
  `;
  
  const teacherParams = excludeId 
    ? [teacherId, dayOfWeek, startTime, endTime, excludeId]
    : [teacherId, dayOfWeek, startTime, endTime];
    
  const teacherResult = await pool.query(teacherQuery, teacherParams);
  
  if (teacherResult.rows.length > 0) {
    conflicts.push({
      type: 'TEACHER_CONFLICT',
      message: 'Teacher is already scheduled during this time',
      conflicts: teacherResult.rows
    });
  }
  
  // Check classroom conflicts
  const classroomQuery = `
    SELECT id, teacher_id, subject_id, start_time, end_time
    FROM schedules 
    WHERE classroom_id = $1 
      AND day_of_week = $2 
      AND (
        (start_time < $4 AND end_time > $3) OR
        (start_time >= $3 AND start_time < $4) OR
        (end_time > $3 AND end_time <= $4)
      )
      ${excludeId ? 'AND id != $5' : ''}
  `;
  
  const classroomParams = excludeId 
    ? [classroomId, dayOfWeek, startTime, endTime, excludeId]
    : [classroomId, dayOfWeek, startTime, endTime];
    
  const classroomResult = await pool.query(classroomQuery, classroomParams);
  
  if (classroomResult.rows.length > 0) {
    conflicts.push({
      type: 'CLASSROOM_CONFLICT',
      message: 'Classroom is already booked during this time',
      conflicts: classroomResult.rows
    });
  }
  
  return conflicts;
};

// Assign a new schedule (Principal only)
router.post('/assign',
  requirePrincipal,
  validateSchedule,
  auditLog('CREATE_SCHEDULE', 'SCHEDULE'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        teacher_id,
        subject_id,
        classroom_id,
        day_of_week,
        start_time,
        end_time,
        is_recurring = true,
        start_date,
        end_date
      } = req.body;

      // Validate time logic
      if (start_time >= end_time) {
        return res.status(400).json({
          error: 'Start time must be before end time',
          code: 'INVALID_TIME_RANGE'
        });
      }

      // Check for conflicts
      const conflicts = await checkConflicts(teacher_id, classroom_id, day_of_week, start_time, end_time);
      
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: 'Scheduling conflicts detected',
          code: 'SCHEDULE_CONFLICT',
          conflicts
        });
      }

      // Verify entities exist
      const [teacherResult, subjectResult, classroomResult, classResult, sectionResult] = await Promise.all([
        pool.query('SELECT id, name FROM users WHERE id = $1 AND role = $2', [teacher_id, 'TEACHER']),
        pool.query('SELECT id, name FROM subjects WHERE id = $1', [subject_id]),
        pool.query('SELECT id, room_number FROM classrooms WHERE id = $1', [classroom_id]),
        pool.query('SELECT id, name FROM classes WHERE id = $1', [req.body.class_id]),
        req.body.section_id ? pool.query('SELECT id, name FROM sections WHERE id = $1', [req.body.section_id]) : Promise.resolve({ rows: [] })
      ]);

      if (teacherResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Teacher not found',
          code: 'TEACHER_NOT_FOUND'
        });
      }

      if (subjectResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Subject not found',
          code: 'SUBJECT_NOT_FOUND'
        });
      }

      if (classroomResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Classroom not found',
          code: 'CLASSROOM_NOT_FOUND'
        });
      }

      if (classResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Class not found',
          code: 'CLASS_NOT_FOUND'
        });
      }

      if (req.body.section_id && sectionResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Section not found',
          code: 'SECTION_NOT_FOUND'
        });
      }

      // Create schedule
      const result = await pool.query(`
        INSERT INTO schedules (
          teacher_id, subject_id, classroom_id, class_id, section_id, academic_year, day_of_week, 
          start_time, end_time, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, teacher_id, subject_id, classroom_id, class_id, section_id, academic_year, day_of_week, start_time, end_time, created_at
      `, [
        teacher_id, subject_id, classroom_id, req.body.class_id, req.body.section_id, req.body.academic_year, day_of_week,
        start_time, end_time, req.user.id
      ]);

      const schedule = result.rows[0];

      // Get full schedule details for response
      const fullScheduleResult = await pool.query(`
        SELECT 
          s.id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          
          s.class_id,
          s.section_id,
          s.academic_year,
          t.name as teacher_name,
          sub.name as subject_name,
          sub.code as subject_code,
          sub.color as subject_color,
          c.room_number,
          c.building,
          c.floor,
          cl.name as class_name,
          sec.name as section_name
        FROM schedules s
        JOIN users t ON s.teacher_id = t.id
        JOIN subjects sub ON s.subject_id = sub.id
        JOIN classrooms c ON s.classroom_id = c.id
        JOIN classes cl ON s.class_id = cl.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        WHERE s.id = $1
      `, [schedule.id]);

      res.status(201).json({
        message: 'Schedule assigned successfully',
        schedule: fullScheduleResult.rows[0]
      });

    } catch (error) {
      console.error('Schedule assignment error:', error);
      res.status(500).json({
        error: 'Failed to assign schedule',
        code: 'SCHEDULE_ASSIGNMENT_ERROR'
      });
    }
  }
);

// Get teacher's own timetable
router.get('/my',
  teacherDataIsolation,
  async (req, res) => {
    try {
      const teacherId = req.user.id;
      const today = new Date();
      const currentDay = today.getDay() === 0 ? 7 : today.getDay(); // Convert to 1-7 (Monday-Sunday)
      const currentTime = today.toTimeString().slice(0, 8);

      // Get today's schedule and upcoming classes
      const result = await pool.query(`
        SELECT 
          s.id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          s.class_id,
          cl.name as class_name,
          s.section_id,
          COALESCE(sec.name, '') as section_name,
          s.academic_year,
          sub.name as subject_name,
          sub.code as subject_code,
          sub.color as subject_color,
          c.room_number,
          c.building,
          c.floor,
          CASE 
            WHEN s.day_of_week = $2 AND s.start_time <= $3 AND s.end_time > $3 THEN 'current'
            WHEN s.day_of_week = $2 AND s.start_time > $3 THEN 'upcoming'
            WHEN s.day_of_week > $2 OR (s.day_of_week = $2 AND s.start_time > $3) THEN 'upcoming'
            ELSE 'past'
          END as status
        FROM schedules s
        JOIN subjects sub ON s.subject_id = sub.id
        JOIN classrooms c ON s.classroom_id = c.id
        JOIN classes cl ON s.class_id = cl.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        WHERE s.teacher_id = $1
        ORDER BY s.day_of_week, s.start_time
      `, [teacherId, currentDay, currentTime]);

      // Group by status
      const currentClass = result.rows.find(s => s.status === 'current');
      const upcomingClasses = result.rows.filter(s => s.status === 'upcoming');

      res.json({
        current_class: currentClass,
        upcoming_classes: upcomingClasses.slice(0, 5), // Show next 5 classes
        full_schedule: result.rows
      });

    } catch (error) {
      console.error('Get my timetable error:', error);
      res.status(500).json({
        error: 'Failed to fetch timetable',
        code: 'TIMETABLE_FETCH_ERROR'
      });
    }
  }
);

// Get specific teacher's timetable (Principal only)
router.get('/teacher/:id',
  requirePrincipal,
  async (req, res) => {
    try {
      const teacherId = req.params.id;

      // Verify teacher exists
      const teacherResult = await pool.query(
        'SELECT id, name FROM users WHERE id = $1 AND role = $2',
        [teacherId, 'TEACHER']
      );

      if (teacherResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Teacher not found',
          code: 'TEACHER_NOT_FOUND'
        });
      }

      // Get teacher's schedule
      const scheduleResult = await pool.query(`
        SELECT 
          s.id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          
          s.class_id,
          s.section_id,
          s.academic_year,
          sub.name as subject_name,
          sub.code as subject_code,
          sub.color as subject_color,
          c.room_number,
          c.building,
          c.floor,
          cl.name as class_name,
          sec.name as section_name
        FROM schedules s
        JOIN subjects sub ON s.subject_id = sub.id
        JOIN classrooms c ON s.classroom_id = c.id
        JOIN classes cl ON s.class_id = cl.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        WHERE s.teacher_id = $1
        ORDER BY s.day_of_week, s.start_time
      `, [teacherId]);

      res.json({
        teacher: teacherResult.rows[0],
        schedule: scheduleResult.rows
      });

    } catch (error) {
      console.error('Get teacher timetable error:', error);
      res.status(500).json({
        error: 'Failed to fetch teacher timetable',
        code: 'TEACHER_TIMETABLE_ERROR'
      });
    }
  }
);

// Get all schedules (Principal only)
router.get('/all',
  requirePrincipal,
  async (req, res) => {
    try {
      const { day, teacher_id, classroom_id, subject_id } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (day !== undefined) {
        paramCount++;
        whereClause += ` AND s.day_of_week = $${paramCount}`;
        params.push(parseInt(day));
      }

      if (teacher_id) {
        paramCount++;
        whereClause += ` AND s.teacher_id = $${paramCount}`;
        params.push(teacher_id);
      }

      if (classroom_id) {
        paramCount++;
        whereClause += ` AND s.classroom_id = $${paramCount}`;
        params.push(classroom_id);
      }

      if (subject_id) {
        paramCount++;
        whereClause += ` AND s.subject_id = $${paramCount}`;
        params.push(subject_id);
      }

      const result = await pool.query(`
        SELECT 
          s.id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          s.class_id,
          s.section_id,
          s.academic_year,
          t.id as teacher_id,
          t.name as teacher_name,
          sub.id as subject_id,
          sub.name as subject_name,
          sub.code as subject_code,
          sub.color as subject_color,
          c.id as classroom_id,
          c.room_number,
          c.building,
          c.floor,
          cl.name as class_name,
          sec.name as section_name
        FROM schedules s
        JOIN users t ON s.teacher_id = t.id
        JOIN subjects sub ON s.subject_id = sub.id
        JOIN classrooms c ON s.classroom_id = c.id
        JOIN classes cl ON s.class_id = cl.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        ${whereClause}
        ORDER BY s.day_of_week, s.start_time
      `, params);

      res.json({
        schedules: result.rows,
        count: result.rows.length
      });

    } catch (error) {
      console.error('Get all schedules error:', error);
      res.status(500).json({
        error: 'Failed to fetch schedules',
        code: 'SCHEDULES_FETCH_ERROR'
      });
    }
  }
);

// Compute schedule conflicts (Principal only)
router.get('/conflicts',
  requirePrincipal,
  async (req, res) => {
    try {
      // Load minimal fields needed for conflict checks
      const result = await pool.query(`
        SELECT id, teacher_id, classroom_id, day_of_week, start_time, end_time
        FROM schedules
        ORDER BY day_of_week, start_time
      `);

      const rows = result.rows;
      const conflicts = [];

      const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const a = rows[i];
          const b = rows[j];
          if (a.day_of_week !== b.day_of_week) continue;
          if (!overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) continue;

          if (a.teacher_id === b.teacher_id) {
            conflicts.push({
              type: 'TEACHER_CONFLICT',
              schedule_a: a.id,
              schedule_b: b.id,
              day_of_week: a.day_of_week,
              start_time: a.start_time,
              end_time: a.end_time
            });
          }
          if (a.classroom_id === b.classroom_id) {
            conflicts.push({
              type: 'CLASSROOM_CONFLICT',
              schedule_a: a.id,
              schedule_b: b.id,
              day_of_week: a.day_of_week,
              start_time: a.start_time,
              end_time: a.end_time
            });
          }
        }
      }

      res.json({ conflicts, count: conflicts.length });
    } catch (error) {
      console.error('Get conflicts error:', error);
      res.status(500).json({
        error: 'Failed to compute schedule conflicts',
        code: 'SCHEDULE_CONFLICTS_ERROR'
      });
    }
  }
);

// Update schedule (Principal only)
router.put('/:id',
  requirePrincipal,
  validateSchedule,
  auditLog('UPDATE_SCHEDULE', 'SCHEDULE'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const scheduleId = req.params.id;
      const {
        teacher_id,
        subject_id,
        classroom_id,
        class_id,
        section_id,
        academic_year,
        day_of_week,
        start_time,
        end_time,
        is_recurring,
        start_date,
        end_date
      } = req.body;

      // Check if schedule exists
      const existingResult = await pool.query(
        'SELECT id FROM schedules WHERE id = $1',
        [scheduleId]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Schedule not found',
          code: 'SCHEDULE_NOT_FOUND'
        });
      }

      // Check for conflicts (excluding current schedule)
      const conflicts = await checkConflicts(teacher_id, classroom_id, day_of_week, start_time, end_time, scheduleId);
      
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: 'Scheduling conflicts detected',
          code: 'SCHEDULE_CONFLICT',
          conflicts
        });
      }

      // Update schedule
      const result = await pool.query(`
        UPDATE schedules 
        SET 
          teacher_id = $1,
          subject_id = $2,
          classroom_id = $3,
          class_id = $4,
          section_id = $5,
          academic_year = $6,
          day_of_week = $7,
          start_time = $8,
          end_time = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING id, teacher_id, subject_id, classroom_id, class_id, section_id, academic_year, day_of_week, start_time, end_time, updated_at
      `, [
        teacher_id, subject_id, classroom_id, class_id, section_id, academic_year, day_of_week,
        start_time, end_time, scheduleId
      ]);

      res.json({
        message: 'Schedule updated successfully',
        schedule: result.rows[0]
      });

    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(500).json({
        error: 'Failed to update schedule',
        code: 'SCHEDULE_UPDATE_ERROR'
      });
    }
  }
);

// Delete schedule (Principal only)
router.delete('/:id',
  requirePrincipal,
  auditLog('DELETE_SCHEDULE', 'SCHEDULE'),
  async (req, res) => {
    try {
      const scheduleId = req.params.id;

      // Check if schedule exists
      const existingResult = await pool.query(
        'SELECT id FROM schedules WHERE id = $1',
        [scheduleId]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Schedule not found',
          code: 'SCHEDULE_NOT_FOUND'
        });
      }

      // Delete schedule
      await pool.query('DELETE FROM schedules WHERE id = $1', [scheduleId]);

      res.json({
        message: 'Schedule deleted successfully'
      });

    } catch (error) {
      console.error('Delete schedule error:', error);
      res.status(500).json({
        error: 'Failed to delete schedule',
        code: 'SCHEDULE_DELETE_ERROR'
      });
    }
  }
);

// Get weekly schedule view
router.get('/weekly',
  async (req, res) => {
    try {
      const { week_start } = req.query;
      const teacherId = req.user.role === 'TEACHER' ? req.user.id : req.query.teacher_id;

      if (!teacherId) {
        return res.status(400).json({
          error: 'Teacher ID is required',
          code: 'TEACHER_ID_REQUIRED'
        });
      }

      // Calculate week start (Monday = 1)
      let weekStart = new Date();
      if (week_start) {
        weekStart = new Date(week_start);
      }
      
      // Adjust to Monday
      const dayOfWeek = weekStart.getDay();
      const monday = new Date(weekStart);
      monday.setDate(weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : dayOfWeek - 1));

      const result = await pool.query(`
        SELECT 
          s.id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          s.class_id,
          s.section_id,
          s.academic_year,
          sub.name as subject_name,
          sub.code as subject_code,
          sub.color as subject_color,
          c.room_number,
          c.building,
          cl.name as class_name,
          sec.name as section_name
        FROM schedules s
        JOIN subjects sub ON s.subject_id = sub.id
        JOIN classrooms c ON s.classroom_id = c.id
        JOIN classes cl ON s.class_id = cl.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        WHERE s.teacher_id = $1
        ORDER BY s.day_of_week, s.start_time
      `, [teacherId]);

      // Group by day
      const weeklySchedule = {};
      for (let i = 1; i <= 7; i++) { // Monday to Sunday (1-7)
        weeklySchedule[i] = result.rows.filter(s => s.day_of_week === i);
      }

      res.json({
        week_start: monday.toISOString().split('T')[0],
        schedule: weeklySchedule
      });

    } catch (error) {
      console.error('Get weekly schedule error:', error);
      res.status(500).json({
        error: 'Failed to fetch weekly schedule',
        code: 'WEEKLY_SCHEDULE_ERROR'
      });
    }
  }
);

const { exec } = require('child_process');

router.post('/seed', (req, res) => {
  exec('npm run db:seed --prefix server', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ error: 'Failed to seed database' });
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    res.json({ message: 'Database seeded successfully' });
  });
});

module.exports = router;
