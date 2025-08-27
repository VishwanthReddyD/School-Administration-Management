const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'college_timetable',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

const setupDatabase = async () => {
  try {
    console.log('🚀 Setting up College Timetable Management Database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();

    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ UUID extension enabled');

    // Drop existing tables if they exist (for clean setup)
    console.log('🗑️  Dropping existing tables for clean setup...');
    const tablesToDrop = [
      'audit_logs',
      'teacher_requests',
      'grades',
      'attendance',
      'schedules',
      'teacher_subject_class',
      'students',
      'sections',
      'classrooms',
      'subjects',
      'classes',
      'users'
    ];

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      } catch (error) {
        // Ignore errors if tables don't exist
      }
    }
    console.log('✅ Existing tables dropped');

    // Drop existing triggers if they exist
    console.log('🗑️  Dropping existing triggers for clean setup...');
    const triggersToDrop = [
      'update_users_updated_at',
      'update_classes_updated_at',
      'update_sections_updated_at',
      'update_students_updated_at',
      'update_subjects_updated_at',
      'update_classrooms_updated_at',
      'update_teacher_subject_class_updated_at',
      'update_schedules_updated_at',
      'update_attendance_updated_at',
      'update_grades_updated_at',
      'update_teacher_requests_updated_at'
    ];

    for (const trigger of triggersToDrop) {
      try {
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON users CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON classes CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON sections CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON students CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON subjects CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON classrooms CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON teacher_subject_class CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON schedules CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON attendance CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON grades CASCADE`);
        await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON teacher_requests CASCADE`);
      } catch (error) {
        // Ignore errors if triggers don't exist
      }
    }
    console.log('✅ Existing triggers dropped');

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

    // Create users table (for authentication)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'PRINCIPAL', 'TEACHER')),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created');

    // Create classes table (school classes like 10th, 11th, 12th)
    await query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "Class 10", "Class 11", "Class 12"
        description TEXT,
        academic_year VARCHAR(20) NOT NULL, -- e.g., "2024-2025"
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Classes table created');

    // Create sections table (optional sections within classes like A, B, C)
    await query(`
      CREATE TABLE IF NOT EXISTS sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        name VARCHAR(10) NOT NULL, -- e.g., "A", "B", "C"
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(class_id, name)
      )
    `);
    console.log('✅ Sections table created');

    // Create students table
    await query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(50) UNIQUE NOT NULL, -- School roll number
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        date_of_birth DATE,
        gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
        class_id UUID NOT NULL REFERENCES classes(id),
        section_id UUID REFERENCES sections(id),
        admission_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Students table created');

    // Create subjects table
    await query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        credits INTEGER DEFAULT 1,
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Subjects table created');

    // Create classrooms table
    await query(`
      CREATE TABLE IF NOT EXISTS classrooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_number VARCHAR(50) UNIQUE NOT NULL,
        capacity INTEGER NOT NULL,
        has_projector BOOLEAN DEFAULT false,
        has_computer BOOLEAN DEFAULT false,
        building VARCHAR(100),
        floor INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Classrooms table created');

    // Create teacher_subject_class table (many-to-many relationship)
    await query(`
      CREATE TABLE IF NOT EXISTS teacher_subject_class (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id UUID REFERENCES sections(id),
        academic_year VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(teacher_id, subject_id, class_id, section_id, academic_year)
      )
    `);
    console.log('✅ Teacher-subject-class relationships table created');

    // Create schedules table
    await query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES users(id),
        subject_id UUID NOT NULL REFERENCES subjects(id),
        class_id UUID NOT NULL REFERENCES classes(id),
        section_id UUID REFERENCES sections(id),
        classroom_id UUID NOT NULL REFERENCES classrooms(id),
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT valid_time CHECK (start_time < end_time)
      )
    `);
    console.log('✅ Schedules table created');

    // Create attendance table
    await query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
        marked_by UUID NOT NULL REFERENCES users(id),
        marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(schedule_id, student_id, date)
      )
    `);
    console.log('✅ Attendance table created');

    // Create grades table
    await query(`
      CREATE TABLE IF NOT EXISTS grades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        assignment_type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        score DECIMAL(5,2) NOT NULL,
        max_score DECIMAL(5,2) NOT NULL DEFAULT 100,
        percentage DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((score / max_score) * 100, 2)) STORED,
        grade_letter VARCHAR(2),
        feedback TEXT,
        academic_year VARCHAR(20) NOT NULL,
        submitted_by UUID NOT NULL REFERENCES users(id),
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Grades table created');

    // Create teacher_requests table
    await query(`
      CREATE TABLE IF NOT EXISTS teacher_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('leave', 'schedule_change', 'room_change', 'other')),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE,
        processed_by UUID REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Teacher requests table created');

    // Create audit_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Audit logs table created');

    // Create indexes for performance
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
    await query('CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);');
    await query('CREATE INDEX IF NOT EXISTS idx_sections_class ON sections(class_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_students_section ON students(section_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);');
    await query('CREATE INDEX IF NOT EXISTS idx_classrooms_room ON classrooms(room_number);');
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_subject_class_teacher ON teacher_subject_class(teacher_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_subject_class_subject ON teacher_subject_class(subject_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_subject_class_class ON teacher_subject_class(class_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON schedules(teacher_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_schedules_time ON schedules(day_of_week, start_time);');
    await query('CREATE INDEX IF NOT EXISTS idx_schedules_classroom ON schedules(classroom_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_attendance_schedule ON attendance(schedule_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);');
    await query('CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_grades_class ON grades(class_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_requests_teacher ON teacher_requests(teacher_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_teacher_requests_status ON teacher_requests(status);');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);');
    console.log('✅ Performance indexes created');

    // Create updated_at trigger function
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Updated_at trigger function created');



    // Create triggers for updated_at
    await query(`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_classes_updated_at 
      BEFORE UPDATE ON classes 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_sections_updated_at 
      BEFORE UPDATE ON sections 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_students_updated_at 
      BEFORE UPDATE ON students 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_subjects_updated_at 
      BEFORE UPDATE ON subjects 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_classrooms_updated_at 
      BEFORE UPDATE ON classrooms 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_teacher_subject_class_updated_at 
      BEFORE UPDATE ON teacher_subject_class 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_schedules_updated_at 
      BEFORE UPDATE ON schedules 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_attendance_updated_at 
      BEFORE UPDATE ON attendance 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_grades_updated_at 
      BEFORE UPDATE ON grades 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await query(`
      CREATE TRIGGER update_teacher_requests_updated_at 
      BEFORE UPDATE ON teacher_requests 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Updated_at triggers created');

    console.log('🎉 Database setup completed successfully!');
    console.log('📊 Tables created: users, classes, sections, students, subjects, classrooms, teacher_subject_class, schedules, attendance, grades, teacher_requests, audit_logs');
    console.log('🔒 Constraints and indexes applied for data integrity and performance');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };
