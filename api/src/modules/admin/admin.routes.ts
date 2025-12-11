import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserRole } from '../../plugins/auth.js';
import { withTenantFilter } from '../../plugins/tenant.js';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ============================================
  // FUNCTION TITLES
  // ============================================

  fastify.get('/function-titles', {
    schema: {
      description: 'List function titles for current OpCo with their TOV level mappings',
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
      include: {
        tovLevel: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    return functionTitles;
  });

  fastify.post('/function-titles', {
    schema: {
      description: 'Create a function title with optional TOV level mapping',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          tovLevelId: { type: 'string', description: 'Optional TOV/IDE level to auto-map for this function' },
          sortOrder: { type: 'integer' },
        },
        required: ['name'],
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as { name: string; description?: string; tovLevelId?: string; sortOrder?: number };

    const functionTitle = await fastify.prisma.functionTitle.create({
      data: {
        opcoId: request.tenant.opcoId,
        name: body.name,
        description: body.description,
        tovLevelId: body.tovLevelId || null,
        sortOrder: body.sortOrder || 0,
      },
      include: {
        tovLevel: true,
      },
    });

    return reply.status(201).send(functionTitle);
  });

  fastify.patch('/function-titles/:id', {
    schema: {
      description: 'Update a function title including TOV level mapping',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ name: string; description: string; tovLevelId: string | null; sortOrder: number; isActive: boolean }>;

    const functionTitle = await fastify.prisma.functionTitle.update({
      where: { id },
      data: body,
      include: {
        tovLevel: true,
      },
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
  // BUSINESS UNITS
  // ============================================

  fastify.get('/business-units', {
    schema: {
      description: 'List business units for current OpCo',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const businessUnits = await fastify.prisma.businessUnit.findMany({
      where: {
        ...withTenantFilter(request),
        isActive: true,
      },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { users: true, children: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return businessUnits;
  });

  fastify.post('/business-units', {
    schema: {
      description: 'Create a business unit',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Short unique code (e.g., TECH, SALES)' },
          name: { type: 'string', description: 'Display name' },
          description: { type: 'string' },
          parentId: { type: 'string', description: 'Parent BU for hierarchy' },
          headId: { type: 'string', description: 'User ID of BU head' },
          sortOrder: { type: 'integer' },
        },
        required: ['code', 'name'],
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as {
      code: string;
      name: string;
      description?: string;
      parentId?: string;
      headId?: string;
      sortOrder?: number;
    };

    // Check for duplicate code within OpCo
    const existing = await fastify.prisma.businessUnit.findFirst({
      where: {
        ...withTenantFilter(request),
        code: body.code,
      },
    });

    if (existing) {
      return reply.status(409).send({
        error: { message: 'A business unit with this code already exists', statusCode: 409 },
      });
    }

    const businessUnit = await fastify.prisma.businessUnit.create({
      data: {
        opcoId: request.tenant.opcoId,
        code: body.code,
        name: body.name,
        description: body.description,
        parentId: body.parentId || null,
        headId: body.headId || null,
        sortOrder: body.sortOrder || 0,
      },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return reply.status(201).send(businessUnit);
  });

  fastify.patch('/business-units/:id', {
    schema: {
      description: 'Update a business unit',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      code: string;
      name: string;
      description: string;
      parentId: string | null;
      headId: string | null;
      sortOrder: number;
      isActive: boolean;
    }>;

    // Verify BU exists in this tenant
    const existing = await fastify.prisma.businessUnit.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { message: 'Business unit not found', statusCode: 404 },
      });
    }

    // Check for duplicate code if code is being changed
    if (body.code && body.code !== existing.code) {
      const duplicate = await fastify.prisma.businessUnit.findFirst({
        where: {
          ...withTenantFilter(request),
          code: body.code,
          id: { not: id },
        },
      });

      if (duplicate) {
        return reply.status(409).send({
          error: { message: 'A business unit with this code already exists', statusCode: 409 },
        });
      }
    }

    // Prevent circular parent reference
    if (body.parentId === id) {
      return reply.status(400).send({
        error: { message: 'A business unit cannot be its own parent', statusCode: 400 },
      });
    }

    const businessUnit = await fastify.prisma.businessUnit.update({
      where: { id },
      data: body,
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return businessUnit;
  });

  fastify.delete('/business-units/:id', {
    schema: {
      description: 'Delete a business unit (soft delete)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify BU exists in this tenant
    const existing = await fastify.prisma.businessUnit.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
      include: {
        _count: { select: { users: true, children: true } },
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { message: 'Business unit not found', statusCode: 404 },
      });
    }

    // Check if BU has users or children
    if (existing._count.users > 0) {
      return reply.status(400).send({
        error: {
          message: `Cannot delete business unit: ${existing._count.users} users are assigned to it`,
          statusCode: 400,
        },
      });
    }

    if (existing._count.children > 0) {
      return reply.status(400).send({
        error: {
          message: `Cannot delete business unit: ${existing._count.children} child units exist`,
          statusCode: 400,
        },
      });
    }

    // Soft delete
    await fastify.prisma.businessUnit.update({
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
        businessUnit: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });
    return users;
  });

  fastify.patch('/users/:id', {
    schema: {
      description: 'Update user (role, manager, function title, business unit, etc.)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['EMPLOYEE', 'MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'] },
          managerId: { type: 'string' },
          functionTitleId: { type: 'string' },
          tovLevelId: { type: 'string' },
          businessUnitId: { type: 'string', description: 'Business unit assignment' },
          isActive: { type: 'boolean' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      role: UserRole;
      managerId: string;
      functionTitleId: string;
      tovLevelId: string;
      businessUnitId: string;
      isActive: boolean;
    }>;

    const user = await fastify.prisma.user.update({
      where: { id },
      data: body,
      include: {
        functionTitle: true,
        tovLevel: true,
        businessUnit: {
          select: { id: true, name: true, code: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
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
