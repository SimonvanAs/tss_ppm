import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, useRequireAuth } from './AuthContext';
import { UserRole, hasMinimumRole, hasAnyRole, roleHierarchy } from '../config/auth';

// Mock keycloak-js
vi.mock('keycloak-js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(true),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      updateToken: vi.fn().mockResolvedValue(true),
      token: 'mock-token',
      tokenParsed: {
        sub: 'keycloak-user-id',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
        name: 'Test User',
        realm_access: { roles: ['manager'] },
        resource_access: {},
      },
    })),
  };
});

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    setAccessToken: vi.fn(),
    setOnUnauthorized: vi.fn(),
  },
  authApi: {
    getMe: vi.fn().mockResolvedValue({
      id: 'db-user-id',
      role: 'MANAGER',
      opcoId: 'test-opco',
      opco: { id: 'test-opco', name: 'Test OpCo' },
      directReports: [],
    }),
  },
}));

// Mock auth config for dev mode tests
vi.mock('../config/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authConfig: {
      ...actual.authConfig,
      features: {
        enabled: false, // Dev mode by default
        allowAnonymous: true,
      },
      keycloak: {
        url: 'http://localhost:8080',
        realm: 'test-realm',
        clientId: 'test-client',
      },
      tokenRefreshInterval: 60000,
      minTokenValidity: 70,
    },
  };
});

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth context when used within AuthProvider', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });
  });

  describe('Dev mode initialization', () => {
    it('should initialize with mock user in dev mode', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(result.current.isDevMode).toBe(true);
    });

    it('should provide availableRoles in dev mode', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availableRoles).toEqual(
        expect.arrayContaining(['EMPLOYEE', 'MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'])
      );
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the exact role', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Dev mode user is TSS_SUPER_ADMIN by default
      expect(result.current.hasRole('TSS_SUPER_ADMIN')).toBe(true);
    });

    it('should return true when role is in user roles array', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // TSS_SUPER_ADMIN has all roles in the roles array
      expect(result.current.hasRole('manager')).toBe(true);
    });

    it('should return false when user does not have the role', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to employee role first
      act(() => {
        result.current.switchDevRole('EMPLOYEE');
      });

      expect(result.current.hasRole('TSS_SUPER_ADMIN')).toBe(false);
    });
  });

  describe('hasMinRole', () => {
    it('should return true when user has higher role than required', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // TSS_SUPER_ADMIN is higher than EMPLOYEE
      expect(result.current.hasMinRole('EMPLOYEE')).toBe(true);
      expect(result.current.hasMinRole('MANAGER')).toBe(true);
      expect(result.current.hasMinRole('HR')).toBe(true);
    });

    it('should return true when user has exact required role', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMinRole('TSS_SUPER_ADMIN')).toBe(true);
    });

    it('should return false when user has lower role than required', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to employee role
      act(() => {
        result.current.switchDevRole('EMPLOYEE');
      });

      expect(result.current.hasMinRole('MANAGER')).toBe(false);
      expect(result.current.hasMinRole('HR')).toBe(false);
    });
  });

  describe('hasRoles', () => {
    it('should return true when user role is in allowed roles', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRoles(['MANAGER', 'TSS_SUPER_ADMIN'])).toBe(true);
    });

    it('should return false when user role is not in allowed roles', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to employee role
      act(() => {
        result.current.switchDevRole('EMPLOYEE');
      });

      expect(result.current.hasRoles(['MANAGER', 'HR'])).toBe(false);
    });
  });

  describe('isManagerOf', () => {
    it('should return true when user is manager of given user', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to manager role which has direct reports
      act(() => {
        result.current.switchDevRole('MANAGER');
      });

      expect(result.current.isManagerOf('dev-employee-id')).toBe(true);
    });

    it('should return false when user is not manager of given user', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to employee role (no direct reports)
      act(() => {
        result.current.switchDevRole('EMPLOYEE');
      });

      expect(result.current.isManagerOf('some-other-user')).toBe(false);
    });
  });

  describe('switchDevRole', () => {
    it('should switch user role in dev mode', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initially TSS_SUPER_ADMIN
      expect(result.current.user.role).toBe('TSS_SUPER_ADMIN');

      // Switch to EMPLOYEE
      act(() => {
        result.current.switchDevRole('EMPLOYEE');
      });

      expect(result.current.user.role).toBe('EMPLOYEE');
      expect(result.current.user.displayName).toBe('Emma Employee');
    });

    it('should not switch to invalid role', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalRole = result.current.user.role;

      act(() => {
        result.current.switchDevRole('INVALID_ROLE');
      });

      // Role should not change
      expect(result.current.user.role).toBe(originalRole);
      expect(consoleSpy).toHaveBeenCalledWith('[Auth] Invalid role:', 'INVALID_ROLE');

      consoleSpy.mockRestore();
    });
  });

  describe('logout', () => {
    it('should clear user state in dev mode', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });

  describe('getAccessToken', () => {
    it('should return null in dev mode (no keycloak)', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const token = await result.current.getAccessToken();
      expect(token).toBe(null);
    });
  });
});

describe('auth config helpers', () => {
  describe('UserRole', () => {
    it('should define all role constants', () => {
      expect(UserRole.EMPLOYEE).toBe('EMPLOYEE');
      expect(UserRole.MANAGER).toBe('MANAGER');
      expect(UserRole.HR).toBe('HR');
      expect(UserRole.OPCO_ADMIN).toBe('OPCO_ADMIN');
      expect(UserRole.TSS_SUPER_ADMIN).toBe('TSS_SUPER_ADMIN');
    });
  });

  describe('roleHierarchy', () => {
    it('should have correct hierarchy levels', () => {
      expect(roleHierarchy[UserRole.EMPLOYEE]).toBe(1);
      expect(roleHierarchy[UserRole.MANAGER]).toBe(2);
      expect(roleHierarchy[UserRole.HR]).toBe(3);
      expect(roleHierarchy[UserRole.OPCO_ADMIN]).toBe(4);
      expect(roleHierarchy[UserRole.TSS_SUPER_ADMIN]).toBe(5);
    });
  });

  describe('hasMinimumRole', () => {
    it('should return true for equal roles', () => {
      expect(hasMinimumRole('MANAGER', 'MANAGER')).toBe(true);
    });

    it('should return true for higher roles', () => {
      expect(hasMinimumRole('TSS_SUPER_ADMIN', 'EMPLOYEE')).toBe(true);
      expect(hasMinimumRole('HR', 'MANAGER')).toBe(true);
    });

    it('should return false for lower roles', () => {
      expect(hasMinimumRole('EMPLOYEE', 'MANAGER')).toBe(false);
      expect(hasMinimumRole('MANAGER', 'HR')).toBe(false);
    });

    it('should handle unknown roles', () => {
      expect(hasMinimumRole('UNKNOWN', 'EMPLOYEE')).toBe(false);
      expect(hasMinimumRole('MANAGER', 'UNKNOWN')).toBe(true);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when role is in list', () => {
      expect(hasAnyRole('MANAGER', ['EMPLOYEE', 'MANAGER'])).toBe(true);
    });

    it('should return false when role is not in list', () => {
      expect(hasAnyRole('HR', ['EMPLOYEE', 'MANAGER'])).toBe(false);
    });

    it('should return false for empty list', () => {
      expect(hasAnyRole('MANAGER', [])).toBe(false);
    });
  });
});

describe('useRequireAuth', () => {
  it('should return auth state', async () => {
    const { result } = renderHook(() => useRequireAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
