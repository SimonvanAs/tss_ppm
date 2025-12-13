/**
 * API Client with automatic token injection and error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Check if we're in dev mode without backend
const isDevMode = import.meta.env.VITE_AUTH_ENABLED === 'false';

// Mock data for dev mode
const MOCK_DATA = {
  reviews: [
    {
      id: 'mock-review-1',
      year: 2024,
      status: 'END_YEAR_REVIEW',
      whatScoreEndYear: 2.35,
      howScoreEndYear: 2.50,
      whatScoreMidYear: 2.20,
      howScoreMidYear: 2.30,
      updatedAt: new Date().toISOString(),
      employee: { firstName: 'Current', lastName: 'User' },
    },
    {
      id: 'mock-review-2',
      year: 2023,
      status: 'COMPLETED',
      whatScoreEndYear: 2.65,
      howScoreEndYear: 2.80,
      whatScoreMidYear: 2.50,
      howScoreMidYear: 2.60,
      updatedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      employee: { firstName: 'Current', lastName: 'User' },
    },
  ],
  teamMembers: [
    {
      id: 'mock-emp-1',
      displayName: 'Alice Johnson',
      email: 'alice@example.com',
      functionTitle: { name: 'Software Engineer' },
      tovLevel: { code: 'B', name: 'Professional' },
      currentReview: {
        id: 'mock-team-review-1',
        year: 2024,
        status: 'END_YEAR_REVIEW',
        whatScoreEndYear: 2.80,
        howScoreEndYear: 2.65,
      },
    },
    {
      id: 'mock-emp-2',
      displayName: 'Bob Smith',
      email: 'bob@example.com',
      functionTitle: { name: 'Senior Developer' },
      tovLevel: { code: 'C', name: 'Senior' },
      currentReview: {
        id: 'mock-team-review-2',
        year: 2024,
        status: 'MID_YEAR_COMPLETE',
        whatScoreMidYear: 2.40,
        howScoreMidYear: 2.55,
      },
    },
    {
      id: 'mock-emp-3',
      displayName: 'Carol Davis',
      email: 'carol@example.com',
      functionTitle: { name: 'Product Manager' },
      tovLevel: { code: 'C', name: 'Senior' },
      currentReview: null,
    },
  ],
  calibrationSessions: [
    {
      id: 'mock-cal-1',
      name: 'Q4 2024 End-Year Calibration',
      year: 2024,
      status: 'IN_PROGRESS',
      scope: 'BUSINESS_UNIT',
      businessUnit: { name: 'Engineering' },
      itemCount: 15,
      createdBy: 'HR Manager',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    },
    {
      id: 'mock-cal-2',
      name: 'Q4 2023 Calibration',
      year: 2023,
      status: 'COMPLETED',
      scope: 'COMPANY',
      businessUnit: null,
      itemCount: 42,
      createdBy: 'HR Director',
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 350 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  calibrationItems: [
    {
      id: 'mock-item-1',
      employee: { name: 'Alice Johnson', functionTitle: 'Software Engineer', businessUnit: 'Engineering', manager: 'Michael Manager' },
      original: { whatScore: 2.80, howScore: 2.65, gridPos: 'B2' },
      calibrated: null,
      isAdjusted: false,
      flaggedForReview: false,
    },
    {
      id: 'mock-item-2',
      employee: { name: 'Bob Smith', functionTitle: 'Senior Developer', businessUnit: 'Engineering', manager: 'Michael Manager' },
      original: { whatScore: 2.40, howScore: 2.55, gridPos: 'B2' },
      calibrated: { whatScore: 2.60, howScore: 2.55, gridPos: 'B2' },
      isAdjusted: true,
      adjustedBy: 'HR Manager',
      adjustedAt: new Date().toISOString(),
      adjustmentNotes: 'Adjusted based on Q4 project delivery',
      flaggedForReview: false,
    },
    {
      id: 'mock-item-3',
      employee: { name: 'David Lee', functionTitle: 'Junior Developer', businessUnit: 'Engineering', manager: 'Michael Manager' },
      original: { whatScore: 1.80, howScore: 2.20, gridPos: 'C2' },
      calibrated: null,
      isAdjusted: false,
      flaggedForReview: true,
      flagReason: 'First year employee - needs context',
    },
  ],
  functionTitles: [
    { id: 'ft-1', name: 'Software Engineer', description: 'Develops software applications', tovLevelId: 'tov-b', sortOrder: 1 },
    { id: 'ft-2', name: 'Senior Developer', description: 'Senior software developer', tovLevelId: 'tov-c', sortOrder: 2 },
    { id: 'ft-3', name: 'Tech Lead', description: 'Technical team lead', tovLevelId: 'tov-d', sortOrder: 3 },
    { id: 'ft-4', name: 'Product Manager', description: 'Manages product development', tovLevelId: 'tov-c', sortOrder: 4 },
  ],
  tovLevels: [
    { id: 'tov-a', code: 'A', name: 'Entry', description: 'Entry level position', sortOrder: 1 },
    { id: 'tov-b', code: 'B', name: 'Professional', description: 'Professional level', sortOrder: 2 },
    { id: 'tov-c', code: 'C', name: 'Senior', description: 'Senior level', sortOrder: 3 },
    { id: 'tov-d', code: 'D', name: 'Lead', description: 'Leadership level', sortOrder: 4 },
  ],
  businessUnits: [
    { id: 'bu-1', name: 'Engineering', description: 'Software Engineering' },
    { id: 'bu-2', name: 'Product', description: 'Product Management' },
    { id: 'bu-3', name: 'Sales', description: 'Sales Department' },
  ],
  users: [
    { id: 'user-1', displayName: 'Alice Johnson', email: 'alice@example.com', role: 'EMPLOYEE', functionTitle: { name: 'Software Engineer' }, tovLevel: { code: 'B' }, isActive: true },
    { id: 'user-2', displayName: 'Bob Smith', email: 'bob@example.com', role: 'EMPLOYEE', functionTitle: { name: 'Senior Developer' }, tovLevel: { code: 'C' }, isActive: true },
    { id: 'user-3', displayName: 'Carol Davis', email: 'carol@example.com', role: 'MANAGER', functionTitle: { name: 'Tech Lead' }, tovLevel: { code: 'D' }, isActive: true },
    { id: 'user-4', displayName: 'HR Admin', email: 'hr@example.com', role: 'HR', functionTitle: { name: 'HR Manager' }, tovLevel: { code: 'C' }, isActive: true },
  ],
  analytics9Grid: {
    grid: {
      'A1': { count: 1, percentage: 5 },
      'A2': { count: 2, percentage: 10 },
      'A3': { count: 3, percentage: 15 },
      'B1': { count: 2, percentage: 10 },
      'B2': { count: 6, percentage: 30 },
      'B3': { count: 2, percentage: 10 },
      'C1': { count: 1, percentage: 5 },
      'C2': { count: 2, percentage: 10 },
      'C3': { count: 1, percentage: 5 },
    },
    stats: {
      totalEmployees: 20,
      scoredEmployees: 20,
      avgWhat: 2.35,
      avgHow: 2.45,
      topTalentCount: 6,
      topTalentPercentage: 30,
    },
  },
};

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.accessToken = null;
    this.onUnauthorized = null;
    this.useMockData = isDevMode;
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

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return this.handleResponse(response);
    } catch (err) {
      // In dev mode without backend, return mock empty data
      if (this.useMockData && err.message === 'Failed to fetch') {
        console.warn(`[DevMode] API unavailable for GET ${endpoint}, returning mock data`);
        return this.getMockData(endpoint);
      }
      throw err;
    }
  }

  /**
   * Get mock data for dev mode when API is unavailable
   */
  getMockData(endpoint) {
    // Return appropriate mock data based on endpoint
    if (endpoint.includes('/reviews')) return { reviews: MOCK_DATA.reviews };
    if (endpoint.includes('/users/me')) return MOCK_DATA.users[0];
    if (endpoint.match(/\/users\/[^/]+\/team/)) return { teamMembers: MOCK_DATA.teamMembers };
    if (endpoint.includes('/users')) return { data: MOCK_DATA.users, pagination: { page: 1, limit: 50, total: MOCK_DATA.users.length, totalPages: 1 } };
    if (endpoint.match(/\/calibration\/sessions\/[^/]+\/items/)) return { items: MOCK_DATA.calibrationItems };
    if (endpoint.match(/\/calibration\/sessions\/[^/]+\/distribution/)) return {
      original: { tiers: { topTalent: 5, solidPerformer: 8, needsAttention: 4, concern: 3 } },
      calibrated: { tiers: { topTalent: 6, solidPerformer: 7, needsAttention: 5, concern: 2 } },
    };
    if (endpoint.match(/\/calibration\/sessions\/[^/]+\/anomalies/)) return {
      anomalies: [
        { managerId: 'm1', managerName: 'John Doe', type: 'HIGH_RATINGS', severity: 'warning', description: '45% of team rated as top talent (avg: 25%)' },
      ],
    };
    if (endpoint.match(/\/calibration\/sessions\/[^/]+\/comparison/)) return {
      managers: [
        { managerId: 'm1', managerName: 'Michael Manager', teamSize: 5, avgWhatScore: 2.45, avgHowScore: 2.55, topTalentPercentage: 20, concernPercentage: 10 },
        { managerId: 'm2', managerName: 'Sarah Senior', teamSize: 8, avgWhatScore: 2.65, avgHowScore: 2.70, topTalentPercentage: 35, concernPercentage: 5 },
      ],
      companyAverages: { whatScore: 2.40, howScore: 2.50 },
    };
    if (endpoint.match(/\/calibration\/sessions\/[^/]+$/)) return {
      ...MOCK_DATA.calibrationSessions[0],
      targetDistribution: { topTalent: 20, solid: 70, concern: 10 },
    };
    if (endpoint.includes('/calibration/sessions')) return { sessions: MOCK_DATA.calibrationSessions };
    if (endpoint.includes('/function-titles')) return { functionTitles: MOCK_DATA.functionTitles };
    if (endpoint.includes('/tov-levels')) return { tovLevels: MOCK_DATA.tovLevels };
    if (endpoint.includes('/competencies')) return { competencies: [] };
    if (endpoint.includes('/business-units')) return { businessUnits: MOCK_DATA.businessUnits };
    if (endpoint.includes('/opcos')) return { opcos: [{ id: 'opco-1', name: 'demo-opco', displayName: 'Demo OpCo', domain: 'example.com', isActive: true }] };
    if (endpoint.includes('/9grid')) return MOCK_DATA.analytics9Grid;
    if (endpoint.includes('/analytics')) return MOCK_DATA.analytics9Grid;
    return {};
  }

  /**
   * Make a POST request
   */
  async post(endpoint, body = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      return this.handleResponse(response);
    } catch (err) {
      if (this.useMockData && err.message === 'Failed to fetch') {
        console.warn(`[DevMode] API unavailable for POST ${endpoint}, returning mock success`);
        return { success: true, id: `mock-${Date.now()}`, ...body };
      }
      throw err;
    }
  }

  /**
   * Make a PATCH request
   */
  async patch(endpoint, body = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      return this.handleResponse(response);
    } catch (err) {
      if (this.useMockData && err.message === 'Failed to fetch') {
        console.warn(`[DevMode] API unavailable for PATCH ${endpoint}, returning mock success`);
        return { success: true, ...body };
      }
      throw err;
    }
  }

  /**
   * Make a PUT request
   */
  async put(endpoint, body = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      return this.handleResponse(response);
    } catch (err) {
      if (this.useMockData && err.message === 'Failed to fetch') {
        console.warn(`[DevMode] API unavailable for PUT ${endpoint}, returning mock success`);
        return { success: true, ...body };
      }
      throw err;
    }
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return this.handleResponse(response);
    } catch (err) {
      if (this.useMockData && err.message === 'Failed to fetch') {
        console.warn(`[DevMode] API unavailable for DELETE ${endpoint}, returning mock success`);
        return { success: true };
      }
      throw err;
    }
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

  // Signatures
  getSignatureStatus: (reviewId) => apiClient.get(`/reviews/${reviewId}/signature-status`),
  signAsEmployee: (reviewId, data) => apiClient.post(`/reviews/${reviewId}/sign/employee`, data),
  signAsManager: (reviewId, data) => apiClient.post(`/reviews/${reviewId}/sign/manager`, data),
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
  updateCompetency: (id, data) => apiClient.patch(`/admin/competencies/${id}`, data),
  deleteCompetency: (id) => apiClient.delete(`/admin/competencies/${id}`),

  // Users (admin view)
  getUsers: () => apiClient.get('/admin/users'),
  updateUser: (id, data) => apiClient.patch(`/admin/users/${id}`, data),

  // OpCos (super admin)
  getOpCos: () => apiClient.get('/admin/opcos'),
  createOpCo: (data) => apiClient.post('/admin/opcos', data),
  updateOpCo: (id, data) => apiClient.patch(`/admin/opcos/${id}`, data),

  // Business Units
  getBusinessUnits: () => apiClient.get('/admin/business-units'),
  createBusinessUnit: (data) => apiClient.post('/admin/business-units', data),
  updateBusinessUnit: (id, data) => apiClient.patch(`/admin/business-units/${id}`, data),
  deleteBusinessUnit: (id) => apiClient.delete(`/admin/business-units/${id}`),

  // Settings
  getSettings: (opcoId = null) => apiClient.get('/admin/settings', opcoId ? { opcoId } : {}),
  updateSettings: (data) => apiClient.patch('/admin/settings', data),
  updateBranding: (opcoId, data) => apiClient.patch('/admin/settings/branding', { opcoId, ...data }),
  uploadLogo: async (opcoId, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('opcoId', opcoId);

    const token = window.keycloak?.token;
    const response = await fetch(`${apiClient.baseURL}/admin/settings/logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to upload logo');
    }

    return response.json();
  },

  // Bulk review cycle creation (Start New Performance Year)
  bulkCreateReviewCycles: (data) => apiClient.post('/admin/review-cycles/bulk', data),
};

// Analytics
export const analyticsApi = {
  // 9-Grid analytics at different levels
  get9Grid: (params = {}) => apiClient.get('/analytics/9grid', params),

  // Drill-down: employees in a specific grid position
  getGridEmployees: (boxKey, params = {}) => apiClient.get(`/analytics/9grid/${boxKey}/employees`, params),

  // Historical trends
  getTrends: (params = {}) => apiClient.get('/analytics/9grid/trends', params),

  // Business units with analytics summary
  getBusinessUnitsSummary: (params = {}) => apiClient.get('/analytics/business-units', params),
};

// Calibration
export const calibrationApi = {
  // Sessions
  getSessions: (params = {}) => apiClient.get('/calibration/sessions', params),
  getSession: (id) => apiClient.get(`/calibration/sessions/${id}`),
  createSession: (data) => apiClient.post('/calibration/sessions', data),
  updateSession: (id, data) => apiClient.patch(`/calibration/sessions/${id}`, data),
  deleteSession: (id) => apiClient.delete(`/calibration/sessions/${id}`),
  startSession: (id) => apiClient.post(`/calibration/sessions/${id}/start`),
  completeSession: (id, data = {}) => apiClient.post(`/calibration/sessions/${id}/complete`, data),

  // Items
  getItems: (sessionId, params = {}) => apiClient.get(`/calibration/sessions/${sessionId}/items`, params),
  adjustItem: (sessionId, itemId, data) => apiClient.patch(`/calibration/sessions/${sessionId}/items/${itemId}`, data),
  flagItem: (sessionId, itemId, data) => apiClient.post(`/calibration/sessions/${sessionId}/items/${itemId}/flag`, data),

  // Analytics
  getDistribution: (sessionId) => apiClient.get(`/calibration/sessions/${sessionId}/distribution`),
  getComparison: (sessionId) => apiClient.get(`/calibration/sessions/${sessionId}/comparison`),
  getAnomalies: (sessionId) => apiClient.get(`/calibration/sessions/${sessionId}/anomalies`),

  // Participants
  addParticipant: (sessionId, data) => apiClient.post(`/calibration/sessions/${sessionId}/participants`, data),
  removeParticipant: (sessionId, userId) => apiClient.delete(`/calibration/sessions/${sessionId}/participants/${userId}`),
};

export default apiClient;
