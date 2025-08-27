import { apiClient } from './authService';

const BASE = '/teachers';

export const teacherService = {
  async getAll(params = {}) {
    const res = await apiClient.get(BASE, { params });
    return res.data;
  },
  async getById(id) {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },
};

export default teacherService;


