import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get current user profile
  fastify.get('/me', {
    schema: {
      description: 'Get current authenticated user profile',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            keycloakId: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            displayName: { type: 'string' },
            role: { type: 'string' },
            opcoId: { type: 'string' },
            opcoName: { type: 'string' },
            functionTitle: { type: 'string', nullable: true },
            tovLevel: { type: 'string', nullable: true },
          },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request) => {
    // Find user in database by Keycloak ID
    const user = await fastify.prisma.user.findUnique({
      where: { keycloakId: request.user.keycloakId },
      include: {
        opco: true,
        functionTitle: true,
        tovLevel: true,
      },
    });

    if (!user) {
      // User exists in Keycloak but not in our DB yet
      // This could happen on first login - we might auto-create
      return {
        keycloakId: request.user.keycloakId,
        email: request.user.email,
        firstName: request.user.firstName,
        lastName: request.user.lastName,
        displayName: `${request.user.firstName} ${request.user.lastName}`,
        role: request.user.role,
        opcoId: request.user.opcoId,
        opcoName: null,
        functionTitle: null,
        tovLevel: null,
        needsSetup: true,
      };
    }

    return {
      id: user.id,
      keycloakId: user.keycloakId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      role: user.role,
      opcoId: user.opcoId,
      opcoName: user.opco.displayName,
      functionTitle: user.functionTitle?.name || null,
      tovLevel: user.tovLevel?.code || null,
    };
  });

  // Token validation endpoint (for frontend to verify token is still valid)
  fastify.get('/validate', {
    schema: {
      description: 'Validate current JWT token',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            expiresAt: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request) => {
    return {
      valid: true,
      userId: request.user.keycloakId,
    };
  });
};
