import { apiClient } from './authService';

const BASE = '/sections';

class SectionService {
  // Get all sections
  async getAllSections() {
    const res = await apiClient.get(BASE);
    return res.data;
  }

  // Get sections by class
  async getSectionsByClass(classId) {
    const res = await apiClient.get(`${BASE}?class_id=${classId}`);
    return res.data;
  }

  // Get section by ID
  async getSectionById(id) {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  }

  // Create new section
  async createSection(sectionData) {
    const res = await apiClient.post(BASE, sectionData);
    return res.data;
  }

  // Update section
  async updateSection(id, sectionData) {
    const res = await apiClient.put(`${BASE}/${id}`, sectionData);
    return res.data;
  }

  // Delete section (soft delete)
  async deleteSection(id) {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res.data;
  }

  // Get students in a section
  async getSectionStudents(sectionId) {
    const res = await apiClient.get(`${BASE}/${sectionId}/students`);
    return res.data;
  }

  // Get section statistics
  async getSectionStats(sectionId) {
    const res = await apiClient.get(`${BASE}/${sectionId}/stats`);
    return res.data;
  }
}

export default new SectionService();

