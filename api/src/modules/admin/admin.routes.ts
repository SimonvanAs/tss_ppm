import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserRole } from '../../plugins/auth.js';
import { withTenantFilter } from '../../plugins/tenant.js';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ============================================
  // FUNCTION TITLES
  // ============================================

  fastify.get('/function-titles', {
    schema: {
      description: 'List function titles for current OpCo',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const functionTitles = await fastify.prisma.functionTitle.findMany({
      where: {
        ...withTenantFilter(request),
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    return functionTitles;
  });

  fastify.post('/function-titles', {
    schema: {
      description: 'Create a function title',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          sortOrder: { type: 'integer' },
        },
        required: ['name'],
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as { name: string; description?: string; sortOrder?: number };

    const functionTitle = await fastify.prisma.functionTitle.create({
      data: {
        opcoId: request.tenant.opcoId,
        name: body.name,
        description: body.description,
        sortOrder: body.sortOrder || 0,
      },
    });

    return reply.status(201).send(functionTitle);
  });

  fastify.patch('/function-titles/:id', {
    schema: {
      description: 'Update a function title',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ name: string; description: string; sortOrder: number; isActive: boolean }>;

    const functionTitle = await fastify.prisma.functionTitle.update({
      where: { id },
      data: body,
    });

    return functionTitle;
  });

  fastify.delete('/function-titles/:id', {
    schema: {
      description: 'Delete a function title',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Soft delete
    await fastify.prisma.functionTitle.update({
      where: { id },
      data: { isActive: false },
    });

    return reply.status(204).send();
  });

  // ============================================
  // TOV LEVELS
  // ============================================

  fastify.get('/tov-levels', {
    schema: {
      description: 'List TOV/IDE levels for current OpCo',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const tovLevels = await fastify.prisma.tovLevel.findMany({
      where: {
        ...withTenantFilter(request),
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    return tovLevels;
  });

  fastify.post('/tov-levels', {
    schema: {
      description: 'Create a TOV/IDE level',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'object' },
          sortOrder: { type: 'integer' },
        },
        required: ['code', 'name'],
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as { code: string; name: string; description?: object; sortOrder?: number };

    const tovLevel = await fastify.prisma.tovLevel.create({
      data: {
        opcoId: request.tenant.opcoId,
        code: body.code,
        name: body.name,
        description: body.description || {},
        sortOrder: body.sortOrder || 0,
      },
    });

    return reply.status(201).send(tovLevel);
  });

  fastify.patch('/tov-levels/:id', {
    schema: {
      description: 'Update a TOV/IDE level',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ name: string; description: object; sortOrder: number; isActive: boolean }>;

    const tovLevel = await fastify.prisma.tovLevel.update({
      where: { id },
      data: body,
    });

    return tovLevel;
  });

  // ============================================
  // COMPETENCIES
  // ============================================

  fastify.get('/competencies', {
    schema: {
      description: 'List competencies for current OpCo',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          tovLevelId: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const query = request.query as { tovLevelId?: string };

    const competencies = await fastify.prisma.competencyLevel.findMany({
      where: {
        ...withTenantFilter(request),
        ...(query.tovLevelId && { tovLevelId: query.tovLevelId }),
        isActive: true,
      },
      include: {
        tovLevel: true,
      },
      orderBy: [{ tovLevel: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    return competencies;
  });

  fastify.post('/competencies', {
    schema: {
      description: 'Create a competency',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          competencyId: { type: 'string' },
          tovLevelId: { type: 'string' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          title: { type: 'object' },
          indicators: { type: 'object' },
          sortOrder: { type: 'integer' },
        },
        required: ['competencyId', 'tovLevelId', 'category', 'subcategory', 'title', 'indicators'],
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as {
      competencyId: string;
      tovLevelId: string;
      category: string;
      subcategory: string;
      title: object;
      indicators: object;
      sortOrder?: number;
    };

    const competency = await fastify.prisma.competencyLevel.create({
      data: {
        opcoId: request.tenant.opcoId,
        ...body,
        sortOrder: body.sortOrder || 0,
      },
    });

    return reply.status(201).send(competency);
  });

  fastify.patch('/competencies/:id', {
    schema: {
      description: 'Update a competency',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      category: string;
      subcategory: string;
      title: object;
      indicators: object;
      sortOrder: number;
      isActive: boolean;
    }>;

    const competency = await fastify.prisma.competencyLevel.update({
      where: { id },
      data: body,
    });

    return competency;
  });

  fastify.delete('/competencies/:id', {
    schema: {
      description: 'Delete a competency (soft delete)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Soft delete
    await fastify.prisma.competencyLevel.update({
      where: { id },
      data: { isActive: false },
    });

    return reply.status(204).send();
  });

  // ============================================
  // USERS MANAGEMENT
  // ============================================

  fastify.get('/users', {
    schema: {
      description: 'List all users for management',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const users = await fastify.prisma.user.findMany({
      where: withTenantFilter(request),
      include: {
        functionTitle: true,
        tovLevel: true,
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });
    return users;
  });

  fastify.patch('/users/:id', {
    schema: {
      description: 'Update user (role, manager, function title, etc.)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      role: UserRole;
      managerId: string;
      functionTitleId: string;
      tovLevelId: string;
      isActive: boolean;
    }>;

    const user = await fastify.prisma.user.update({
      where: { id },
      data: body,
    });

    return user;
  });

  // ============================================
  // SUPER ADMIN: OPCO MANAGEMENT
  // ============================================

  fastify.get('/opcos', {
    schema: {
      description: 'List all OpCos (TSS Super Admin only)',
      tags: ['Super Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.TSS_SUPER_ADMIN)],
  }, async () => {
    const opcos = await fastify.prisma.opCo.findMany({
      orderBy: { name: 'asc' },
    });
    return opcos;
  });

  fastify.post('/opcos', {
    schema: {
      description: 'Create a new OpCo (TSS Super Admin only)',
      tags: ['Super Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          displayName: { type: 'string' },
          domain: { type: 'string' },
        },
        required: ['name', 'displayName'],
      },
    },
    preHandler: [fastify.authorize(UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as { name: string; displayName: string; domain?: string };

    const opco = await fastify.prisma.opCo.create({
      data: {
        name: body.name,
        displayName: body.displayName,
        domain: body.domain,
      },
    });

    return reply.status(201).send(opco);
  });

  fastify.patch('/opcos/:id', {
    schema: {
      description: 'Update an OpCo (TSS Super Admin only)',
      tags: ['Super Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ displayName: string; domain: string; isActive: boolean; settings: object }>;

    const opco = await fastify.prisma.opCo.update({
      where: { id },
      data: body,
    });

    return opco;
  });
};
