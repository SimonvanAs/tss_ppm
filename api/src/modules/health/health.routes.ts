import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Health check endpoint
  fastify.get('/', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
            database: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Check database connection
    let dbStatus = 'healthy';
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unhealthy';
    }

    return {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbStatus,
    };
  });

  // Readiness check
  fastify.get('/ready', {
    schema: {
      description: 'Readiness check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
          },
        },
      },
    },
  }, async () => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      return { ready: false };
    }
  });

  // Liveness check
  fastify.get('/live', {
    schema: {
      description: 'Liveness check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            alive: { type: 'boolean' },
          },
        },
      },
    },
  }, async () => {
    return { alive: true };
  });
};
