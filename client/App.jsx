import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/layout/Navigation';
import Login from './pages/Login';
import PrincipalDashboard from './pages/PrincipalDashboard';
import TeacherTimetable from './pages/TeacherTimetable';
import SuperAdminUsers from './pages/SuperAdminUsers';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'super_admin':
        return <Navigate to="/users" replace />;
      case 'principal':
        return <Navigate to="/dashboard" replace />;
      case 'teacher':
        return <Navigate to="/timetable" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Main App Layout
const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {children}
    </div>
  );
};

// App Component
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
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
                duration: 4000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Navigate to="/dashboard" replace />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Super Admin Routes */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AppLayout>
                    <SuperAdminUsers />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Principal Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['principal', 'super_admin']}>
                  <AppLayout>
                    <PrincipalDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Teacher Routes */}
            <Route
              path="/timetable"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'principal', 'super_admin']}>
                  <AppLayout>
                    <TeacherTimetable />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Catch all route */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Navigate to="/dashboard" replace />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
