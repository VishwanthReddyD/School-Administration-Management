import { apiClient } from './authService';

const BASE = '/superadmin';

export const superAdminService = {
  async getAllUsers(params = {}) {
    const res = await apiClient.get(`${BASE}/users`, { params });
    return res.data;
  },
};

export default superAdminService;
