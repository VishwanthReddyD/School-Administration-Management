const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const teacherRoutes = require('./routes/teachers');
const subjectRoutes = require('./routes/subjects');
const classroomRoutes = require('./routes/classrooms');
const superAdminRoutes = require('./routes/superadmin');
const auditRoutes = require('./routes/audit');
const requestRoutes = require('./routes/requests');
const attendanceRoutes = require('./routes/attendance');
const gradesRoutes = require('./routes/grades');
const classesRoutes = require('./routes/classes');
const sectionsRoutes = require('./routes/sections');
const studentsRoutes = require('./routes/students');

const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'College Timetable Management API'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', authenticateToken, scheduleRoutes);
app.use('/api/teachers', authenticateToken, teacherRoutes);
app.use('/api/subjects', authenticateToken, subjectRoutes);
app.use('/api/classrooms', authenticateToken, classroomRoutes);
app.use('/api/superadmin', authenticateToken, superAdminRoutes);
app.use('/api/audit', authenticateToken, auditRoutes);
app.use('/api/requests', authenticateToken, requestRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/grades', authenticateToken, gradesRoutes);
app.use('/api/classes', authenticateToken, classesRoutes);
app.use('/api/sections', authenticateToken, sectionsRoutes);
app.use('/api/students', authenticateToken, studentsRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 College Timetable Management System API`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
