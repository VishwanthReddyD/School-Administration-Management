import { apiClient } from './authService';

const BASE = '/grades';

class GradeService {
  // Get grades for a specific subject
  async getGradesForSubject(subjectId) {
    const res = await apiClient.get(`${BASE}/subject/${subjectId}`);
    return res.data;
  }

  // Get grades for a specific student
  async getGradesForStudent(studentId) {
    const res = await apiClient.get(`${BASE}/student/${studentId}`);
    return res.data;
  }

  // Get grades for current teacher
  async getTeacherGrades() {
    const res = await apiClient.get(`${BASE}/teacher/me`);
    return res.data;
  }

  // Add a new grade
  async addGrade(gradeData) {
    const res = await apiClient.post(BASE, gradeData);
    return res.data;
  }

  // Update a grade
  async updateGrade(gradeId, gradeData) {
    const res = await apiClient.put(`${BASE}/${gradeId}`, gradeData);
    return res.data;
  }

  // Delete a grade
  async deleteGrade(gradeId) {
    const res = await apiClient.delete(`${BASE}/${gradeId}`);
    return res.data;
  }

  // Get grade statistics for a teacher
  async getGradeStats() {
    const res = await apiClient.get(`${BASE}/stats/teacher/me`);
    return res.data;
  }
}

export default new GradeService();
