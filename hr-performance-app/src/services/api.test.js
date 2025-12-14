import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError, authApi, usersApi, reviewsApi, adminApi, analyticsApi, calibrationApi } from './api';

describe('ApiClient', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    apiClient.accessToken = null;
    apiClient.onUnauthorized = null;
    apiClient.useMockData = false;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('setAccessToken', () => {
    it('should set the access token', () => {
      apiClient.setAccessToken('test-token');
      expect(apiClient.accessToken).toBe('test-token');
    });

    it('should clear the access token when set to null', () => {
      apiClient.setAccessToken('test-token');
      apiClient.setAccessToken(null);
      expect(apiClient.accessToken).toBe(null);
    });
  });

  describe('setOnUnauthorized', () => {
    it('should set the unauthorized callback', () => {
      const callback = vi.fn();
      apiClient.setOnUnauthorized(callback);
      expect(apiClient.onUnauthorized).toBe(callback);
    });
  });

  describe('getHeaders', () => {
    it('should return default headers without token', () => {
      apiClient.accessToken = null;
      const headers = apiClient.getHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should include Authorization header when token is set', () => {
      apiClient.setAccessToken('my-token');
      const headers = apiClient.getHeaders();

      expect(headers['Authorization']).toBe('Bearer my-token');
    });

    it('should merge custom headers', () => {
      const headers = apiClient.getHeaders({ 'X-Custom': 'value' });

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Custom']).toBe('value');
    });
  });

  describe('handleResponse', () => {
    it('should parse JSON response for successful request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      };

      const result = await apiClient.handleResponse(mockResponse);
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for 204 No Content', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
      };

      const result = await apiClient.handleResponse(mockResponse);
      expect(result).toBe(null);
    });

    it('should throw ApiError for non-ok response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: { message: 'Bad request', details: 'Invalid data' },
        }),
      };

      await expect(apiClient.handleResponse(mockResponse)).rejects.toThrow(ApiError);
    });

    it('should call onUnauthorized for 401 response', async () => {
      const onUnauthorized = vi.fn();
      apiClient.setOnUnauthorized(onUnauthorized);

      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: { message: 'Unauthorized' } }),
      };

      await expect(apiClient.handleResponse(mockResponse)).rejects.toThrow('Unauthorized');
      expect(onUnauthorized).toHaveBeenCalled();
    });

    it('should extract error message from response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          error: { message: 'Server error', details: { field: 'error' } },
        }),
      };

      try {
        await apiClient.handleResponse(mockResponse);
      } catch (err) {
        expect(err.message).toBe('Server error');
        expect(err.status).toBe(500);
        expect(err.details).toEqual({ field: 'error' });
      }
    });
  });

  describe('get', () => {
    it('should make GET request with correct URL', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await apiClient.get('/test-endpoint');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should include query parameters', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await apiClient.get('/test', { page: 1, limit: 10 });

      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=10');
    });

    it('should filter out undefined and null params', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await apiClient.get('/test', { valid: 'yes', empty: undefined, nothing: null });

      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('valid=yes');
      expect(calledUrl).not.toContain('empty');
      expect(calledUrl).not.toContain('nothing');
    });

    it('should include Authorization header when token is set', async () => {
      apiClient.setAccessToken('bearer-token');

      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer bearer-token',
          }),
        })
      );
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 1 }),
      });

      const body = { name: 'Test' };
      await apiClient.post('/test', body);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('should return created resource', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 'new-id', name: 'Created' }),
      });

      const result = await apiClient.post('/test', { name: 'Created' });
      expect(result).toEqual({ id: 'new-id', name: 'Created' });
    });
  });

  describe('patch', () => {
    it('should make PATCH request with body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ updated: true }),
      });

      const body = { name: 'Updated' };
      await apiClient.patch('/test/1', body);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('put', () => {
    it('should make PUT request with body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ replaced: true }),
      });

      const body = { name: 'Replaced' };
      await apiClient.put('/test/1', body);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 204,
      });

      await apiClient.delete('/test/1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('dev mode mock data', () => {
    beforeEach(() => {
      apiClient.useMockData = true;
    });

    afterEach(() => {
      apiClient.useMockData = false;
    });

    it('should return mock data on fetch failure', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch.mockRejectedValue(new Error('Failed to fetch'));

      const result = await apiClient.get('/reviews');

      expect(result).toHaveProperty('reviews');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DevMode]'));

      consoleSpy.mockRestore();
    });

    it('should return mock data for users/me endpoint', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch.mockRejectedValue(new Error('Failed to fetch'));

      const result = await apiClient.get('/users/me');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('displayName');

      consoleSpy.mockRestore();
    });

    it('should return mock data for calibration sessions', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch.mockRejectedValue(new Error('Failed to fetch'));

      const result = await apiClient.get('/calibration/sessions');

      expect(result).toHaveProperty('sessions');

      consoleSpy.mockRestore();
    });

    it('should return mock success for POST on fetch failure', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch.mockRejectedValue(new Error('Failed to fetch'));

      const result = await apiClient.post('/test', { name: 'Test' });

      expect(result.success).toBe(true);
      expect(result.name).toBe('Test');

      consoleSpy.mockRestore();
    });
  });

  describe('getMockData', () => {
    it('should return reviews for reviews endpoint', () => {
      const result = apiClient.getMockData('/reviews');
      expect(result.reviews).toBeDefined();
      expect(Array.isArray(result.reviews)).toBe(true);
    });

    it('should return user for users/me endpoint', () => {
      const result = apiClient.getMockData('/users/me');
      expect(result).toHaveProperty('id');
    });

    it('should return teamMembers for team endpoint', () => {
      const result = apiClient.getMockData('/users/123/team');
      expect(result.teamMembers).toBeDefined();
    });

    it('should return functionTitles for function-titles endpoint', () => {
      const result = apiClient.getMockData('/function-titles');
      expect(result.functionTitles).toBeDefined();
    });

    it('should return tovLevels for tov-levels endpoint', () => {
      const result = apiClient.getMockData('/tov-levels');
      expect(result.tovLevels).toBeDefined();
    });

    it('should return analytics data for 9grid endpoint', () => {
      const result = apiClient.getMockData('/analytics/9grid');
      expect(result).toHaveProperty('grid');
      expect(result).toHaveProperty('stats');
    });

    it('should return empty object for unknown endpoint', () => {
      const result = apiClient.getMockData('/unknown/endpoint');
      expect(result).toEqual({});
    });
  });
});

describe('ApiError', () => {
  it('should create error with message and status', () => {
    const error = new ApiError('Test error', 400);

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.name).toBe('ApiError');
  });

  it('should include details when provided', () => {
    const error = new ApiError('Test error', 400, { field: 'validation error' });

    expect(error.details).toEqual({ field: 'validation error' });
  });

  it('should default details to null', () => {
    const error = new ApiError('Test error', 400);
    expect(error.details).toBe(null);
  });

  it('should spread extra fields onto the error instance', () => {
    const error = new ApiError('Cannot delete', 400, null, {
      userCount: 5,
      users: [{ id: '1', name: 'John' }],
    });

    expect(error.userCount).toBe(5);
    expect(error.users).toEqual([{ id: '1', name: 'John' }]);
  });

  it('should handle empty extra object', () => {
    const error = new ApiError('Test error', 400, null, {});

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
  });

  it('should default extra to empty object', () => {
    const error = new ApiError('Test error', 400, null);

    expect(error.message).toBe('Test error');
    // Should not throw when extra is undefined
  });

  it('should filter out dangerous keys to prevent prototype pollution', () => {
    const error = new ApiError('Test error', 400, null, {
      __proto__: { malicious: true },
      constructor: 'bad',
      prototype: {},
      userCount: 3,
    });

    expect(error.userCount).toBe(3);
    expect(error.malicious).toBeUndefined();
    expect(error.name).toBe('ApiError'); // Not overwritten
  });

  it('should not allow overwriting core Error properties', () => {
    const error = new ApiError('Original message', 400, { original: true }, {
      message: 'Overwritten message',
      status: 999,
      details: { overwritten: true },
      name: 'HackedError',
      stack: 'fake stack',
    });

    expect(error.message).toBe('Original message');
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ original: true });
    expect(error.name).toBe('ApiError');
  });
});

describe('API Endpoint Objects', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
  });

  describe('authApi', () => {
    it('should have getMe method', async () => {
      await authApi.getMe();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me'),
        expect.any(Object)
      );
    });
  });

  describe('usersApi', () => {
    it('should have list method', async () => {
      await usersApi.list({ role: 'MANAGER' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.any(Object)
      );
    });

    it('should have getById method', async () => {
      await usersApi.getById('user-123');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123'),
        expect.any(Object)
      );
    });

    it('should have create method', async () => {
      await usersApi.create({ email: 'test@example.com' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should have update method', async () => {
      await usersApi.update('user-123', { displayName: 'New Name' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should have delete method', async () => {
      await usersApi.delete('user-123');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('reviewsApi', () => {
    it('should have list method', async () => {
      await reviewsApi.list({ year: 2024 });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews'),
        expect.any(Object)
      );
    });

    it('should have getById method', async () => {
      await reviewsApi.getById('review-1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1'),
        expect.any(Object)
      );
    });

    it('should have create method', async () => {
      await reviewsApi.create({ employeeId: 'emp-1' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should have update method', async () => {
      await reviewsApi.update('review-1', { summary: 'Updated' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should have startStage method', async () => {
      await reviewsApi.startStage('review-1', 'MID_YEAR_REVIEW');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/stages/MID_YEAR_REVIEW/start'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should have completeStage method', async () => {
      await reviewsApi.completeStage('review-1', 'MID_YEAR_REVIEW');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/stages/MID_YEAR_REVIEW/complete'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should have getGoals method', async () => {
      await reviewsApi.getGoals('review-1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/goals'),
        expect.any(Object)
      );
    });

    it('should have addGoal method', async () => {
      await reviewsApi.addGoal('review-1', { title: 'New Goal' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/goals'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should have updateGoal method', async () => {
      await reviewsApi.updateGoal('review-1', 'goal-1', { title: 'Updated' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/goals/goal-1'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should have deleteGoal method', async () => {
      await reviewsApi.deleteGoal('review-1', 'goal-1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/goals/goal-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should have reorderGoals method', async () => {
      await reviewsApi.reorderGoals('review-1', ['goal-2', 'goal-1']);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/goals/reorder'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should have getCompetencies method', async () => {
      await reviewsApi.getCompetencies('review-1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/competencies'),
        expect.any(Object)
      );
    });

    it('should have updateCompetencyScore method', async () => {
      await reviewsApi.updateCompetencyScore('review-1', 'score-1', { scoreMidYear: 3 });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/review-1/competencies/score-1'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('adminApi', () => {
    it('should have getFunctionTitles method', async () => {
      await adminApi.getFunctionTitles();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/function-titles'),
        expect.any(Object)
      );
    });

    it('should have getTovLevels method', async () => {
      await adminApi.getTovLevels();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/tov-levels'),
        expect.any(Object)
      );
    });

    it('should have getCompetencies method', async () => {
      await adminApi.getCompetencies({ tovLevelId: 'tov-1' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/competencies'),
        expect.any(Object)
      );
    });
  });

  describe('analyticsApi', () => {
    it('should have get9Grid method', async () => {
      await analyticsApi.get9Grid({ year: 2024 });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/analytics/9grid'),
        expect.any(Object)
      );
    });

    it('should have getGridEmployees method', async () => {
      await analyticsApi.getGridEmployees('B2', { year: 2024 });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/analytics/9grid/B2/employees'),
        expect.any(Object)
      );
    });

    it('should have getTrends method', async () => {
      await analyticsApi.getTrends();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/analytics/9grid/trends'),
        expect.any(Object)
      );
    });
  });

  describe('calibrationApi', () => {
    it('should have getSessions method', async () => {
      await calibrationApi.getSessions();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calibration/sessions'),
        expect.any(Object)
      );
    });

    it('should have getSession method', async () => {
      await calibrationApi.getSession('session-1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calibration/sessions/session-1'),
        expect.any(Object)
      );
    });

    it('should have createSession method', async () => {
      await calibrationApi.createSession({ name: 'New Session' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calibration/sessions'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should have getItems method', async () => {
      await calibrationApi.getItems('session-1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calibration/sessions/session-1/items'),
        expect.any(Object)
      );
    });

    it('should have adjustItem method', async () => {
      await calibrationApi.adjustItem('session-1', 'item-1', { whatScore: 2.5 });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calibration/sessions/session-1/items/item-1'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should have getDistribution method', async () => {
      await calibrationApi.getDistribution('session-1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calibration/sessions/session-1/distribution'),
        expect.any(Object)
      );
    });
  });
});
