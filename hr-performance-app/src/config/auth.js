/**
 * Authentication configuration
 */

export const authConfig = {
  // Keycloak configuration
  keycloak: {
    url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'tss-ppm',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'tss-ppm-frontend',
  },

  // Token refresh settings
  tokenRefreshInterval: 60000, // Check every 60 seconds
  minTokenValidity: 70, // Refresh if token expires within 70 seconds

  // Session settings
  sessionCheckInterval: 5000, // Check session every 5 seconds
  idleTimeout: 30 * 60 * 1000, // 30 minutes idle timeout

  // Feature flags
  features: {
    // Set to true to enable auth, false to bypass (development mode)
    enabled: import.meta.env.VITE_AUTH_ENABLED !== 'false',
    // Set to true to allow anonymous access (for local development without Keycloak)
    allowAnonymous: import.meta.env.VITE_AUTH_ALLOW_ANONYMOUS === 'true',
  },
};

export const UserRole = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR: 'HR',
  OPCO_ADMIN: 'OPCO_ADMIN',
  TSS_SUPER_ADMIN: 'TSS_SUPER_ADMIN',
};

// Role hierarchy for permission checks
export const roleHierarchy = {
  [UserRole.EMPLOYEE]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.HR]: 3,
  [UserRole.OPCO_ADMIN]: 4,
  [UserRole.TSS_SUPER_ADMIN]: 5,
};

/**
 * Check if a user has at least the minimum required role
 */
export function hasMinimumRole(userRole, requiredRole) {
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}

/**
 * Check if a user has any of the allowed roles
 */
export function hasAnyRole(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}

export default authConfig;
