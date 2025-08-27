import { apiClient } from './authService';

const API_BASE_URL = '/attendance';

const attendanceService = {
  // Get attendance for a specific schedule
  getAttendanceForSchedule: async (scheduleId) => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/schedule/${scheduleId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance for schedule:', error);
      throw error;
    }
  },

  // Get all attendance records for the current teacher with full class details
  getTeacherAttendance: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.section_id) params.append('section_id', filters.section_id);
      if (filters.date) params.append('date', filters.date);
      
      const response = await apiClient.get(`${API_BASE_URL}/teacher/me?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher attendance:', error);
      throw error;
    }
  },

  // Get attendance summary for teacher
  getTeacherSummary: async () => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/teacher/summary`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher summary:', error);
      throw error;
    }
  },

  // Mark attendance for a student
  markAttendance: async (attendanceData) => {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/mark`, attendanceData);
      return response.data;
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  },

  // Get attendance statistics for teacher
  getTeacherStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.section_id) params.append('section_id', filters.section_id);
      
      const response = await apiClient.get(`${API_BASE_URL}/teacher/stats?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      throw error;
    }
  },

  // Get attendance stats grouped by class/section
  getTeacherStatsByClass: async () => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/teacher/stats/by-class`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher stats by class:', error);
      throw error;
    }
  },

  // Get attendance records for teacher reports with full class details
  getTeacherReports: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.section_id) params.append('section_id', filters.section_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const response = await apiClient.get(`${API_BASE_URL}/teacher/reports?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher attendance reports:', error);
      throw error;
    }
  },

  // Get available classes for a teacher based on attendance records
  getTeacherClasses: async () => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/teacher/classes`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      throw error;
    }
  }
};

export default attendanceService;
