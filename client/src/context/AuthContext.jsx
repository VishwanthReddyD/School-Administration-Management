import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          // Verify token and get user data
          const userData = await authService.verifyToken(storedToken);
          setUser(userData);
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password);
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        setToken(response.token);
        setUser(response.user);
        
        toast.success(`Welcome back, ${response.user.teacher_name || response.user.email}!`);
        return { success: true, requires2FA: response.requires2FA };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  // Update user data
  const updateUser = (userData) => {
    setUser(userData);
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!token;
  };

  // Get user's display name
  const getDisplayName = () => {
    if (user?.teacher_name) {
      return user.teacher_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  // Get user's role display name
  const getRoleDisplayName = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      case 'PRINCIPAL':
        return 'Principal';
      case 'TEACHER':
        return 'Teacher';
      default:
        return 'User';
    }
  };

  // Get user's avatar initials
  const getAvatarInitials = () => {
    if (user?.teacher_name) {
      const names = user.teacher_name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Get user's department
  const getDepartment = () => {
    return user?.department || 'No Department';
  };

  // Check if user can perform specific actions
  const can = (action) => {
    if (!user) return false;

    switch (action) {
      case 'manage_users':
        return hasAnyRole(['SUPER_ADMIN']);
      case 'manage_schedules':
        return hasAnyRole(['PRINCIPAL', 'SUPER_ADMIN']);
      case 'view_all_timetables':
        return hasAnyRole(['PRINCIPAL', 'SUPER_ADMIN']);
      case 'view_own_timetable':
        return hasAnyRole(['TEACHER', 'PRINCIPAL', 'SUPER_ADMIN']);
      case 'request_unavailability':
        return hasRole('TEACHER');
      case 'approve_requests':
        return hasAnyRole(['PRINCIPAL', 'SUPER_ADMIN']);
      case 'access_audit_logs':
        return hasRole('SUPER_ADMIN');
      case 'configure_system':
        return hasRole('SUPER_ADMIN');
      default:
        return false;
    }
  };

  // Refresh token (if needed)
  const refreshToken = async () => {
    try {
      // This would typically call an endpoint to refresh the token
      // For now, we'll just return the current token
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    hasRole,
    hasAnyRole,
    isAuthenticated,
    getDisplayName,
    getRoleDisplayName,
    getAvatarInitials,
    getDepartment,
    can,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
