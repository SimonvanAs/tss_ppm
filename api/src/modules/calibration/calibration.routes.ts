import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserRole } from '../../plugins/auth.js';
import { withTenantFilter } from '../../plugins/tenant.js';
import { CalibrationStatus, CalibrationScope, CalibrationParticipantRole } from '@prisma/client';

// Grid position helpers
const GRID_POSITIONS = [
  { what: 1, how: 1, label: 'C1', key: '1-1' },
  { what: 1, how: 2, label: 'C2', key: '1-2' },
  { what: 1, how: 3, label: 'C3', key: '1-3' },
  { what: 2, how: 1, label: 'B1', key: '2-1' },
  { what: 2, how: 2, label: 'B2', key: '2-2' },
  { what: 2, how: 3, label: 'B3', key: '2-3' },
  { what: 3, how: 1, label: 'A1', key: '3-1' },
  { what: 3, how: 2, label: 'A2', key: '3-2' },
  { what: 3, how: 3, label: 'A3', key: '3-3' },
];

// Anomaly detection thresholds
const ANOMALY_THRESHOLDS = {
  HIGH_RATING_PERCENTAGE: 0.4,    // >40% top performers flagged
  LOW_RATING_PERCENTAGE: 0.3,     // >30% underperformers flagged
  DEVIATION_FROM_AVERAGE: 0.5,    // >0.5 deviation from company avg
  TEAM_SIZE_MINIMUM: 3,           // Min team size for analysis
};

function roundToGridPosition(score: number | null): number | null {
  if (score === null || score === undefined) return null;
  if (score < 1.5) return 1;
  if (score < 2.5) return 2;
  return 3;
}

function getGridLabel(whatPos: number, howPos: number): string {
  const pos = GRID_POSITIONS.find(p => p.what === whatPos && p.how === howPos);
  return pos?.label || `${whatPos}-${howPos}`;
}

function getGridKey(whatScore: number, howScore: number): string {
  const whatPos = roundToGridPosition(whatScore);
  const howPos = roundToGridPosition(howScore);
  return whatPos && howPos ? `${whatPos}-${howPos}` : '';
}

export const calibrationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  // GET /calibration/sessions - List calibration sessions
  fastify.get('/sessions', {
    schema: {
      description: 'List calibration sessions for the organization',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'integer' },
          status: { type: 'string', enum: Object.values(CalibrationStatus) },
          businessUnitId: { type: 'string' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20, maximum: 100 },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const query = request.query as {
      year?: number;
      status?: CalibrationStatus;
      businessUnitId?: string;
      page?: number;
      limit?: number;
    };

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      ...withTenantFilter(request),
      ...(query.year && { year: query.year }),
      ...(query.status && { status: query.status }),
      ...(query.businessUnitId && { businessUnitId: query.businessUnitId }),
    };

    const [sessions, total] = await Promise.all([
      fastify.prisma.calibrationSession.findMany({
        where,
        include: {
          businessUnit: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true, participants: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.calibrationSession.count({ where }),
    ]);

    return {
      sessions: sessions.map(s => ({
        id: s.id,
        name: s.name,
        year: s.year,
        status: s.status,
        scope: s.scope,
        businessUnit: s.businessUnit,
        createdBy: s.createdBy ? `${s.createdBy.firstName} ${s.createdBy.lastName}` : null,
        scheduledAt: s.scheduledAt,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        targetDistribution: s.targetDistribution,
        enforceDistribution: s.enforceDistribution,
        itemCount: s._count.items,
        participantCount: s._count.participants,
        createdAt: s.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // POST /calibration/sessions - Create new session
  fastify.post('/sessions', {
    schema: {
      description: 'Create a new calibration session',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'year'],
        properties: {
          name: { type: 'string', minLength: 3, maxLength: 200 },
          year: { type: 'integer', minimum: 2020, maximum: 2100 },
          scope: { type: 'string', enum: Object.values(CalibrationScope), default: 'BUSINESS_UNIT' },
          businessUnitId: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' },
          targetDistribution: {
            type: 'object',
            properties: {
              topTalent: { type: 'number', minimum: 0, maximum: 100 },
              solid: { type: 'number', minimum: 0, maximum: 100 },
              concern: { type: 'number', minimum: 0, maximum: 100 },
            },
          },
          enforceDistribution: { type: 'boolean', default: false },
          notes: { type: 'string', maxLength: 2000 },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as {
      name: string;
      year: number;
      scope?: CalibrationScope;
      businessUnitId?: string;
      scheduledAt?: string;
      targetDistribution?: { topTalent?: number; solid?: number; concern?: number };
      enforceDistribution?: boolean;
      notes?: string;
    };

    // Get current user
    const currentUser = await fastify.prisma.user.findUnique({
      where: { keycloakId: request.user.keycloakId },
    });

    if (!currentUser) {
      return reply.status(404).send({
        error: { message: 'User not found', statusCode: 404 },
      });
    }

    // Validate business unit if provided
    if (body.businessUnitId) {
      const bu = await fastify.prisma.businessUnit.findFirst({
        where: {
          id: body.businessUnitId,
          ...withTenantFilter(request),
        },
      });
      if (!bu) {
        return reply.status(400).send({
          error: { message: 'Business unit not found', statusCode: 400 },
        });
      }
    }

    const session = await fastify.prisma.calibrationSession.create({
      data: {
        name: body.name,
        year: body.year,
        scope: body.scope || CalibrationScope.BUSINESS_UNIT,
        businessUnitId: body.businessUnitId || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        targetDistribution: body.targetDistribution || null,
        enforceDistribution: body.enforceDistribution || false,
        notes: body.notes || null,
        opcoId: request.tenant.opcoId,
        createdById: currentUser.id,
      },
      include: {
        businessUnit: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log audit
    await fastify.audit?.logFromRequest(request, 'CREATE', 'CalibrationSession', session.id);

    return reply.status(201).send({
      id: session.id,
      name: session.name,
      year: session.year,
      status: session.status,
      scope: session.scope,
      businessUnit: session.businessUnit,
      createdBy: `${session.createdBy.firstName} ${session.createdBy.lastName}`,
      createdAt: session.createdAt,
    });
  });

  // GET /calibration/sessions/:id - Get session details
  fastify.get('/sessions/:id', {
    schema: {
      description: 'Get calibration session details',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
      include: {
        businessUnit: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { items: true } },
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    // Check participant access for non-HR users
    const userRole = request.user.role;
    const isHROrAdmin = [UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN].includes(userRole);

    if (!isHROrAdmin) {
      const currentUser = await fastify.prisma.user.findUnique({
        where: { keycloakId: request.user.keycloakId },
      });
      const isParticipant = session.participants.some(p => p.userId === currentUser?.id);
      if (!isParticipant) {
        return reply.status(403).send({
          error: { message: 'Access denied', statusCode: 403 },
        });
      }
    }

    return {
      id: session.id,
      name: session.name,
      year: session.year,
      status: session.status,
      scope: session.scope,
      businessUnit: session.businessUnit,
      createdBy: session.createdBy ? `${session.createdBy.firstName} ${session.createdBy.lastName}` : null,
      scheduledAt: session.scheduledAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      targetDistribution: session.targetDistribution,
      enforceDistribution: session.enforceDistribution,
      notes: session.notes,
      itemCount: session._count.items,
      participants: session.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        name: `${p.user.firstName} ${p.user.lastName}`,
        email: p.user.email,
        role: p.role,
        joinedAt: p.joinedAt,
      })),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  });

  // PATCH /calibration/sessions/:id - Update session
  fastify.patch('/sessions/:id', {
    schema: {
      description: 'Update calibration session',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 3, maxLength: 200 },
          scheduledAt: { type: 'string', format: 'date-time' },
          targetDistribution: {
            type: 'object',
            properties: {
              topTalent: { type: 'number' },
              solid: { type: 'number' },
              concern: { type: 'number' },
            },
          },
          enforceDistribution: { type: 'boolean' },
          notes: { type: 'string', maxLength: 2000 },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      scheduledAt?: string;
      targetDistribution?: { topTalent?: number; solid?: number; concern?: number };
      enforceDistribution?: boolean;
      notes?: string;
    };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    // Can only update DRAFT or SCHEDULED sessions
    if (!['DRAFT', 'SCHEDULED'].includes(session.status)) {
      return reply.status(400).send({
        error: { message: 'Can only update draft or scheduled sessions', statusCode: 400 },
      });
    }

    const updated = await fastify.prisma.calibrationSession.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.scheduledAt && { scheduledAt: new Date(body.scheduledAt) }),
        ...(body.targetDistribution !== undefined && { targetDistribution: body.targetDistribution }),
        ...(body.enforceDistribution !== undefined && { enforceDistribution: body.enforceDistribution }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    await fastify.audit?.logFromRequest(request, 'UPDATE', 'CalibrationSession', id);

    return { success: true, session: updated };
  });

  // DELETE /calibration/sessions/:id - Delete draft session
  fastify.delete('/sessions/:id', {
    schema: {
      description: 'Delete a draft calibration session',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    if (session.status !== 'DRAFT') {
      return reply.status(400).send({
        error: { message: 'Can only delete draft sessions', statusCode: 400 },
      });
    }

    await fastify.prisma.calibrationSession.delete({ where: { id } });
    await fastify.audit?.logFromRequest(request, 'DELETE', 'CalibrationSession', id);

    return { success: true };
  });

  // POST /calibration/sessions/:id/start - Start calibration session
  fastify.post('/sessions/:id/start', {
    schema: {
      description: 'Start a calibration session and snapshot reviews',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    if (!['DRAFT', 'SCHEDULED'].includes(session.status)) {
      return reply.status(400).send({
        error: { message: 'Session already started or completed', statusCode: 400 },
      });
    }

    // Build filter based on scope
    let userFilter: Record<string, unknown> = {};
    if (session.scope === CalibrationScope.BUSINESS_UNIT && session.businessUnitId) {
      userFilter = { businessUnitId: session.businessUnitId };
    } else if (session.scope === CalibrationScope.MANAGER) {
      // For manager scope, we'd need a managerId field - defaulting to BU for now
      if (session.businessUnitId) {
        userFilter = { businessUnitId: session.businessUnitId };
      }
    }

    // Get all completed/end-year reviews for the year
    const reviews = await fastify.prisma.reviewCycle.findMany({
      where: {
        ...withTenantFilter(request),
        year: session.year,
        whatScoreEndYear: { not: null },
        howScoreEndYear: { not: null },
        employee: {
          ...withTenantFilter(request),
          ...userFilter,
          isActive: true,
        },
      },
      select: {
        id: true,
        whatScoreEndYear: true,
        howScoreEndYear: true,
      },
    });

    if (reviews.length === 0) {
      return reply.status(400).send({
        error: { message: 'No reviews with scores found for calibration', statusCode: 400 },
      });
    }

    // Create calibration items
    const items = reviews.map(review => ({
      sessionId: id,
      reviewCycleId: review.id,
      originalWhatScore: review.whatScoreEndYear!,
      originalHowScore: review.howScoreEndYear!,
      originalGridPos: getGridLabel(
        roundToGridPosition(review.whatScoreEndYear!)!,
        roundToGridPosition(review.howScoreEndYear!)!
      ),
    }));

    await fastify.prisma.calibrationItem.createMany({
      data: items,
      skipDuplicates: true,
    });

    // Update session status
    await fastify.prisma.calibrationSession.update({
      where: { id },
      data: {
        status: CalibrationStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    await fastify.audit?.logFromRequest(request, 'STATUS_CHANGE', 'CalibrationSession', id, {
      from: session.status,
      to: 'IN_PROGRESS',
      itemsCreated: items.length,
    });

    return {
      success: true,
      message: `Calibration started with ${items.length} reviews`,
      itemCount: items.length,
    };
  });

  // POST /calibration/sessions/:id/complete - Complete calibration
  fastify.post('/sessions/:id/complete', {
    schema: {
      description: 'Complete calibration and apply adjusted scores',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          applyChanges: { type: 'boolean', default: true },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { applyChanges?: boolean };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    if (session.status !== 'IN_PROGRESS') {
      return reply.status(400).send({
        error: { message: 'Session must be in progress to complete', statusCode: 400 },
      });
    }

    // Apply calibrated scores to reviews if requested
    let appliedCount = 0;
    if (body.applyChanges !== false) {
      const adjustedItems = await fastify.prisma.calibrationItem.findMany({
        where: {
          sessionId: id,
          isAdjusted: true,
          calibratedWhatScore: { not: null },
          calibratedHowScore: { not: null },
        },
      });

      for (const item of adjustedItems) {
        await fastify.prisma.reviewCycle.update({
          where: { id: item.reviewCycleId },
          data: {
            whatScoreEndYear: item.calibratedWhatScore,
            howScoreEndYear: item.calibratedHowScore,
          },
        });

        await fastify.audit?.logFromRequest(request, 'UPDATE', 'ReviewCycle', item.reviewCycleId, {
          calibrationSessionId: id,
          whatScore: { old: item.originalWhatScore, new: item.calibratedWhatScore },
          howScore: { old: item.originalHowScore, new: item.calibratedHowScore },
        });

        appliedCount++;
      }
    }

    // Update session status
    await fastify.prisma.calibrationSession.update({
      where: { id },
      data: {
        status: CalibrationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await fastify.audit?.logFromRequest(request, 'STATUS_CHANGE', 'CalibrationSession', id, {
      from: 'IN_PROGRESS',
      to: 'COMPLETED',
      appliedCount,
    });

    return {
      success: true,
      message: `Calibration completed. ${appliedCount} reviews updated.`,
      appliedCount,
    };
  });

  // ============================================
  // CALIBRATION ITEMS
  // ============================================

  // GET /calibration/sessions/:id/items - Get items in session
  fastify.get('/sessions/:id/items', {
    schema: {
      description: 'Get all calibration items in a session',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          gridPos: { type: 'string', pattern: '^[1-3]-[1-3]$' },
          adjusted: { type: 'boolean' },
          flagged: { type: 'boolean' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as {
      gridPos?: string;
      adjusted?: boolean;
      flagged?: boolean;
    };

    // Verify session access
    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    const items = await fastify.prisma.calibrationItem.findMany({
      where: {
        sessionId: id,
        ...(query.gridPos && { originalGridPos: query.gridPos.replace('-', '').toUpperCase() }),
        ...(query.adjusted !== undefined && { isAdjusted: query.adjusted }),
        ...(query.flagged !== undefined && { flaggedForReview: query.flagged }),
      },
      include: {
        reviewCycle: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                functionTitle: { select: { name: true } },
                businessUnit: { select: { name: true } },
                manager: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        adjustedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ originalWhatScore: 'desc' }, { originalHowScore: 'desc' }],
    });

    return {
      sessionId: id,
      sessionStatus: session.status,
      items: items.map(item => ({
        id: item.id,
        employee: {
          id: item.reviewCycle.employee.id,
          name: `${item.reviewCycle.employee.firstName} ${item.reviewCycle.employee.lastName}`,
          email: item.reviewCycle.employee.email,
          functionTitle: item.reviewCycle.employee.functionTitle?.name || null,
          businessUnit: item.reviewCycle.employee.businessUnit?.name || null,
          manager: item.reviewCycle.employee.manager
            ? `${item.reviewCycle.employee.manager.firstName} ${item.reviewCycle.employee.manager.lastName}`
            : null,
        },
        reviewCycleId: item.reviewCycleId,
        original: {
          whatScore: item.originalWhatScore,
          howScore: item.originalHowScore,
          gridPos: item.originalGridPos,
        },
        calibrated: item.isAdjusted ? {
          whatScore: item.calibratedWhatScore,
          howScore: item.calibratedHowScore,
          gridPos: item.calibratedGridPos,
        } : null,
        isAdjusted: item.isAdjusted,
        adjustmentNotes: item.adjustmentNotes,
        adjustedAt: item.adjustedAt,
        adjustedBy: item.adjustedBy
          ? `${item.adjustedBy.firstName} ${item.adjustedBy.lastName}`
          : null,
        flaggedForReview: item.flaggedForReview,
        flagReason: item.flagReason,
      })),
      totalCount: items.length,
      adjustedCount: items.filter(i => i.isAdjusted).length,
      flaggedCount: items.filter(i => i.flaggedForReview).length,
    };
  });

  // PATCH /calibration/sessions/:id/items/:itemId - Adjust rating
  fastify.patch('/sessions/:id/items/:itemId', {
    schema: {
      description: 'Adjust a calibration item rating',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          itemId: { type: 'string' },
        },
        required: ['id', 'itemId'],
      },
      body: {
        type: 'object',
        properties: {
          whatScore: { type: 'number', minimum: 1, maximum: 3 },
          howScore: { type: 'number', minimum: 1, maximum: 3 },
          notes: { type: 'string', maxLength: 1000 },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const body = request.body as {
      whatScore?: number;
      howScore?: number;
      notes?: string;
    };

    // Verify session
    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    if (session.status !== 'IN_PROGRESS') {
      return reply.status(400).send({
        error: { message: 'Session must be in progress to adjust ratings', statusCode: 400 },
      });
    }

    const item = await fastify.prisma.calibrationItem.findFirst({
      where: { id: itemId, sessionId: id },
    });

    if (!item) {
      return reply.status(404).send({
        error: { message: 'Calibration item not found', statusCode: 404 },
      });
    }

    // Get current user
    const currentUser = await fastify.prisma.user.findUnique({
      where: { keycloakId: request.user.keycloakId },
    });

    // Determine new scores
    const newWhatScore = body.whatScore ?? item.calibratedWhatScore ?? item.originalWhatScore;
    const newHowScore = body.howScore ?? item.calibratedHowScore ?? item.originalHowScore;
    const isChanged = newWhatScore !== item.originalWhatScore || newHowScore !== item.originalHowScore;

    const updated = await fastify.prisma.calibrationItem.update({
      where: { id: itemId },
      data: {
        calibratedWhatScore: newWhatScore,
        calibratedHowScore: newHowScore,
        calibratedGridPos: getGridLabel(
          roundToGridPosition(newWhatScore)!,
          roundToGridPosition(newHowScore)!
        ),
        isAdjusted: isChanged,
        adjustmentNotes: body.notes ?? item.adjustmentNotes,
        adjustedAt: new Date(),
        adjustedById: currentUser?.id,
      },
    });

    await fastify.audit?.logFromRequest(request, 'UPDATE', 'CalibrationItem', itemId, {
      calibrationSessionId: id,
      whatScore: { old: item.originalWhatScore, new: newWhatScore },
      howScore: { old: item.originalHowScore, new: newHowScore },
    });

    return {
      success: true,
      item: {
        id: updated.id,
        original: {
          whatScore: updated.originalWhatScore,
          howScore: updated.originalHowScore,
          gridPos: updated.originalGridPos,
        },
        calibrated: {
          whatScore: updated.calibratedWhatScore,
          howScore: updated.calibratedHowScore,
          gridPos: updated.calibratedGridPos,
        },
        isAdjusted: updated.isAdjusted,
      },
    };
  });

  // POST /calibration/sessions/:id/items/:itemId/flag - Flag item
  fastify.post('/sessions/:id/items/:itemId/flag', {
    schema: {
      description: 'Flag a calibration item for review',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          itemId: { type: 'string' },
        },
        required: ['id', 'itemId'],
      },
      body: {
        type: 'object',
        properties: {
          flagged: { type: 'boolean', default: true },
          reason: { type: 'string', maxLength: 500 },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const body = request.body as { flagged?: boolean; reason?: string };

    const item = await fastify.prisma.calibrationItem.findFirst({
      where: { id: itemId, sessionId: id },
    });

    if (!item) {
      return reply.status(404).send({
        error: { message: 'Calibration item not found', statusCode: 404 },
      });
    }

    const updated = await fastify.prisma.calibrationItem.update({
      where: { id: itemId },
      data: {
        flaggedForReview: body.flagged !== false,
        flagReason: body.reason || null,
      },
    });

    return { success: true, flaggedForReview: updated.flaggedForReview };
  });

  // ============================================
  // ANALYTICS
  // ============================================

  // GET /calibration/sessions/:id/distribution - Current distribution
  fastify.get('/sessions/:id/distribution', {
    schema: {
      description: 'Get rating distribution for calibration session',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    const items = await fastify.prisma.calibrationItem.findMany({
      where: { sessionId: id },
    });

    // Calculate original distribution
    const originalGrid: Record<string, number> = {};
    const calibratedGrid: Record<string, number> = {};
    GRID_POSITIONS.forEach(p => {
      originalGrid[p.key] = 0;
      calibratedGrid[p.key] = 0;
    });

    items.forEach(item => {
      const origKey = getGridKey(item.originalWhatScore, item.originalHowScore);
      if (origKey) originalGrid[origKey]++;

      const calibratedScore = item.isAdjusted && item.calibratedWhatScore && item.calibratedHowScore
        ? getGridKey(item.calibratedWhatScore, item.calibratedHowScore)
        : origKey;
      if (calibratedScore) calibratedGrid[calibratedScore]++;
    });

    const total = items.length;

    // Calculate tier distributions
    const calculateTierDist = (grid: Record<string, number>) => ({
      topTalent: grid['3-3'] + grid['2-3'] + grid['3-2'],
      solidPerformer: grid['2-2'] + grid['1-3'] + grid['3-1'],
      needsAttention: grid['1-2'] + grid['2-1'],
      concern: grid['1-1'],
    });

    return {
      sessionId: id,
      totalItems: total,
      original: {
        grid: originalGrid,
        tiers: calculateTierDist(originalGrid),
      },
      calibrated: {
        grid: calibratedGrid,
        tiers: calculateTierDist(calibratedGrid),
      },
      target: session.targetDistribution,
      enforceDistribution: session.enforceDistribution,
    };
  });

  // GET /calibration/sessions/:id/comparison - Manager comparison
  fastify.get('/sessions/:id/comparison', {
    schema: {
      description: 'Compare rating patterns across managers',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    const items = await fastify.prisma.calibrationItem.findMany({
      where: { sessionId: id },
      include: {
        reviewCycle: {
          include: {
            employee: {
              include: {
                manager: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    // Group by manager
    const managerStats: Record<string, {
      managerId: string;
      managerName: string;
      teamSize: number;
      avgWhatScore: number;
      avgHowScore: number;
      topTalentCount: number;
      concernCount: number;
    }> = {};

    items.forEach(item => {
      const manager = item.reviewCycle.employee.manager;
      if (!manager) return;

      if (!managerStats[manager.id]) {
        managerStats[manager.id] = {
          managerId: manager.id,
          managerName: `${manager.firstName} ${manager.lastName}`,
          teamSize: 0,
          avgWhatScore: 0,
          avgHowScore: 0,
          topTalentCount: 0,
          concernCount: 0,
        };
      }

      const stats = managerStats[manager.id];
      stats.teamSize++;
      stats.avgWhatScore += item.originalWhatScore;
      stats.avgHowScore += item.originalHowScore;

      const whatPos = roundToGridPosition(item.originalWhatScore);
      const howPos = roundToGridPosition(item.originalHowScore);
      const key = `${whatPos}-${howPos}`;

      if (['3-3', '2-3', '3-2'].includes(key)) stats.topTalentCount++;
      if (key === '1-1') stats.concernCount++;
    });

    // Calculate averages
    const managers = Object.values(managerStats).map(m => ({
      ...m,
      avgWhatScore: m.teamSize > 0 ? Math.round((m.avgWhatScore / m.teamSize) * 100) / 100 : 0,
      avgHowScore: m.teamSize > 0 ? Math.round((m.avgHowScore / m.teamSize) * 100) / 100 : 0,
      topTalentPercentage: m.teamSize > 0 ? Math.round((m.topTalentCount / m.teamSize) * 100) : 0,
      concernPercentage: m.teamSize > 0 ? Math.round((m.concernCount / m.teamSize) * 100) : 0,
    }));

    // Calculate company average
    const companyAvgWhat = items.length > 0
      ? items.reduce((sum, i) => sum + i.originalWhatScore, 0) / items.length
      : 0;
    const companyAvgHow = items.length > 0
      ? items.reduce((sum, i) => sum + i.originalHowScore, 0) / items.length
      : 0;

    return {
      sessionId: id,
      companyAverages: {
        whatScore: Math.round(companyAvgWhat * 100) / 100,
        howScore: Math.round(companyAvgHow * 100) / 100,
      },
      managers: managers.sort((a, b) => b.teamSize - a.teamSize),
    };
  });

  // GET /calibration/sessions/:id/anomalies - Detect anomalies
  fastify.get('/sessions/:id/anomalies', {
    schema: {
      description: 'Detect rating anomalies and patterns',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    const items = await fastify.prisma.calibrationItem.findMany({
      where: { sessionId: id },
      include: {
        reviewCycle: {
          include: {
            employee: {
              include: {
                manager: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    // Calculate company averages
    const companyAvgWhat = items.length > 0
      ? items.reduce((sum, i) => sum + i.originalWhatScore, 0) / items.length
      : 0;
    const companyAvgHow = items.length > 0
      ? items.reduce((sum, i) => sum + i.originalHowScore, 0) / items.length
      : 0;

    // Group by manager
    const managerData: Record<string, {
      managerId: string;
      managerName: string;
      items: typeof items;
    }> = {};

    items.forEach(item => {
      const manager = item.reviewCycle.employee.manager;
      if (!manager) return;

      if (!managerData[manager.id]) {
        managerData[manager.id] = {
          managerId: manager.id,
          managerName: `${manager.firstName} ${manager.lastName}`,
          items: [],
        };
      }
      managerData[manager.id].items.push(item);
    });

    // Detect anomalies
    const anomalies: Array<{
      type: 'HIGH_RATINGS' | 'LOW_RATINGS' | 'DEVIATION';
      severity: 'warning' | 'alert';
      managerId: string;
      managerName: string;
      description: string;
      value: number;
      threshold: number;
    }> = [];

    Object.values(managerData).forEach(({ managerId, managerName, items: teamItems }) => {
      if (teamItems.length < ANOMALY_THRESHOLDS.TEAM_SIZE_MINIMUM) return;

      // Count top talent and concerns
      let topTalent = 0;
      let concern = 0;
      let totalWhat = 0;
      let totalHow = 0;

      teamItems.forEach(item => {
        totalWhat += item.originalWhatScore;
        totalHow += item.originalHowScore;

        const whatPos = roundToGridPosition(item.originalWhatScore);
        const howPos = roundToGridPosition(item.originalHowScore);
        const key = `${whatPos}-${howPos}`;

        if (['3-3', '2-3', '3-2'].includes(key)) topTalent++;
        if (key === '1-1') concern++;
      });

      const topTalentPct = topTalent / teamItems.length;
      const concernPct = concern / teamItems.length;
      const avgWhat = totalWhat / teamItems.length;
      const avgHow = totalHow / teamItems.length;

      // Check high rating pattern
      if (topTalentPct > ANOMALY_THRESHOLDS.HIGH_RATING_PERCENTAGE) {
        anomalies.push({
          type: 'HIGH_RATINGS',
          severity: topTalentPct > 0.5 ? 'alert' : 'warning',
          managerId,
          managerName,
          description: `${Math.round(topTalentPct * 100)}% of team rated as Top Talent`,
          value: Math.round(topTalentPct * 100),
          threshold: ANOMALY_THRESHOLDS.HIGH_RATING_PERCENTAGE * 100,
        });
      }

      // Check low rating pattern
      if (concernPct > ANOMALY_THRESHOLDS.LOW_RATING_PERCENTAGE) {
        anomalies.push({
          type: 'LOW_RATINGS',
          severity: 'warning',
          managerId,
          managerName,
          description: `${Math.round(concernPct * 100)}% of team rated as Concern`,
          value: Math.round(concernPct * 100),
          threshold: ANOMALY_THRESHOLDS.LOW_RATING_PERCENTAGE * 100,
        });
      }

      // Check deviation from average
      const whatDeviation = Math.abs(avgWhat - companyAvgWhat);
      const howDeviation = Math.abs(avgHow - companyAvgHow);

      if (whatDeviation > ANOMALY_THRESHOLDS.DEVIATION_FROM_AVERAGE) {
        anomalies.push({
          type: 'DEVIATION',
          severity: whatDeviation > 0.7 ? 'alert' : 'warning',
          managerId,
          managerName,
          description: `WHAT score ${avgWhat > companyAvgWhat ? 'above' : 'below'} company average by ${whatDeviation.toFixed(2)}`,
          value: whatDeviation,
          threshold: ANOMALY_THRESHOLDS.DEVIATION_FROM_AVERAGE,
        });
      }

      if (howDeviation > ANOMALY_THRESHOLDS.DEVIATION_FROM_AVERAGE) {
        anomalies.push({
          type: 'DEVIATION',
          severity: howDeviation > 0.7 ? 'alert' : 'warning',
          managerId,
          managerName,
          description: `HOW score ${avgHow > companyAvgHow ? 'above' : 'below'} company average by ${howDeviation.toFixed(2)}`,
          value: howDeviation,
          threshold: ANOMALY_THRESHOLDS.DEVIATION_FROM_AVERAGE,
        });
      }
    });

    return {
      sessionId: id,
      companyAverages: {
        whatScore: Math.round(companyAvgWhat * 100) / 100,
        howScore: Math.round(companyAvgHow * 100) / 100,
      },
      thresholds: ANOMALY_THRESHOLDS,
      anomalies: anomalies.sort((a, b) =>
        a.severity === 'alert' ? -1 : b.severity === 'alert' ? 1 : 0
      ),
      totalAnomalies: anomalies.length,
      alertCount: anomalies.filter(a => a.severity === 'alert').length,
      warningCount: anomalies.filter(a => a.severity === 'warning').length,
    };
  });

  // ============================================
  // PARTICIPANTS
  // ============================================

  // POST /calibration/sessions/:id/participants - Add participant
  fastify.post('/sessions/:id/participants', {
    schema: {
      description: 'Add participant to calibration session',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          role: { type: 'string', enum: Object.values(CalibrationParticipantRole), default: 'OBSERVER' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { userId: string; role?: CalibrationParticipantRole };

    const session = await fastify.prisma.calibrationSession.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!session) {
      return reply.status(404).send({
        error: { message: 'Calibration session not found', statusCode: 404 },
      });
    }

    const user = await fastify.prisma.user.findFirst({
      where: {
        id: body.userId,
        ...withTenantFilter(request),
      },
    });

    if (!user) {
      return reply.status(400).send({
        error: { message: 'User not found', statusCode: 400 },
      });
    }

    const participant = await fastify.prisma.calibrationParticipant.upsert({
      where: {
        sessionId_userId: { sessionId: id, userId: body.userId },
      },
      create: {
        sessionId: id,
        userId: body.userId,
        role: body.role || CalibrationParticipantRole.OBSERVER,
      },
      update: {
        role: body.role || CalibrationParticipantRole.OBSERVER,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return {
      success: true,
      participant: {
        id: participant.id,
        userId: participant.userId,
        name: `${participant.user.firstName} ${participant.user.lastName}`,
        email: participant.user.email,
        role: participant.role,
      },
    };
  });

  // DELETE /calibration/sessions/:id/participants/:userId - Remove participant
  fastify.delete('/sessions/:id/participants/:userId', {
    schema: {
      description: 'Remove participant from calibration session',
      tags: ['Calibration'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
        },
        required: ['id', 'userId'],
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };

    await fastify.prisma.calibrationParticipant.deleteMany({
      where: { sessionId: id, userId },
    });

    return { success: true };
  });
};
