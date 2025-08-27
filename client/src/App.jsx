import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PrincipalDashboard from './pages/PrincipalDashboard';
import TeacherTimetable from './pages/TeacherTimetable';
import TeacherRequests from './pages/TeacherRequests';
import TeacherAttendance from './pages/TeacherAttendance';
import TeacherGrades from './pages/TeacherGrades';
import TeacherFullSchedule from './pages/TeacherFullSchedule';
import TeacherReports from './pages/TeacherReports';
import SuperAdminUsers from './pages/SuperAdminUsers';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Main App Component
const AppContent = () => {
  const { user } = useAuth();

  // Redirect based on user role
  const getDefaultRoute = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'PRINCIPAL':
        return '/principal/dashboard';
      case 'TEACHER':
        return '/teacher/timetable';
      case 'SUPER_ADMIN':
        return '/superadmin/users';
      default:
        return '/login';
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            user ? <Navigate to={getDefaultRoute()} replace /> : <Login />
          } />
          
          {/* Principal Routes */}
          <Route path="/principal/*" element={
            <ProtectedRoute allowedRoles={['PRINCIPAL', 'SUPER_ADMIN']}>
              <PrincipalDashboard />
            </ProtectedRoute>
          } />
          
          {/* Teacher Routes */}
          <Route path="/teacher/*" element={
            <ProtectedRoute allowedRoles={['TEACHER', 'PRINCIPAL', 'SUPER_ADMIN']}>
              <Routes>
                <Route path="/" element={<Navigate to="/teacher/timetable" replace />} />
                <Route path="/timetable" element={<TeacherTimetable />} />
                <Route path="/requests" element={<TeacherRequests />} />
                <Route path="/attendance" element={<TeacherAttendance />} />
                <Route path="/grades" element={<TeacherGrades />} />
                <Route path="/schedule" element={<TeacherFullSchedule />} />
                <Route path="/reports" element={<TeacherReports />} />
              </Routes>
            </ProtectedRoute>
          } />
          
          {/* Super Admin Routes */}
          <Route path="/superadmin/*" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <SuperAdminUsers />
            </ProtectedRoute>
          } />
          
          {/* Default Route */}
          <Route path="/" element={
            <Navigate to={getDefaultRoute()} replace />
          } />
          
          {/* Unauthorized Route */}
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-red-600 mb-4">🚫 Access Denied</h1>
                <p className="text-gray-600 mb-6">
                  You don't have permission to access this page.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />
          
          {/* 404 Route */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                <p className="text-gray-600 mb-6">Page not found</p>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />
        </Routes>
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
};

// App Component with Providers
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
