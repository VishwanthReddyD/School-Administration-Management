import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const scheduleApi = axios.create({
  baseURL: `${API_BASE_URL}/schedules`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
scheduleApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
scheduleApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const scheduleService = {
  // Get all schedules (for Principal/Super Admin)
  getAllSchedules: async () => {
    try {
      const response = await scheduleApi.get('/');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch schedules');
    }
  },

  // Get schedules for a specific teacher
  getTeacherSchedules: async (teacherId) => {
    try {
      const response = await scheduleApi.get(`/teacher/${teacherId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch teacher schedules');
    }
  },

  // Get weekly schedules
  getWeeklySchedules: async (weekStart) => {
    try {
      const response = await scheduleApi.get('/weekly', {
        params: { weekStart }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch weekly schedules');
    }
  },

  // Create a new schedule
  createSchedule: async (scheduleData) => {
    try {
      const response = await scheduleApi.post('/', scheduleData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create schedule');
    }
  },

  // Update an existing schedule
  updateSchedule: async (scheduleId, updateData) => {
    try {
      const response = await scheduleApi.put(`/${scheduleId}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update schedule');
    }
  },

  // Delete a schedule
  deleteSchedule: async (scheduleId) => {
    try {
      const response = await scheduleApi.delete(`/${scheduleId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete schedule');
    }
  },

  // Check for conflicts before creating/updating
  checkConflicts: async (scheduleData, excludeId = null) => {
    try {
      const response = await scheduleApi.post('/check-conflicts', {
        ...scheduleData,
        excludeId
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to check conflicts');
    }
  },

  // Bulk create schedules
  bulkCreateSchedules: async (schedules) => {
    try {
      const response = await scheduleApi.post('/bulk', { schedules });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create schedules in bulk');
    }
  },

  // Get schedule statistics
  getScheduleStats: async () => {
    try {
      const response = await scheduleApi.get('/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch schedule statistics');
    }
  },

  // Export schedules to PDF
  exportToPDF: async (filters = {}) => {
    try {
      const response = await scheduleApi.get('/export/pdf', {
        params: filters,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timetable-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export schedules');
    }
  },

  // Get available time slots for a teacher/classroom
  getAvailableSlots: async (teacherId, classroomId, date, duration = 60) => {
    try {
      const response = await scheduleApi.get('/available-slots', {
        params: { teacherId, classroomId, date, duration }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch available time slots');
    }
  },

  // Get teacher workload for a specific period
  getTeacherWorkload: async (teacherId, startDate, endDate) => {
    try {
      const response = await scheduleApi.get(`/teacher/${teacherId}/workload`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch teacher workload');
    }
  },

  // Get classroom utilization
  getClassroomUtilization: async (classroomId, startDate, endDate) => {
    try {
      const response = await scheduleApi.get(`/classroom/${classroomId}/utilization`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch classroom utilization');
    }
  }
};

export default scheduleService;
