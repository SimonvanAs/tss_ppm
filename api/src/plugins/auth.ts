import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import jwksClient from 'jwks-rsa';
import { config } from '../config/index.js';
import { UserRole as PrismaUserRole } from '@prisma/client';

// Re-export Prisma's UserRole for use throughout the app
export type UserRole = PrismaUserRole;
export const UserRole = {
  EMPLOYEE: 'EMPLOYEE' as UserRole,
  MANAGER: 'MANAGER' as UserRole,
  HR: 'HR' as UserRole,
  OPCO_ADMIN: 'OPCO_ADMIN' as UserRole,
  TSS_SUPER_ADMIN: 'TSS_SUPER_ADMIN' as UserRole,
};

// JWT payload structure from Keycloak
export interface KeycloakToken {
  exp: number;
  iat: number;
  jti: string;
  iss: string;
  aud: string | string[];
  sub: string;
  typ: string;
  azp: string;
  session_state?: string;
  acr?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
  scope: string;
  sid?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  // Custom claims
  opco_id?: string;
}

// Authenticated user context
export interface AuthUser {
  id?: string;           // Database user ID (if exists)
  keycloakId: string;    // Keycloak subject ID
  email: string;
  firstName?: string;
  lastName?: string;
  opcoId?: string;
  roles: string[];
  role: UserRole;        // Primary role for authorization
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: KeycloakToken;
    user: AuthUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (...roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: AuthUser;
  }
}

// Map Keycloak role names to application roles
const ROLE_MAPPING: Record<string, UserRole> = {
  'tss-super-admin': UserRole.TSS_SUPER_ADMIN,
  'opco-admin': UserRole.OPCO_ADMIN,
  'hr': UserRole.HR,
  'manager': UserRole.MANAGER,
  'employee': UserRole.EMPLOYEE,
};

const mapKeycloakRoleToUserRole = (roles: string[]): UserRole => {
  // Map Keycloak roles to application roles (highest privilege wins)
  const normalizedRoles = roles.map(r => r.toLowerCase());

  if (normalizedRoles.includes('tss-super-admin')) return UserRole.TSS_SUPER_ADMIN;
  if (normalizedRoles.includes('opco-admin')) return UserRole.OPCO_ADMIN;
  if (normalizedRoles.includes('hr')) return UserRole.HR;
  if (normalizedRoles.includes('manager')) return UserRole.MANAGER;
  return UserRole.EMPLOYEE;
};

// JWKS client for Keycloak public key retrieval
let jwksClientInstance: jwksClient.JwksClient | null = null;

const getJwksClient = (): jwksClient.JwksClient => {
  if (!jwksClientInstance) {
    const jwksUri = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/certs`;
    jwksClientInstance = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwksClientInstance;
};

const getSigningKey = async (kid: string): Promise<string> => {
  const client = getJwksClient();
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
};

const authPluginCallback: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Determine if we're using Keycloak JWKS or a simple secret (dev mode)
  const useKeycloak = config.keycloak.url && config.nodeEnv === 'production';

  if (useKeycloak) {
    // Production: Use Keycloak JWKS
    await fastify.register(jwt, {
      decode: { complete: true },
      secret: async (request, token) => {
        const decodedToken = token as { header: { kid?: string } };
        const kid = decodedToken.header?.kid;
        if (!kid) {
          throw new Error('No kid in token header');
        }
        return getSigningKey(kid);
      },
      verify: {
        algorithms: ['RS256'],
        // Allow both internal and external issuer URLs
        allowedIss: [
          `${config.keycloak.url}/realms/${config.keycloak.realm}`,
          // External issuer from CORS origins (production domain)
          ...config.corsOrigins.map(origin => `${origin}/auth/realms/${config.keycloak.realm}`),
        ],
      },
    });
  } else {
    // Development: Use simple secret
    await fastify.register(jwt, {
      secret: config.jwtSecret || 'development-secret-change-in-production',
    });
  }

  // Authentication decorator - requires valid token
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // jwtVerify() returns different structures depending on decode options:
      // - With decode: { complete: true }: { header, payload, signature }
      // - Without: just the payload object
      const verified = await request.jwtVerify();

      // Handle both complete token and payload-only responses
      let decoded: KeycloakToken;
      if ('payload' in (verified as object) && typeof (verified as { payload: unknown }).payload === 'object') {
        decoded = (verified as { payload: KeycloakToken }).payload;
      } else if ('sub' in (verified as object)) {
        decoded = verified as KeycloakToken;
      } else {
        fastify.log.error({ verified: JSON.stringify(verified) }, 'Unexpected JWT structure');
        throw new Error('Invalid token structure');
      }

      // Extract roles from Keycloak token
      const realmRoles = decoded.realm_access?.roles || [];
      const clientRoles = decoded.resource_access?.[config.keycloak.clientId]?.roles || [];
      const allRoles = [...new Set([...realmRoles, ...clientRoles])];

      // Try to find user in database
      const dbUser = await fastify.prisma.user.findUnique({
        where: { keycloakId: decoded.sub },
        select: { id: true, opcoId: true, role: true },
      });

      request.user = {
        id: dbUser?.id,
        keycloakId: decoded.sub,
        email: decoded.email || decoded.preferred_username || '',
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        opcoId: dbUser?.opcoId || decoded.opco_id,
        roles: allRoles,
        role: dbUser?.role || mapKeycloakRoleToUserRole(allRoles),
      };
    } catch (err) {
      fastify.log.warn({ err }, 'Authentication failed');
      return reply.status(401).send({
        error: {
          message: 'Unauthorized: Invalid or expired token',
          statusCode: 401,
        },
      });
    }
  });

  // Optional authentication - doesn't fail if no token
  fastify.decorate('authenticateOptional', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return; // No token, continue without user
      }
      await fastify.authenticate(request, reply);
    } catch {
      // Ignore errors, continue without user
    }
  });

  // Authorization decorator - checks role after authentication
  fastify.decorate('authorize', (...allowedRoles: UserRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // First authenticate
      await fastify.authenticate(request, reply);

      // If authenticate already sent a response, stop
      if (reply.sent) return;

      // Check if user has required role
      if (!allowedRoles.includes(request.user.role)) {
        return reply.status(403).send({
          error: {
            message: 'Forbidden: Insufficient permissions',
            statusCode: 403,
            requiredRoles: allowedRoles,
            userRole: request.user.role,
          },
        });
      }
    };
  });
};

export const authPlugin = fp(authPluginCallback, {
  name: 'auth',
  dependencies: ['prisma'],
});

// Role hierarchy for checking permissions
export const roleHierarchy: Record<string, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  HR: 3,
  OPCO_ADMIN: 4,
  TSS_SUPER_ADMIN: 5,
};

export const hasMinimumRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Helper to check if user can access a specific resource
export const canAccessUser = (authUser: AuthUser, targetUserId: string): boolean => {
  // User can always access their own data
  if (authUser.id === targetUserId || authUser.keycloakId === targetUserId) {
    return true;
  }
  // Higher roles can access subordinates
  return hasMinimumRole(authUser.role, UserRole.MANAGER);
};
