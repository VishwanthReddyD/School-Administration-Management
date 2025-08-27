import { apiClient } from './authService';

const BASE = '/students';

class StudentService {
  // Get all students
  async getAllStudents() {
    const res = await apiClient.get(BASE);
    return res.data;
  }

  // Get students by class
  async getStudentsByClass(classId, sectionId = null) {
    let url = `${BASE}?class_id=${classId}`;
    if (sectionId) {
      url += `&section_id=${sectionId}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  }

  // Get students by section
  async getStudentsBySection(sectionId) {
    const res = await apiClient.get(`${BASE}?section_id=${sectionId}`);
    return res.data;
  }

  // Search students
  async searchStudents(searchTerm) {
    const res = await apiClient.get(`${BASE}?search=${encodeURIComponent(searchTerm)}`);
    return res.data;
  }

  // Get student by ID
  async getStudentById(id) {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  }

  // Create new student
  async createStudent(studentData) {
    const res = await apiClient.post(BASE, studentData);
    return res.data;
  }

  // Update student
  async updateStudent(id, studentData) {
    const res = await apiClient.put(`${BASE}/${id}`, studentData);
    return res.data;
  }

  // Delete student (soft delete)
  async deleteStudent(id) {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res.data;
  }

  // Get student attendance
  async getStudentAttendance(studentId, startDate = null, endDate = null) {
    let url = `${BASE}/${studentId}/attendance`;
    if (startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  }

  // Get student grades
  async getStudentGrades(studentId, subjectId = null, academicYear = null) {
    let url = `${BASE}/${studentId}/grades`;
    const params = [];
    if (subjectId) params.push(`subject_id=${subjectId}`);
    if (academicYear) params.push(`academic_year=${academicYear}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  }
}

export default new StudentService();

