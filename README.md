# 🏫 School Timetable Management System

A comprehensive web-based application for managing school timetables, teacher requests, attendance, grades, and administrative tasks. Built with modern web technologies and designed for educational institutions.

## ✨ Features

### 🎯 Core Functionality
- **Timetable Management**: Create, edit, and manage class schedules
- **Teacher Request System**: Submit and process leave, schedule change, and room change requests
- **Attendance Tracking**: Mark and monitor student attendance
- **Grade Management**: Record and manage student grades and assignments
- **User Management**: Role-based access control (Super Admin, Principal, Teacher)
- **Real-time Updates**: Live status updates for requests and activities

### 🔐 Role-Based Access Control
- **Super Admin**: Full system access, user management, database operations
- **Principal**: Approve/reject teacher requests, view reports, manage classes
- **Teacher**: Submit requests, mark attendance, manage grades, view schedules

### 📱 User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern UI**: Clean, intuitive interface with Tailwind CSS
- **Real-time Notifications**: Toast alerts for status changes and updates
- **Interactive Dashboard**: Comprehensive overview with quick actions

## 🛠️ Technology Stack

### Frontend
- **React.js** - Modern UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **React Router** - Client-side routing
- **React Hot Toast** - Notification system

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database
- **bcryptjs** - Password hashing
- **JWT** - Authentication tokens

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Nodemon** - Development server

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd School_TimeTable_Management
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. **Database Setup**
   ```bash
   # Navigate to server directory
   cd server

   # Create database and tables
   node scripts/setup-database.js

   # Seed with sample data
   node scripts/seed-database.js
   ```

4. **Environment Configuration**
   ```bash
   # Create .env file in server directory
   cp .env.example .env

   # Configure your database connection
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=school_timetable
   DB_USER=your_username
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   ```

5. **Start the application**
   ```bash
   # Start backend server (from server directory)
   npm run dev

   # Start frontend (from client directory)
   npm run dev
   ```

## 📁 Project Structure

```
School_TimeTable_Management/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service functions
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   └── package.json
├── server/                 # Backend Node.js application
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── routes/            # API route handlers
│   ├── scripts/           # Database setup and seeding
│   └── package.json
└── PROJECT_README.md       # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Teacher Requests
- `GET /api/requests` - Get all requests (Admin/Principal)
- `GET /api/requests/my-requests` - Get teacher's own requests
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id/status` - Update request status

### Timetables
- `GET /api/schedules` - Get all schedules
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance
- `PUT /api/attendance/:id` - Update attendance

### Grades
- `GET /api/grades` - Get grade records
- `POST /api/grades` - Create grade record
- `PUT /api/grades/:id` - Update grade

## 🎨 Key Features Explained

### Teacher Request System
The system allows teachers to submit various types of requests:
- **Leave Requests**: Personal, sick, or vacation leave
- **Schedule Changes**: Modify class timings or dates
- **Room Changes**: Change classroom or venue
- **Other Requests**: Administrative or academic requests

Requests go through an approval workflow:
1. Teacher submits request
2. Principal reviews and approves/rejects
3. Teacher receives real-time notification
4. Request status updates in both Recent Requests and Recent Activity sections

### Real-time Updates
- **Automatic Refresh**: Data refreshes every 30 seconds
- **Manual Refresh**: Users can manually refresh for immediate updates
- **Status Notifications**: Toast alerts for status changes
- **Live Dashboard**: Real-time updates across all sections

### Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Touch-Friendly**: Easy navigation on mobile devices
- **Cross-Browser**: Compatible with modern browsers

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Role-Based Access**: Granular permissions based on user roles
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Secure cross-origin requests

## 📊 Database Schema

The system uses a well-structured PostgreSQL database with tables for:
- **Users**: User accounts and authentication
- **Teacher Requests**: Request management and workflow
- **Schedules**: Class timetables and schedules
- **Attendance**: Student attendance records
- **Grades**: Academic performance tracking
- **Audit Logs**: System activity tracking

## 🚀 Deployment

### Production Build
```bash
# Build frontend for production
cd client
npm run build

# Start production server
cd ../server
npm start
```

### Environment Variables
Ensure all required environment variables are set in production:
- Database connection details
- JWT secret keys
- API endpoints
- CORS origins

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- **Mobile App**: Native mobile applications
- **Calendar Integration**: Sync with external calendar systems
- **Advanced Analytics**: Detailed reporting and insights
- **Multi-language Support**: Internationalization
- **API Documentation**: Swagger/OpenAPI documentation
- **Testing Suite**: Comprehensive unit and integration tests

## 📈 Performance

- **Optimized Queries**: Efficient database queries with proper indexing
- **Caching**: Redis integration for improved performance
- **Lazy Loading**: Progressive loading of components
- **Bundle Optimization**: Code splitting and tree shaking

---

**Built with ❤️ for educational institutions**
