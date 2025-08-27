import { apiClient } from './authService';

const BASE = '/classrooms';

export const classroomService = {
  async getAll(params = {}) {
    const res = await apiClient.get(BASE, { params });
    return res.data;
  },
  async getById(id) {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },
};

export default classroomService;


