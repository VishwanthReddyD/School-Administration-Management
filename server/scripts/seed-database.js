const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'college_timetable',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Helper function for queries
    const query = async (text, params) => {
      try {
        const result = await pool.query(text, params);
        return result;
      } catch (error) {
        console.error('Query error:', error);
        throw error;
      }
    };

    // Seed Users (Super Admin, Principal, Teachers)
    const passwordPlain = 'password123';
    const passwordHash = await bcrypt.hash(passwordPlain, 12);
    const users = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@school.edu',
        password_hash: passwordHash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'principal@school.edu',
        password_hash: passwordHash,
        name: 'Dr. Sarah Johnson',
        role: 'PRINCIPAL'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'john.doe@school.edu',
        password_hash: passwordHash,
        name: 'John Doe',
        role: 'TEACHER'
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        email: 'jane.smith@school.edu',
        password_hash: passwordHash,
        name: 'Jane Smith',
        role: 'TEACHER'
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        email: 'mike.brown@school.edu',
        password_hash: passwordHash,
        name: 'Mike Brown',
        role: 'TEACHER'
      },
      {
        id: '66666666-6666-6666-6666-666666666666',
        email: 'emily.taylor@school.edu',
        password_hash: passwordHash,
        name: 'Emily Taylor',
        role: 'TEACHER'
      },
      {
        id: '77777777-7777-7777-7777-777777777777',
        email: 'david.lee@school.edu',
        password_hash: passwordHash,
        name: 'David Lee',
        role: 'TEACHER'
      }
    ];

    for (const user of users) {
      await query(`
        INSERT INTO users (id, email, password_hash, name, role, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active
      `, [user.id, user.email, user.password_hash, user.name, user.role, true]);
    }
    console.log('✅ Users seeded');

    // Seed Classes
    const classes = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Class 10',
        description: 'Secondary School Class 10',
        academic_year: '2024-2025',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Class 11',
        description: 'Higher Secondary Class 11',
        academic_year: '2024-2025',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'Class 12',
        description: 'Higher Secondary Class 12',
        academic_year: '2024-2025',
        created_by: '22222222-2222-2222-2222-222222222222'
      }
    ];

    for (const classItem of classes) {
      await query(`
        INSERT INTO classes (id, name, description, academic_year, created_by) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        academic_year = EXCLUDED.academic_year,
        created_by = EXCLUDED.created_by
      `, [classItem.id, classItem.name, classItem.description, classItem.academic_year, classItem.created_by]);
    }
    console.log('✅ Classes seeded');

    // Seed Sections
    const sections = [
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'A',
        description: 'Section A',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'B',
        description: 'Section B',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        class_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'A',
        description: 'Section A',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        class_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'A',
        description: 'Section A',
        created_by: '22222222-2222-2222-2222-222222222222'
      }
    ];

    for (const section of sections) {
      await query(`
        INSERT INTO sections (id, class_id, name, description, created_by) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
        class_id = EXCLUDED.class_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        created_by = EXCLUDED.created_by
      `, [section.id, section.class_id, section.name, section.description, section.created_by]);
    }
    console.log('✅ Sections seeded');

    // Seed Students
    const students = [
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        student_id: 'ST001',
        name: 'John Smith',
        email: 'john.smith@student.school.edu',
        phone: '+1234567890',
        date_of_birth: '2006-05-15',
        gender: 'Male',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        section_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        admission_date: '2024-06-01',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        student_id: 'ST002',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@student.school.edu',
        phone: '+1234567891',
        date_of_birth: '2006-08-22',
        gender: 'Female',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        section_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        admission_date: '2024-06-01',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '11111111-1111-1111-1111-111111111111',
        student_id: 'ST003',
        name: 'Mike Davis',
        email: 'mike.davis@student.school.edu',
        phone: '+1234567892',
        date_of_birth: '2006-03-10',
        gender: 'Male',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        section_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        admission_date: '2024-06-01',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        student_id: 'ST004',
        name: 'Emily Wilson',
        email: 'emily.wilson@student.school.edu',
        phone: '+1234567893',
        date_of_birth: '2005-11-05',
        gender: 'Female',
        class_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        section_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        admission_date: '2024-06-01',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        student_id: 'ST005',
        name: 'David Brown',
        email: 'david.brown@student.school.edu',
        phone: '+1234567894',
        date_of_birth: '2005-07-18',
        gender: 'Male',
        class_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        section_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        admission_date: '2024-06-01',
        created_by: '22222222-2222-2222-2222-222222222222'
      }
    ];

    for (const student of students) {
      await query(`
        INSERT INTO students (id, student_id, name, email, phone, date_of_birth, gender, class_id, section_id, admission_date, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
        student_id = EXCLUDED.student_id,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        class_id = EXCLUDED.class_id,
        section_id = EXCLUDED.section_id,
        admission_date = EXCLUDED.admission_date,
        created_by = EXCLUDED.created_by
      `, [student.id, student.student_id, student.name, student.email, student.phone, student.date_of_birth, student.gender, student.class_id, student.section_id, student.admission_date, student.created_by]);
    }
    console.log('✅ Students seeded');

    // Seed additional students programmatically (so classes/attendance look real)
    console.log('Seeding additional students...');
    for (let i = 6; i <= 30; i++) {
      const sid = `ST${String(i).padStart(3, '0')}`;
      const name = `Student ${i}`;
      await query(`
        INSERT INTO students (student_id, name, email, phone, date_of_birth, gender, class_id, section_id, admission_date, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, [
        sid,
        name,
        `${sid.toLowerCase()}@student.school.edu`,
        `+9100000${String(1000 + i)}`,
        '2006-01-15',
        i % 2 === 0 ? 'Male' : 'Female',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        i % 2 === 0 ? 'dddddddd-dddd-dddd-dddd-dddddddddddd' : 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '2024-06-01',
        '22222222-2222-2222-2222-222222222222'
      ]);
    }
    console.log('✅ Additional students seeded');

    // Seed Subjects
    const subjects = [
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Mathematics',
        code: 'MATH',
        description: 'Advanced Mathematics including Algebra, Geometry, and Calculus',
        credits: 1,
        color: '#3B82F6',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Physics',
        code: 'PHYS',
        description: 'Fundamental Physics concepts and laboratory work',
        credits: 1,
        color: '#10B981',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '66666666-6666-6666-6666-666666666666',
        name: 'Chemistry',
        code: 'CHEM',
        description: 'General Chemistry with practical experiments',
        credits: 1,
        color: '#F59E0B',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '77777777-7777-7777-7777-777777777777',
        name: 'English',
        code: 'ENG',
        description: 'English Literature and Language',
        credits: 1,
        color: '#8B5CF6',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '88888888-8888-8888-8888-888888888888',
        name: 'History',
        code: 'HIST',
        description: 'World History and Social Studies',
        credits: 1,
        color: '#EF4444',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'Computer Science',
        code: 'CS',
        description: 'Programming and Computer Fundamentals',
        credits: 1,
        color: '#06B6D4',
        created_by: '22222222-2222-2222-2222-222222222222'
      }
    ];

    for (const subject of subjects) {
      await query(`
        INSERT INTO subjects (id, name, code, description, credits, color, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        credits = EXCLUDED.credits,
        color = EXCLUDED.color,
        created_by = EXCLUDED.created_by
      `, [subject.id, subject.name, subject.code, subject.description, subject.credits, subject.color, subject.created_by]);
    }
    console.log('✅ Subjects seeded');

    // Seed Classrooms
    const classrooms = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        room_number: '101',
        capacity: 30,
        has_projector: true,
        has_computer: true,
        building: 'Main Building',
        floor: 1,
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        room_number: '205',
        capacity: 25,
        has_projector: false,
        has_computer: false,
        building: 'Main Building',
        floor: 2,
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        room_number: '301',
        capacity: 40,
        has_projector: true,
        has_computer: true,
        building: 'Main Building',
        floor: 3,
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        room_number: 'Lab-A',
        capacity: 20,
        has_projector: true,
        has_computer: true,
        building: 'Science Building',
        floor: 1,
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        room_number: 'Lab-B',
        capacity: 15,
        has_projector: false,
        has_computer: true,
        building: 'Science Building',
        floor: 1,
        created_by: '22222222-2222-2222-2222-222222222222'
      }
    ];

    for (const classroom of classrooms) {
      await query(`
        INSERT INTO classrooms (id, room_number, capacity, has_projector, has_computer, building, floor, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
        room_number = EXCLUDED.room_number,
        capacity = EXCLUDED.capacity,
        has_projector = EXCLUDED.has_projector,
        has_computer = EXCLUDED.has_computer,
        building = EXCLUDED.building,
        floor = EXCLUDED.floor,
        created_by = EXCLUDED.created_by
      `, [classroom.id, classroom.room_number, classroom.capacity, classroom.has_projector, classroom.has_computer, classroom.building, classroom.floor, classroom.created_by]);
    }
    console.log('✅ Classrooms seeded');

    // Seed Teacher-Subject-Class relationships
    const teacherSubjectClass = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        teacher_id: '33333333-3333-3333-3333-333333333333',
        subject_id: '44444444-4444-4444-4444-444444444444',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        section_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        academic_year: '2024-2025',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        teacher_id: '33333333-3333-3333-3333-333333333333',
        subject_id: '44444444-4444-4444-4444-444444444444',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        section_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        academic_year: '2024-2025',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        teacher_id: '44444444-4444-4444-4444-444444444444',
        subject_id: '55555555-5555-5555-5555-555555555555',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        section_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        academic_year: '2024-2025',
        created_by: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        teacher_id: '55555555-5555-5555-5555-555555555555',
        subject_id: '66666666-6666-6666-6666-666666666666',
        class_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        section_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        academic_year: '2024-2025',
        created_by: '22222222-2222-2222-2222-222222222222'
      }
    ];

    for (const tsc of teacherSubjectClass) {
      await query(`
        INSERT INTO teacher_subject_class (id, teacher_id, subject_id, class_id, section_id, academic_year, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
        teacher_id = EXCLUDED.teacher_id,
        subject_id = EXCLUDED.subject_id,
        class_id = EXCLUDED.class_id,
        section_id = EXCLUDED.section_id,
        academic_year = EXCLUDED.academic_year,
        created_by = EXCLUDED.created_by
      `, [tsc.id, tsc.teacher_id, tsc.subject_id, tsc.class_id, tsc.section_id, tsc.academic_year, tsc.created_by]);
    }
    console.log('✅ Teacher-subject-class relationships seeded');

    // Seed Schedules - programmatically generate a full week for multiple teachers
    console.log('Seeding schedules...');
    const scheduleCombos = [
      { teacher_id: '33333333-3333-3333-3333-333333333333', subject_id: '44444444-4444-4444-4444-444444444444', class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', section_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', classroom_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      { teacher_id: '44444444-4444-4444-4444-444444444444', subject_id: '55555555-5555-5555-5555-555555555555', class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', section_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', classroom_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
      { teacher_id: '55555555-5555-5555-5555-555555555555', subject_id: '66666666-6666-6666-6666-666666666666', class_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', section_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', classroom_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
      { teacher_id: '66666666-6666-6666-6666-666666666666', subject_id: '77777777-7777-7777-7777-777777777777', class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', section_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', classroom_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
      { teacher_id: '77777777-7777-7777-7777-777777777777', subject_id: '88888888-8888-8888-8888-888888888888', class_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', section_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', classroom_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' }
    ];
    let scheduleCounter = 1;
    for (const combo of scheduleCombos) {
      for (let day = 1; day <= 5; day++) {
        const slots = [
          { start: '08:00:00', end: '09:30:00' },
          { start: '10:00:00', end: '11:30:00' },
          { start: '13:00:00', end: '14:30:00' }
        ];
        for (const slot of slots) {
          const sid = `${scheduleCounter.toString().padStart(8, '0')}-${scheduleCounter.toString().padStart(4, '0')}-${scheduleCounter.toString().padStart(4, '0')}-${scheduleCounter.toString().padStart(4, '0')}-${scheduleCounter.toString().padStart(12, '0')}`;
          await query(`
            INSERT INTO schedules (id, teacher_id, subject_id, class_id, section_id, classroom_id, day_of_week, start_time, end_time, academic_year, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO NOTHING
          `, [sid, combo.teacher_id, combo.subject_id, combo.class_id, combo.section_id, combo.classroom_id, day, slot.start, slot.end, '2024-2025', '22222222-2222-2222-2222-222222222222']);
          scheduleCounter++;
        }
      }
    }
    console.log('✅ Schedules seeded');

    // Seed Teacher Requests (varied statuses)
    await query(`
      INSERT INTO teacher_requests (teacher_id, request_type, title, description, start_date, end_date, status, priority) VALUES
      ((SELECT id FROM users WHERE email = 'john.doe@school.edu'),'leave','Personal Leave','Family event','2024-12-14','2024-12-14','pending','medium'),
      ((SELECT id FROM users WHERE email = 'jane.smith@school.edu'),'schedule_change','Physics Lab Extension','Extend lab duration','2024-12-11','2024-12-11','approved','low'),
      ((SELECT id FROM users WHERE email = 'mike.brown@school.edu'),'room_change','Room change needed','Projector required','2024-12-12','2024-12-12','rejected','high')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Sample teacher requests inserted');

    // Seed attendance data
    console.log('Seeding attendance data...');
    // Look up schedules we just created to get valid IDs
    const schedMathMon0800 = await query(
      `SELECT id FROM schedules 
       WHERE teacher_id = $1 AND day_of_week = 1 AND start_time = '08:00:00' 
       ORDER BY id LIMIT 1`,
      ['33333333-3333-3333-3333-333333333333']
    );
    const schedPhysMon1000 = await query(
      `SELECT id FROM schedules 
       WHERE teacher_id = $1 AND day_of_week = 1 AND start_time = '10:00:00' 
       ORDER BY id LIMIT 1`,
      ['44444444-4444-4444-4444-444444444444']
    );

    const scheduleIdA = schedMathMon0800.rows[0]?.id;
    const scheduleIdB = schedPhysMon1000.rows[0]?.id;

    if (scheduleIdA && scheduleIdB) {
      const attendanceData = [
        {
          schedule_id: scheduleIdA,
          student_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          date: '2024-12-09',
          status: 'present',
          marked_by: '33333333-3333-3333-3333-333333333333'
        },
        {
          schedule_id: scheduleIdA,
          student_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          date: '2024-12-09',
          status: 'present',
          marked_by: '33333333-3333-3333-3333-333333333333'
        },
        {
          schedule_id: scheduleIdA,
          student_id: '11111111-1111-1111-1111-111111111111',
          date: '2024-12-09',
          status: 'late',
          marked_by: '33333333-3333-3333-3333-333333333333'
        },
        {
          schedule_id: scheduleIdB,
          student_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          date: '2024-12-09',
          status: 'present',
          marked_by: '44444444-4444-4444-4444-444444444444'
        },
        {
          schedule_id: scheduleIdB,
          student_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          date: '2024-12-09',
          status: 'absent',
          marked_by: '44444444-4444-4444-4444-444444444444'
        }
      ];

      for (const attendance of attendanceData) {
        await query(`
          INSERT INTO attendance (schedule_id, student_id, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (schedule_id, student_id, date) DO UPDATE SET
          status = EXCLUDED.status,
          marked_by = EXCLUDED.marked_by
        `, [attendance.schedule_id, attendance.student_id, attendance.date, attendance.status, attendance.marked_by]);
      }
      console.log('✅ Sample attendance data inserted');
    } else {
      console.warn('⚠ Skipping attendance seed: required schedules not found');
    }

    // Seed grade data
    console.log('Seeding grade data...');
    const gradeData = [
      {
        student_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        subject_id: '44444444-4444-4444-4444-444444444444',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        assignment_type: 'Midterm Exam',
        title: 'Mathematics Midterm 1',
        score: 85.5,
        max_score: 100,
        grade_letter: 'B',
        feedback: 'Good work on algebra, need improvement on geometry',
        academic_year: '2024-2025',
        submitted_by: '33333333-3333-3333-3333-333333333333'
      },
      {
        student_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        subject_id: '44444444-4444-4444-4444-444444444444',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        assignment_type: 'Homework',
        title: 'Algebra Assignment 3',
        score: 92.0,
        max_score: 100,
        grade_letter: 'A',
        feedback: 'Excellent work on all problems',
        academic_year: '2024-2025',
        submitted_by: '33333333-3333-3333-3333-333333333333'
      },
      {
        student_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        subject_id: '44444444-4444-4444-4444-444444444444',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        assignment_type: 'Midterm Exam',
        title: 'Mathematics Midterm 1',
        score: 78.0,
        max_score: 100,
        grade_letter: 'C+',
        feedback: 'Good understanding of concepts, work on problem-solving speed',
        academic_year: '2024-2025',
        submitted_by: '33333333-3333-3333-3333-333333333333'
      }
    ];

    for (const grade of gradeData) {
      await query(`
        INSERT INTO grades (student_id, subject_id, class_id, assignment_type, title, score, max_score, grade_letter, feedback, academic_year, submitted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [grade.student_id, grade.subject_id, grade.class_id, grade.assignment_type, grade.title, grade.score, grade.max_score, grade.grade_letter, grade.feedback, grade.academic_year, grade.submitted_by]);
    }
    console.log('✅ Sample grade data inserted');

    // Seed additional grades for visibility in Teacher pages
    console.log('Seeding additional grades...');
    const extraGrades = [
      {
        student_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        subject_id: '55555555-5555-5555-5555-555555555555',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        assignment_type: 'Quiz',
        title: 'Physics Quiz 1',
        score: 16,
        max_score: 20,
        grade_letter: 'B',
        feedback: 'Good understanding of fundamentals',
        academic_year: '2024-2025',
        submitted_by: '44444444-4444-4444-4444-444444444444'
      },
      {
        student_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        subject_id: '55555555-5555-5555-5555-555555555555',
        class_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        assignment_type: 'Homework',
        title: 'Physics Homework 2',
        score: 18,
        max_score: 20,
        grade_letter: 'A',
        feedback: 'Well done',
        academic_year: '2024-2025',
        submitted_by: '44444444-4444-4444-4444-444444444444'
      }
    ];

    for (const grade of extraGrades) {
      await query(`
        INSERT INTO grades (student_id, subject_id, class_id, assignment_type, title, score, max_score, grade_letter, feedback, academic_year, submitted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [grade.student_id, grade.subject_id, grade.class_id, grade.assignment_type, grade.title, grade.score, grade.max_score, grade.grade_letter, grade.feedback, grade.academic_year, grade.submitted_by]);
    }
    console.log('✅ Additional grades inserted');

    console.log('🎉 Database seeding completed successfully!');
    console.log('👥 Users created: 1 Super Admin, 1 Principal, 3 Teachers');
    console.log('🏫 Classes created: 3 classes (10, 11, 12)');
    console.log('📚 Sections created: 4 sections across classes');
    console.log('👨‍🎓 Students created: 5 students');
    console.log('📖 Subjects created: 6 subjects with color coding');
    console.log('🏢 Classrooms created: 5 rooms with different capacities');
    console.log('🔗 Teacher-subject-class relationships created');
    console.log('📅 Schedules created: 4 class sessions');
    console.log('🔑 Default password for all users: password123');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
