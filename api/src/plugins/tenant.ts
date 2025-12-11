import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { UserRole } from './auth.js';

// Tenant context for multi-tenancy
export interface TenantContext {
  opcoId: string;
  isSuperAdmin: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant: TenantContext;
  }
}

const tenantPluginCallback: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Add hook to set tenant context after authentication
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip if no user (public routes)
    if (!request.user) {
      return;
    }

    const isSuperAdmin = request.user.role === UserRole.TSS_SUPER_ADMIN;

    // Super admins can access any tenant via query param
    let opcoId = request.user.opcoId;

    if (isSuperAdmin && request.query) {
      const query = request.query as Record<string, string>;
      if (query.opcoId) {
        opcoId = query.opcoId;
      }
    }

    if (!opcoId && !isSuperAdmin) {
      reply.status(403).send({
        error: {
          message: 'User is not associated with an OpCo',
          statusCode: 403,
        },
      });
      return;
    }

    request.tenant = {
      opcoId: opcoId || '',
      isSuperAdmin,
    };
  });
};

export const tenantPlugin = fp(tenantPluginCallback, {
  name: 'tenant',
  dependencies: ['auth'],
});

// Helper to build tenant-scoped Prisma query filter
export const withTenantFilter = (request: FastifyRequest) => {
  if (request.tenant.isSuperAdmin && !request.tenant.opcoId) {
    // Super admin without specific opco - return empty filter (all data)
    return {};
  }
  return { opcoId: request.tenant.opcoId };
};
