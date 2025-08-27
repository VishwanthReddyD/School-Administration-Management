import { apiClient } from './authService';

const BASE = '/classes';

class ClassService {
  // Get all classes
  async getAll() {
    const res = await apiClient.get(BASE);
    return res.data;
  }

  // Get class by ID
  async getClassById(id) {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  }

  // Create new class
  async createClass(classData) {
    const res = await apiClient.post(BASE, classData);
    return res.data;
  }

  // Update class
  async updateClass(id, classData) {
    const res = await apiClient.put(`${BASE}/${id}`, classData);
    return res.data;
  }

  // Delete class (soft delete)
  async deleteClass(id) {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res.data;
  }

  // Get sections for a class
  async getClassSections(classId) {
    const res = await apiClient.get(`${BASE}/${classId}/sections`);
    return res.data;
  }

  // Get students for a class
  async getClassStudents(classId) {
    const res = await apiClient.get(`${BASE}/${classId}/students`);
    return res.data;
  }

  // Get class statistics
  async getClassStats(classId) {
    const res = await apiClient.get(`${BASE}/${classId}/stats`);
    return res.data;
  }
}

export default new ClassService();

