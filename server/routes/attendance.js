const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Get attendance for a specific schedule/class with full class details
router.get('/schedule/:scheduleId', authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const result = await query(`
      SELECT 
        a.id,
        a.student_id,
        st.name as student_name,
        a.status,
        a.marked_at,
        a.notes,
        sub.name as subject_name,
        sub.code as subject_code,
        s.start_time,
        s.end_time,
        s.day_of_week,
        s.class_id,
        cl.name as class_name,
        s.section_id,
        sec.name as section_name,
        cr.room_number,
        cr.building,
        cr.floor,
        s.academic_year
      FROM attendance a
      JOIN schedules s ON a.schedule_id = s.id
      JOIN students st ON a.student_id = st.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN classes cl ON s.class_id = cl.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN classrooms cr ON s.classroom_id = cr.id
      WHERE a.schedule_id = $1
      ORDER BY st.name
    `, [scheduleId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data'
    });
  }
});

// Get all attendance records for a teacher with full class details
router.get('/teacher/me', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { class_id, section_id, date } = req.query;
    
    let where = 'WHERE s.teacher_id = $1';
    const params = [teacherId];
    
    if (class_id) { 
      params.push(class_id); 
      where += ` AND s.class_id = $${params.length}`; 
    }
    if (section_id) { 
      params.push(section_id); 
      where += ` AND s.section_id = $${params.length}`; 
    }
    if (date) { 
      params.push(date); 
      where += ` AND a.date = $${params.length}`; 
    }

    const result = await query(`
      SELECT 
        a.id,
        a.schedule_id,
        a.student_id,
        st.name as student_name,
        a.date,
        a.status,
        a.marked_at,
        a.notes,
        sub.name as subject_name,
        sub.code as subject_code,
        s.start_time,
        s.end_time,
        s.day_of_week,
        s.class_id,
        cl.name as class_name,
        s.section_id,
        sec.name as section_name,
        cr.room_number,
        cr.building,
        cr.floor,
        s.academic_year
      FROM attendance a
      JOIN schedules s ON a.schedule_id = s.id
      JOIN students st ON a.student_id = st.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN classes cl ON s.class_id = cl.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN classrooms cr ON s.classroom_id = cr.id
      ${where}
      ORDER BY a.date DESC, s.start_time, st.name
    `, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching teacher attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data'
    });
  }
});

// Get attendance summary for a teacher with class details
router.get('/teacher/summary', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const result = await query(`
      SELECT 
        s.id as schedule_id,
        sub.name as subject_name,
        sub.code as subject_code,
        s.day_of_week,
        s.start_time,
        s.end_time,
        s.class_id,
        cl.name as class_name,
        s.section_id,
        COALESCE(sec.name, '') as section_name,
        cr.room_number,
        cr.building,
        cr.floor,
        COUNT(a.id) as total_students,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count
      FROM schedules s
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN classes cl ON s.class_id = cl.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN classrooms cr ON s.classroom_id = cr.id
      LEFT JOIN attendance a ON s.id = a.schedule_id
      WHERE s.teacher_id = $1
      GROUP BY s.id, sub.name, sub.code, s.day_of_week, s.start_time, s.end_time, 
               s.class_id, cl.name, s.section_id, sec.name, cr.room_number, cr.building, cr.floor
      ORDER BY s.day_of_week, s.start_time
    `, [teacherId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance summary'
    });
  }
});

// Mark attendance for a student with date support
router.post('/mark', authenticateToken, async (req, res) => {
  try {
    const { schedule_id, student_id, student_name, status, notes, date } = req.body;
    const marked_by = req.user.id;

    // Check if attendance already exists for this student, schedule, and date
    const existing = await query(`
      SELECT id FROM attendance 
      WHERE schedule_id = $1 AND student_id = $2 AND date = $3
    `, [schedule_id, student_id, date || new Date().toISOString().split('T')[0]]);

    if (existing.rows.length > 0) {
      // Update existing attendance
      await query(`
        UPDATE attendance 
        SET status = $1, notes = $2, marked_at = NOW(), updated_at = NOW()
        WHERE schedule_id = $3 AND student_id = $4 AND date = $5
      `, [status, notes, schedule_id, student_id, date || new Date().toISOString().split('T')[0]]);
    } else {
      // Create new attendance record
      await query(`
        INSERT INTO attendance (schedule_id, student_id, status, marked_by, notes, date)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [schedule_id, student_id, status, marked_by, notes, date || new Date().toISOString().split('T')[0]]);
    }

    res.json({
      success: true,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance'
    });
  }
});

// Get attendance statistics for a teacher
router.get('/teacher/stats', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { class_id, section_id } = req.query;
    
    let where = 'WHERE s.teacher_id = $1';
    const params = [teacherId];
    if (class_id) { params.push(class_id); where += ` AND s.class_id = $${params.length}`; }
    if (section_id) { params.push(section_id); where += ` AND s.section_id = $${params.length}`; }

    const result = await query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_classes,
        COUNT(DISTINCT a.schedule_id) as classes_with_attendance,
        COUNT(a.id) as total_attendance_records,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count
      FROM schedules s
      LEFT JOIN attendance a ON s.id = a.schedule_id
      ${where}
    `, params);

    const stats = result.rows[0];
    
    // Calculate percentages
    const totalRecords = parseInt(stats.total_attendance_records) || 0;
    const presentCount = parseInt(stats.present_count) || 0;
    
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    res.json({
      success: true,
      data: {
        ...stats,
        attendance_rate: attendanceRate
      }
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance statistics'
    });
  }
});

// Stats grouped by class/section for the current teacher
router.get('/teacher/stats/by-class', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const result = await query(`
      SELECT 
        s.class_id,
        cl.name as class_name,
        s.section_id,
        COALESCE(sec.name, '') as section_name,
        COUNT(DISTINCT s.id) as total_classes,
        COUNT(DISTINCT a.schedule_id) as classes_with_attendance,
        COUNT(a.id) as total_attendance_records,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count
      FROM schedules s
      JOIN classes cl ON s.class_id = cl.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN attendance a ON s.id = a.schedule_id
      WHERE s.teacher_id = $1
      GROUP BY s.class_id, cl.name, s.section_id, sec.name
      ORDER BY cl.name, sec.name
    `, [teacherId]);

    // compute rate per group
    const data = result.rows.map(r => {
      const total = parseInt(r.total_attendance_records) || 0;
      const present = parseInt(r.present_count) || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { ...r, attendance_rate: rate };
    });

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error fetching attendance stats by class:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance stats by class' });
  }
});

// Get attendance records for teacher reports with full class details
router.get('/teacher/reports', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { class_id, section_id, date_from, date_to } = req.query;
    
    let where = 'WHERE s.teacher_id = $1';
    const params = [teacherId];
    
    if (class_id) { 
      params.push(class_id); 
      where += ` AND s.class_id = $${params.length}`; 
    }
    if (section_id) { 
      params.push(section_id); 
      where += ` AND s.section_id = $${params.length}`; 
    }
    if (date_from) { 
      params.push(date_from); 
      where += ` AND a.date >= $${params.length}`; 
    }
    if (date_to) { 
      params.push(date_to); 
      where += ` AND a.date <= $${params.length}`; 
    }

    const result = await query(`
      SELECT 
        a.id,
        a.schedule_id,
        a.student_id,
        st.name as student_name,
        a.date,
        a.status,
        a.marked_at,
        a.notes,
        sub.name as subject_name,
        sub.code as subject_code,
        s.start_time,
        s.end_time,
        s.day_of_week,
        s.class_id,
        cl.name as class_name,
        s.section_id,
        sec.name as section_name,
        cr.room_number,
        cr.building,
        cr.floor,
        s.academic_year
      FROM attendance a
      JOIN schedules s ON a.schedule_id = s.id
      JOIN students st ON a.student_id = st.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN classes cl ON s.class_id = cl.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      JOIN classrooms cr ON s.classroom_id = cr.id
      ${where}
      ORDER BY a.date DESC, s.start_time, st.name
    `, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching teacher attendance reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance reports'
    });
  }
});

// Get available classes for a teacher based on attendance records
router.get('/teacher/classes', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Get distinct classes and sections where teacher is ASSIGNED to teach (from teacher_subject_class)
    const result = await query(`
      SELECT DISTINCT
        tsc.class_id,
        cl.name as class_name,
        tsc.section_id,
        sec.name as section_name,
        tsc.subject_id,
        sub.name as subject_name,
        sub.code as subject_code,
        COUNT(DISTINCT a.id) as attendance_count
      FROM teacher_subject_class tsc
      JOIN classes cl ON tsc.class_id = cl.id
      LEFT JOIN sections sec ON tsc.section_id = sec.id
      JOIN subjects sub ON tsc.subject_id = sub.id
      LEFT JOIN schedules s ON tsc.teacher_id = s.teacher_id 
        AND tsc.subject_id = s.subject_id 
        AND tsc.class_id = s.class_id 
        AND (tsc.section_id = s.section_id OR (tsc.section_id IS NULL AND s.section_id IS NULL))
      LEFT JOIN attendance a ON s.id = a.schedule_id
      WHERE tsc.teacher_id = $1 AND tsc.is_active = true
      GROUP BY tsc.class_id, cl.name, tsc.section_id, sec.name, tsc.subject_id, sub.name, sub.code
      ORDER BY cl.name, sec.name, sub.name
    `, [teacherId]);

    // Get all available classes and sections
    const allClassesResult = await query(`
      SELECT 
        c.id as class_id,
        c.name as class_name,
        s.id as section_id,
        s.name as section_name
      FROM classes c
      LEFT JOIN sections s ON c.id = s.class_id
      WHERE c.is_active = true
      ORDER BY c.name, s.name
    `);

    const teacherClasses = result.rows;
    const allClasses = allClassesResult.rows;

    console.log('Teacher Classes from teacher_subject_class:', teacherClasses);
    console.log('All Available Classes:', allClasses);

    // Mark which specific class-section combinations teacher actually teaches
    const classesWithStatus = allClasses.map(cls => {
      // Check if teacher teaches THIS SPECIFIC class-section combination
      const teachesThisCombination = teacherClasses.some(tc => 
        tc.class_id === cls.class_id && 
        tc.section_id === cls.section_id
      );
      
      if (teachesThisCombination) {
        const teacherClass = teacherClasses.find(tc => 
          tc.class_id === cls.class_id && 
          tc.section_id === cls.section_id
        );
        return {
          ...cls,
          teaches: true,
          subject_name: teacherClass.subject_name,
          subject_code: teacherClass.subject_code,
          attendance_count: teacherClass.attendance_count
        };
      } else {
        return {
          ...cls,
          teaches: false,
          subject_name: null,
          subject_code: null,
          attendance_count: 0
        };
      }
    });

    res.json({
      success: true,
      data: classesWithStatus,
      teacher_classes: teacherClasses,
      count: classesWithStatus.length
    });
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher classes'
    });
  }
});

module.exports = router;
