/**
 * API Client with automatic token injection and error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.accessToken = null;
    this.onUnauthorized = null;
  }

  /**
   * Set the access token for authenticated requests
   */
  setAccessToken(token) {
    this.accessToken = token;
  }

  /**
   * Set callback for unauthorized responses (401)
   */
  setOnUnauthorized(callback) {
    this.onUnauthorized = callback;
  }

  /**
   * Build headers for requests
   */
  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    if (response.status === 401) {
      if (this.onUnauthorized) {
        this.onUnauthorized();
      }
      throw new ApiError('Unauthorized', 401);
    }

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || 'An error occurred',
        response.status,
        data.error?.details
      );
    }

    return data;
  }

  /**
   * Make a GET request
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  /**
   * Make a POST request
   */
  async post(endpoint, body = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    return this.handleResponse(response);
  }

  /**
   * Make a PATCH request
   */
  async patch(endpoint, body = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    return this.handleResponse(response);
  }

  /**
   * Make a PUT request
   */
  async put(endpoint, body = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    return this.handleResponse(response);
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// ===========================================
// API METHODS
// ===========================================

// Auth
export const authApi = {
  getMe: () => apiClient.get('/users/me'),
};

// Users
export const usersApi = {
  list: (params = {}) => apiClient.get('/users', params),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.patch(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
  getReviews: (id, params = {}) => apiClient.get(`/users/${id}/reviews`, params),
  getManagers: () => apiClient.get('/users/managers'),
};

// Reviews
export const reviewsApi = {
  list: (params = {}) => apiClient.get('/reviews', params),
  getById: (id) => apiClient.get(`/reviews/${id}`),
  create: (data) => apiClient.post('/reviews', data),
  update: (id, data) => apiClient.patch(`/reviews/${id}`, data),

  // Stage transitions
  startStage: (reviewId, stage) => apiClient.post(`/reviews/${reviewId}/stages/${stage}/start`),
  completeStage: (reviewId, stage, data = {}) => apiClient.post(`/reviews/${reviewId}/stages/${stage}/complete`, data),

  // Goals
  getGoals: (reviewId) => apiClient.get(`/reviews/${reviewId}/goals`),
  addGoal: (reviewId, data) => apiClient.post(`/reviews/${reviewId}/goals`, data),
  updateGoal: (reviewId, goalId, data) => apiClient.patch(`/reviews/${reviewId}/goals/${goalId}`, data),
  deleteGoal: (reviewId, goalId) => apiClient.delete(`/reviews/${reviewId}/goals/${goalId}`),
  reorderGoals: (reviewId, goalIds) => apiClient.post(`/reviews/${reviewId}/goals/reorder`, { goalIds }),

  // Competencies
  getCompetencies: (reviewId) => apiClient.get(`/reviews/${reviewId}/competencies`),
  updateCompetencyScore: (reviewId, scoreId, data) => apiClient.patch(`/reviews/${reviewId}/competencies/${scoreId}`, data),

  // Change requests
  getChangeRequests: (reviewId) => apiClient.get(`/reviews/${reviewId}/change-requests`),
  createChangeRequest: (reviewId, data) => apiClient.post(`/reviews/${reviewId}/change-requests`, data),
  approveChangeRequest: (reviewId, requestId, data = {}) => apiClient.post(`/reviews/${reviewId}/change-requests/${requestId}/approve`, data),
  rejectChangeRequest: (reviewId, requestId, data = {}) => apiClient.post(`/reviews/${reviewId}/change-requests/${requestId}/reject`, data),
};

// Admin
export const adminApi = {
  // Function titles
  getFunctionTitles: () => apiClient.get('/admin/function-titles'),
  createFunctionTitle: (data) => apiClient.post('/admin/function-titles', data),
  updateFunctionTitle: (id, data) => apiClient.patch(`/admin/function-titles/${id}`, data),
  deleteFunctionTitle: (id) => apiClient.delete(`/admin/function-titles/${id}`),

  // TOV Levels
  getTovLevels: () => apiClient.get('/admin/tov-levels'),
  createTovLevel: (data) => apiClient.post('/admin/tov-levels', data),
  updateTovLevel: (id, data) => apiClient.patch(`/admin/tov-levels/${id}`, data),

  // Competencies
  getCompetencies: (params = {}) => apiClient.get('/admin/competencies', params),
  createCompetency: (data) => apiClient.post('/admin/competencies', data),

  // Users (admin view)
  getUsers: () => apiClient.get('/admin/users'),
  updateUser: (id, data) => apiClient.patch(`/admin/users/${id}`, data),

  // OpCos (super admin)
  getOpCos: () => apiClient.get('/admin/opcos'),
  createOpCo: (data) => apiClient.post('/admin/opcos', data),
  updateOpCo: (id, data) => apiClient.patch(`/admin/opcos/${id}`, data),
};

export default apiClient;
