import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

// Audit action types
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'ACCESS'
  | 'STATUS_CHANGE'
  | 'STAGE_START'
  | 'STAGE_COMPLETE'
  | 'GOAL_CHANGE_REQUEST'
  | 'GOAL_CHANGE_APPROVE'
  | 'GOAL_CHANGE_REJECT'
  | 'EMPLOYEE_SIGN'
  | 'MANAGER_SIGN'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT';

// Audit log entry
export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  reviewCycleId?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    audit: {
      log: (entry: AuditEntry) => Promise<void>;
      logFromRequest: (request: FastifyRequest, entry: AuditEntry) => Promise<void>;
    };
  }
}

const auditPluginCallback: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const audit = {
    /**
     * Log an audit entry directly (when user context is known)
     */
    log: async (entry: AuditEntry): Promise<void> => {
      // This should be called with user context from the request
      fastify.log.warn('audit.log called without request context - skipping');
    },

    /**
     * Log an audit entry from a request context
     */
    logFromRequest: async (request: FastifyRequest, entry: AuditEntry): Promise<void> => {
      try {
        // Skip if no user (public endpoints)
        if (!request.user?.id && !request.user?.keycloakId) {
          fastify.log.debug({ entry }, 'Skipping audit log - no user context');
          return;
        }

        // Find user ID in database if we only have keycloakId
        let userId = request.user.id;
        if (!userId && request.user.keycloakId) {
          const user = await fastify.prisma.user.findUnique({
            where: { keycloakId: request.user.keycloakId },
            select: { id: true },
          });
          userId = user?.id;
        }

        if (!userId) {
          fastify.log.debug({ entry }, 'Skipping audit log - user not found in database');
          return;
        }

        // Build metadata with request info
        const metadata = {
          ...entry.metadata,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          method: request.method,
          url: request.url,
          opcoId: request.tenant?.opcoId,
        };

        // Create audit log entry
        await fastify.prisma.auditLog.create({
          data: {
            entityType: entry.entityType,
            entityId: entry.entityId,
            action: entry.action,
            changes: entry.changes ? JSON.parse(JSON.stringify(entry.changes)) : undefined,
            metadata: JSON.parse(JSON.stringify(metadata)),
            userId,
            reviewCycleId: entry.reviewCycleId,
          },
        });

        fastify.log.debug({ entry }, 'Audit log created');
      } catch (error) {
        // Don't fail the request if audit logging fails
        fastify.log.error({ error, entry }, 'Failed to create audit log');
      }
    },
  };

  fastify.decorate('audit', audit);

  // Optional: Add response hook for automatic audit logging of mutations
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only log successful mutations
    if (reply.statusCode >= 400) return;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return;

    // Skip if already audited (to avoid duplicates)
    const wasAudited = (request as unknown as { _audited?: boolean })._audited;
    if (wasAudited) return;

    // Auto-audit based on route patterns
    const url = request.url;

    // Skip health checks and auth endpoints
    if (url.includes('/health') || url.includes('/auth')) return;

    // Log a generic audit entry for unhandled mutations
    // Specific routes should call audit.logFromRequest directly for more context
    fastify.log.debug({ method: request.method, url }, 'Mutation not explicitly audited');
  });
};

export const auditPlugin = fp(auditPluginCallback, {
  name: 'audit',
  dependencies: ['prisma'],
});

/**
 * Helper to compute changes between old and new objects
 */
export function computeChanges<T extends Record<string, unknown>>(
  oldData: T,
  newData: Partial<T>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(newData) as (keyof T)[]) {
    const oldValue = oldData[key];
    const newValue = newData[key];

    // Skip if values are equal
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;

    // Skip internal fields
    if (['updatedAt', 'createdAt', 'id'].includes(key as string)) continue;

    changes[key as string] = { old: oldValue, new: newValue };
  }

  return changes;
}

/**
 * Mark a request as audited to prevent duplicate logging
 */
export function markAsAudited(request: FastifyRequest): void {
  (request as unknown as { _audited: boolean })._audited = true;
}
