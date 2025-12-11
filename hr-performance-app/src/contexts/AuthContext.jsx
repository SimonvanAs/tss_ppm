import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Keycloak from 'keycloak-js';
import { authConfig, UserRole, hasMinimumRole, hasAnyRole } from '../config/auth';
import { apiClient, authApi } from '../services/api';

const AuthContext = createContext(null);

// Initial auth state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
  keycloak: null,
};

/**
 * Map Keycloak token to user object
 */
function mapKeycloakUser(keycloak, dbUser = null) {
  if (!keycloak.tokenParsed) return null;

  const token = keycloak.tokenParsed;
  const realmRoles = token.realm_access?.roles || [];
  const clientRoles = token.resource_access?.[authConfig.keycloak.clientId]?.roles || [];
  const allRoles = [...new Set([...realmRoles, ...clientRoles])];

  // Map Keycloak roles to app roles
  let role = UserRole.EMPLOYEE;
  const normalizedRoles = allRoles.map(r => r.toLowerCase());
  if (normalizedRoles.includes('tss-super-admin')) role = UserRole.TSS_SUPER_ADMIN;
  else if (normalizedRoles.includes('opco-admin')) role = UserRole.OPCO_ADMIN;
  else if (normalizedRoles.includes('hr')) role = UserRole.HR;
  else if (normalizedRoles.includes('manager')) role = UserRole.MANAGER;

  return {
    id: dbUser?.id,
    keycloakId: token.sub,
    email: token.email || token.preferred_username,
    firstName: token.given_name || '',
    lastName: token.family_name || '',
    displayName: token.name || `${token.given_name || ''} ${token.family_name || ''}`.trim(),
    role: dbUser?.role || role,
    roles: allRoles,
    opcoId: dbUser?.opcoId || token.opco_id,
    opco: dbUser?.opco,
    functionTitle: dbUser?.functionTitle,
    tovLevel: dbUser?.tovLevel,
    manager: dbUser?.manager,
    directReports: dbUser?.directReports || [],
  };
}

/**
 * Development mode mock users for each role
 */
const mockUsers = {
  [UserRole.EMPLOYEE]: {
    id: 'dev-employee-id',
    keycloakId: 'dev-keycloak-employee',
    email: 'employee@example.com',
    firstName: 'Emma',
    lastName: 'Employee',
    displayName: 'Emma Employee',
    role: UserRole.EMPLOYEE,
    roles: ['employee'],
    opcoId: 'dev-opco-id',
    opco: { id: 'dev-opco-id', name: 'development', displayName: 'Development OpCo' },
    directReports: [],
  },
  [UserRole.MANAGER]: {
    id: 'dev-manager-id',
    keycloakId: 'dev-keycloak-manager',
    email: 'manager@example.com',
    firstName: 'Michael',
    lastName: 'Manager',
    displayName: 'Michael Manager',
    role: UserRole.MANAGER,
    roles: ['manager', 'employee'],
    opcoId: 'dev-opco-id',
    opco: { id: 'dev-opco-id', name: 'development', displayName: 'Development OpCo' },
    directReports: [
      { id: 'dev-employee-id', displayName: 'Emma Employee' },
      { id: 'dev-employee-2', displayName: 'Eric Engineer' },
    ],
  },
  [UserRole.HR]: {
    id: 'dev-hr-id',
    keycloakId: 'dev-keycloak-hr',
    email: 'hr@example.com',
    firstName: 'Hannah',
    lastName: 'HR',
    displayName: 'Hannah HR',
    role: UserRole.HR,
    roles: ['hr', 'manager', 'employee'],
    opcoId: 'dev-opco-id',
    opco: { id: 'dev-opco-id', name: 'development', displayName: 'Development OpCo' },
    directReports: [],
  },
  [UserRole.OPCO_ADMIN]: {
    id: 'dev-opco-admin-id',
    keycloakId: 'dev-keycloak-opco-admin',
    email: 'opco-admin@example.com',
    firstName: 'Oliver',
    lastName: 'OpCo Admin',
    displayName: 'Oliver OpCo Admin',
    role: UserRole.OPCO_ADMIN,
    roles: ['opco-admin', 'hr', 'manager', 'employee'],
    opcoId: 'dev-opco-id',
    opco: { id: 'dev-opco-id', name: 'development', displayName: 'Development OpCo' },
    directReports: [],
  },
  [UserRole.TSS_SUPER_ADMIN]: {
    id: 'dev-super-admin-id',
    keycloakId: 'dev-keycloak-super-admin',
    email: 'super-admin@example.com',
    firstName: 'Sarah',
    lastName: 'Super Admin',
    displayName: 'Sarah Super Admin',
    role: UserRole.TSS_SUPER_ADMIN,
    roles: ['tss-super-admin', 'opco-admin', 'hr', 'manager', 'employee'],
    opcoId: 'dev-opco-id',
    opco: { id: 'dev-opco-id', name: 'development', displayName: 'Development OpCo' },
    directReports: [],
  },
};

// Default mock user (highest role for dev convenience)
const mockUser = mockUsers[UserRole.TSS_SUPER_ADMIN];

export function AuthProvider({ children }) {
  const [state, setState] = useState(initialState);
  const keycloakRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const initializingRef = useRef(false);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Initialize Keycloak
   */
  const initKeycloak = useCallback(async () => {
    // Prevent double initialization
    if (initializingRef.current) return;
    initializingRef.current = true;

    // Development mode without auth
    if (!authConfig.features.enabled || authConfig.features.allowAnonymous) {
      console.log('[Auth] Running in development mode without authentication');
      updateState({
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
        error: null,
      });
      return;
    }

    try {
      // Create Keycloak instance
      const keycloak = new Keycloak({
        url: authConfig.keycloak.url,
        realm: authConfig.keycloak.realm,
        clientId: authConfig.keycloak.clientId,
      });

      keycloakRef.current = keycloak;

      // Initialize Keycloak
      const authenticated = await keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      });

      if (authenticated) {
        // Set token in API client
        apiClient.setAccessToken(keycloak.token);

        // Set up token refresh
        setupTokenRefresh(keycloak);

        // Fetch user profile from backend
        let dbUser = null;
        try {
          dbUser = await authApi.getMe();
        } catch (err) {
          console.warn('[Auth] Could not fetch user profile from backend:', err);
        }

        const user = mapKeycloakUser(keycloak, dbUser);

        updateState({
          isAuthenticated: true,
          isLoading: false,
          user,
          error: null,
          keycloak,
        });

        console.log('[Auth] User authenticated:', user.email);
      } else {
        updateState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      }
    } catch (error) {
      console.error('[Auth] Keycloak initialization failed:', error);
      updateState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error.message || 'Authentication failed',
      });
    }
  }, [updateState]);

  /**
   * Set up automatic token refresh
   */
  const setupTokenRefresh = useCallback((keycloak) => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(async () => {
      try {
        const refreshed = await keycloak.updateToken(authConfig.minTokenValidity);
        if (refreshed) {
          apiClient.setAccessToken(keycloak.token);
          console.log('[Auth] Token refreshed');
        }
      } catch (error) {
        console.error('[Auth] Token refresh failed:', error);
        // Force re-login
        keycloak.login();
      }
    }, authConfig.tokenRefreshInterval);
  }, []);

  /**
   * Handle unauthorized API responses
   */
  useEffect(() => {
    apiClient.setOnUnauthorized(() => {
      console.warn('[Auth] Received 401, logging out');
      logout();
    });
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initKeycloak();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [initKeycloak]);

  /**
   * Login
   */
  const login = useCallback(async (redirectUri) => {
    if (keycloakRef.current) {
      await keycloakRef.current.login({
        redirectUri: redirectUri || window.location.href,
      });
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async (redirectUri) => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    apiClient.setAccessToken(null);

    if (keycloakRef.current) {
      await keycloakRef.current.logout({
        redirectUri: redirectUri || window.location.origin,
      });
    } else {
      // Dev mode
      updateState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
    }
  }, [updateState]);

  /**
   * Get current access token
   */
  const getAccessToken = useCallback(async () => {
    if (!keycloakRef.current) return null;

    try {
      await keycloakRef.current.updateToken(30);
      return keycloakRef.current.token;
    } catch {
      return null;
    }
  }, []);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((role) => {
    if (!state.user) return false;
    return state.user.role === role || state.user.roles.includes(role.toLowerCase());
  }, [state.user]);

  /**
   * Check if user has minimum role level
   */
  const hasMinRole = useCallback((requiredRole) => {
    if (!state.user) return false;
    return hasMinimumRole(state.user.role, requiredRole);
  }, [state.user]);

  /**
   * Check if user has any of the specified roles
   */
  const hasRoles = useCallback((roles) => {
    if (!state.user) return false;
    return hasAnyRole(state.user.role, roles);
  }, [state.user]);

  /**
   * Check if user is a manager of specific user
   */
  const isManagerOf = useCallback((userId) => {
    if (!state.user) return false;
    return state.user.directReports?.some(dr => dr.id === userId);
  }, [state.user]);

  /**
   * Check if running in dev mode (no auth)
   */
  const isDevMode = !authConfig.features.enabled || authConfig.features.allowAnonymous;

  /**
   * Switch role in development mode
   */
  const switchDevRole = useCallback((role) => {
    if (!isDevMode) {
      console.warn('[Auth] switchDevRole only works in development mode');
      return;
    }

    const newUser = mockUsers[role];
    if (!newUser) {
      console.error('[Auth] Invalid role:', role);
      return;
    }

    console.log('[Auth] Switching to role:', role, newUser.displayName);
    updateState({
      user: newUser,
    });
  }, [isDevMode, updateState]);

  const value = {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
    error: state.error,

    // Actions
    login,
    logout,
    getAccessToken,

    // Permission helpers
    hasRole,
    hasMinRole,
    hasRoles,
    isManagerOf,

    // Dev mode
    isDevMode,
    switchDevRole,
    availableRoles: isDevMode ? Object.keys(mockUsers) : [],
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication
 */
export function useRequireAuth(redirectTo = '/') {
  const { isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login(window.location.href);
    }
  }, [isAuthenticated, isLoading, login]);

  return { isAuthenticated, isLoading };
}

export default AuthContext;
