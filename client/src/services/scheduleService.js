import { apiClient } from './authService';

const BASE = '/schedules';

const scheduleService = {
  async getAll(params = {}) {
    // Server exposes /schedules/all returning { schedules: [], count }
    const res = await apiClient.get(`${BASE}/all`, { params });
    return res.data;
  },
  async getConflicts(params = {}) {
    const res = await apiClient.get(`${BASE}/conflicts`, { params });
    return res.data;
  },
  async getPersonalSchedule() {
    const res = await apiClient.get(`${BASE}/my`);
    return res.data;
  },
  async seedDatabase() {
    const res = await apiClient.post(`${BASE}/seed`);
    return res.data;
  },
};

export default scheduleService;


