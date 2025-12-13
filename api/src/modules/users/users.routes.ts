import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserRole } from '../../plugins/auth.js';
import { withTenantFilter } from '../../plugins/tenant.js';
import { markAsAudited, computeChanges } from '../../plugins/audit.js';
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
  CreateUser,
  UpdateUser,
  UserQuery
} from '../../schemas/index.js';

export const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List users (filtered by role and tenant)
  fastify.get('/', {
    schema: {
      description: 'List users in the current OpCo',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: Object.values(UserRole) },
          managerId: { type: 'string' },
          search: { type: 'string' },
          isActive: { type: 'boolean' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20, maximum: 100 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  displayName: { type: 'string' },
                  role: { type: 'string' },
                  functionTitle: { type: 'string', nullable: true },
                  tovLevel: { type: 'string', nullable: true },
                  managerId: { type: 'string', nullable: true },
                  isActive: { type: 'boolean' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    // Validate query params with Zod
    const parseResult = userQuerySchema.safeParse(request.query);
    const query = parseResult.success ? parseResult.data : {
      page: 1,
      limit: 20,
      ...(request.query as object)
    };

    const skip = (query.page - 1) * query.limit;

    const where = {
      ...withTenantFilter(request),
      ...(query.role && { role: query.role }),
      ...(query.managerId && { managerId: query.managerId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      fastify.prisma.user.findMany({
        where,
        include: {
          functionTitle: true,
          tovLevel: true,
        },
        skip,
        take: query.limit,
        orderBy: { lastName: 'asc' },
      }),
      fastify.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName || `${user.firstName} ${user.lastName}`,
        role: user.role,
        functionTitle: user.functionTitle?.name || null,
        tovLevel: user.tovLevel?.code || null,
        // Fall back to function title's TOV level if user doesn't have one directly set
        tovLevelId: user.tovLevelId || user.functionTitle?.tovLevelId || null,
        managerId: user.managerId,
        isActive: user.isActive,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  });

  // Get current user profile
  fastify.get('/me', {
    schema: {
      description: 'Get current user profile',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { keycloakId: request.user.keycloakId },
      include: {
        functionTitle: true,
        tovLevel: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        directReports: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        opco: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        error: { message: 'User not found', statusCode: 404 },
      });
    }

    return user;
  });

  // Get user by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get user by ID',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    preHandler: [fastify.authorize(UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const user = await fastify.prisma.user.findFirst({
        where: {
          id,
          ...withTenantFilter(request),
        },
        include: {
          functionTitle: true,
          tovLevel: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          directReports: {
            where: { isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          opco: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({
          error: { message: 'User not found', statusCode: 404 },
        });
      }

      // Audit log access to user data
      await fastify.audit.logFromRequest(request, {
        entityType: 'User',
        entityId: user.id,
        action: 'READ',
        metadata: { targetEmail: user.email },
      });

      return user;
    } catch (err) {
      fastify.log.error({ err, params: request.params }, 'Error fetching user by ID');
      return reply.status(500).send({
        error: { message: 'Internal server error', statusCode: 500 },
      });
    }
  });

  // Create user
  fastify.post('/', {
    schema: {
      description: 'Create a new user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          keycloakId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          displayName: { type: 'string' },
          role: { type: 'string', enum: Object.values(UserRole) },
          opcoId: { type: 'string' },
          functionTitleId: { type: 'string' },
          tovLevelId: { type: 'string' },
          managerId: { type: 'string' },
        },
        required: ['keycloakId', 'email', 'firstName', 'lastName'],
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    // Validate with Zod
    const parseResult = createUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          message: 'Validation failed',
          statusCode: 400,
          details: parseResult.error.errors,
        },
      });
    }

    const body = parseResult.data;

    // Determine opcoId - use body.opcoId if TSS_SUPER_ADMIN, otherwise use tenant's opcoId
    const opcoId = request.user.role === UserRole.TSS_SUPER_ADMIN && body.opcoId
      ? body.opcoId
      : request.tenant.opcoId;

    // Check if user already exists
    const existing = await fastify.prisma.user.findUnique({
      where: { keycloakId: body.keycloakId },
    });

    if (existing) {
      return reply.status(409).send({
        error: { message: 'User with this Keycloak ID already exists', statusCode: 409 },
      });
    }

    // Check email uniqueness within opco
    const emailExists = await fastify.prisma.user.findFirst({
      where: { opcoId, email: body.email },
    });

    if (emailExists) {
      return reply.status(409).send({
        error: { message: 'User with this email already exists in this OpCo', statusCode: 409 },
      });
    }

    // Create user
    const user = await fastify.prisma.user.create({
      data: {
        keycloakId: body.keycloakId,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        displayName: body.displayName,
        role: body.role,
        opcoId,
        functionTitleId: body.functionTitleId,
        tovLevelId: body.tovLevelId,
        managerId: body.managerId,
      },
      include: {
        functionTitle: true,
        tovLevel: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'User',
      entityId: user.id,
      action: 'CREATE',
      metadata: { email: user.email, role: user.role },
    });
    markAsAudited(request);

    return reply.status(201).send(user);
  });

  // Update user
  fastify.patch('/:id', {
    schema: {
      description: 'Update a user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Validate with Zod
    const parseResult = updateUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          message: 'Validation failed',
          statusCode: 400,
          details: parseResult.error.errors,
        },
      });
    }

    const body = parseResult.data;

    // Get existing user
    const existingUser = await fastify.prisma.user.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!existingUser) {
      return reply.status(404).send({
        error: { message: 'User not found', statusCode: 404 },
      });
    }

    // Prevent circular manager relationships
    if (body.managerId === id) {
      return reply.status(400).send({
        error: { message: 'User cannot be their own manager', statusCode: 400 },
      });
    }

    // Update user
    const user = await fastify.prisma.user.update({
      where: { id },
      data: body,
      include: {
        functionTitle: true,
        tovLevel: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Compute and log changes
    const changes = computeChanges(existingUser as Record<string, unknown>, body as Record<string, unknown>);
    if (Object.keys(changes).length > 0) {
      await fastify.audit.logFromRequest(request, {
        entityType: 'User',
        entityId: user.id,
        action: 'UPDATE',
        changes,
        metadata: { email: user.email },
      });
    }
    markAsAudited(request);

    return user;
  });

  // Deactivate user (soft delete)
  fastify.delete('/:id', {
    schema: {
      description: 'Deactivate a user (soft delete)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify user exists and is in tenant
    const existingUser = await fastify.prisma.user.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!existingUser) {
      return reply.status(404).send({
        error: { message: 'User not found', statusCode: 404 },
      });
    }

    // Prevent deleting yourself
    if (existingUser.keycloakId === request.user.keycloakId) {
      return reply.status(400).send({
        error: { message: 'Cannot deactivate your own account', statusCode: 400 },
      });
    }

    // Soft delete
    await fastify.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'User',
      entityId: id,
      action: 'DELETE',
      metadata: { email: existingUser.email },
    });
    markAsAudited(request);

    return reply.status(204).send();
  });

  // Get user's review cycles
  fastify.get('/:id/reviews', {
    schema: {
      description: 'Get review cycles for a user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'integer' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { year?: number };

    // Get the target user
    const targetUser = await fastify.prisma.user.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!targetUser) {
      return reply.status(404).send({
        error: { message: 'User not found', statusCode: 404 },
      });
    }

    // Users can only see their own reviews unless they're manager/HR/admin
    const isOwnProfile = request.user.keycloakId === targetUser.keycloakId;
    const canViewOthers = [UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN].includes(request.user.role);

    if (!isOwnProfile && !canViewOthers) {
      return reply.status(403).send({
        error: { message: 'Forbidden', statusCode: 403 },
      });
    }

    // If manager, verify this user is their direct report
    if (request.user.role === UserRole.MANAGER && !isOwnProfile) {
      const currentUser = await fastify.prisma.user.findUnique({
        where: { keycloakId: request.user.keycloakId },
      });
      if (targetUser.managerId !== currentUser?.id) {
        return reply.status(403).send({
          error: { message: 'Forbidden: User is not your direct report', statusCode: 403 },
        });
      }
    }

    const reviews = await fastify.prisma.reviewCycle.findMany({
      where: {
        employeeId: id,
        ...withTenantFilter(request),
        ...(query.year && { year: query.year }),
      },
      include: {
        tovLevel: true,
        stages: true,
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { year: 'desc' },
    });

    return reviews;
  });

  // Get managers (for dropdowns)
  fastify.get('/managers', {
    schema: {
      description: 'List users who can be managers',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const managers = await fastify.prisma.user.findMany({
      where: {
        ...withTenantFilter(request),
        isActive: true,
        role: {
          in: [UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: { lastName: 'asc' },
    });

    return managers;
  });
};
