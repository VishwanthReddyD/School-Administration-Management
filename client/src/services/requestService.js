import { apiClient } from './authService';

// Base path relative to apiClient's baseURL (which already includes /api)
const API_BASE_URL = '/requests';

class RequestService {
  // Get all teacher requests (for Principal/Super Admin)
  async getAllRequests(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }
      if (filters.type && filters.type !== 'all') {
        queryParams.append('type', filters.type);
      }
      if (filters.priority && filters.priority !== 'all') {
        queryParams.append('priority', filters.priority);
      }
      if (filters.teacher_id) {
        queryParams.append('teacher_id', filters.teacher_id);
      }
      
      const url = `${API_BASE_URL}?${queryParams.toString()}`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching requests:', error);
      throw error;
    }
  }

  // Get teacher's own requests (for Teachers)
  async getMyRequests() {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/my-requests`);
      return response.data;
    } catch (error) {
      console.error('Error fetching my requests:', error);
      throw error;
    }
  }

  // Create new request
  async createRequest(requestData) {
    try {
      const response = await apiClient.post(API_BASE_URL, requestData);
      return response.data;
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  }

  // Update request status (approve/reject)
  async updateRequestStatus(requestId, status, notes = '') {
    try {
      const response = await apiClient.put(`${API_BASE_URL}/${requestId}/status`, {
        status,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  }

  // Update request details
  async updateRequest(requestId, updateData) {
    try {
      const response = await apiClient.put(`${API_BASE_URL}/${requestId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  }

  // Delete request
  async deleteRequest(requestId) {
    try {
      const response = await apiClient.delete(`${API_BASE_URL}/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting request:', error);
      throw error;
    }
  }

  // Get request statistics
  async getRequestStats() {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching request stats:', error);
      throw error;
    }
  }

  // Bulk approve/reject requests
  async bulkUpdateRequests(requestIds, status, notes = '') {
    try {
      const promises = requestIds.map(id => 
        this.updateRequestStatus(id, status, notes)
      );
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Error bulk updating requests:', error);
      throw error;
    }
  }
}

export default new RequestService();

