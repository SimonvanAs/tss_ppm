import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserRole } from '../../plugins/auth.js';
import { withTenantFilter } from '../../plugins/tenant.js';
import { markAsAudited, computeChanges } from '../../plugins/audit.js';
import {
  createReviewCycleSchema,
  updateReviewCycleSchema,
  reviewQuerySchema,
  createGoalSchema,
  updateGoalSchema,
  reorderGoalsSchema,
  updateCompetencyScoreSchema,
  startStageSchema,
  completeStageSchema,
} from '../../schemas/index.js';
import {
  calculateWhatScore,
  calculateHowScore,
  validateWeights,
  calculateTotalWeight,
  calculateReviewScores,
} from '../../utils/scoring.js';

// Valid status transitions for the review cycle state machine
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['GOAL_SETTING'],
  GOAL_SETTING: ['GOAL_SETTING_COMPLETE'],
  GOAL_SETTING_COMPLETE: ['MID_YEAR_REVIEW'],
  MID_YEAR_REVIEW: ['MID_YEAR_COMPLETE'],
  MID_YEAR_COMPLETE: ['END_YEAR_REVIEW'],
  END_YEAR_REVIEW: ['COMPLETED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

// Map stage type to required cycle statuses
const STAGE_STATUS_MAP: Record<string, { start: string; complete: string }> = {
  GOAL_SETTING: { start: 'GOAL_SETTING', complete: 'GOAL_SETTING_COMPLETE' },
  MID_YEAR_REVIEW: { start: 'MID_YEAR_REVIEW', complete: 'MID_YEAR_COMPLETE' },
  END_YEAR_REVIEW: { start: 'END_YEAR_REVIEW', complete: 'COMPLETED' },
};

export const reviewsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List review cycles (role-based filtering)
  fastify.get('/', {
    schema: {
      description: 'List review cycles (filtered by role)',
      tags: ['Reviews'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'integer' },
          status: { type: 'string' },
          employeeId: { type: 'string' },
          managerId: { type: 'string' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20, maximum: 100 },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const parseResult = reviewQuerySchema.safeParse(request.query);
    const query = parseResult.success ? parseResult.data : {
      page: 1,
      limit: 20,
      ...(request.query as object),
    };

    const skip = (query.page - 1) * query.limit;

    // Build where clause based on role
    let roleFilter = {};
    switch (request.user.role) {
      case UserRole.EMPLOYEE:
        // Employees only see their own reviews
        roleFilter = { employee: { keycloakId: request.user.keycloakId } };
        break;
      case UserRole.MANAGER:
        // Managers see their direct reports' reviews and their own
        roleFilter = {
          OR: [
            { manager: { keycloakId: request.user.keycloakId } },
            { employee: { keycloakId: request.user.keycloakId } },
          ],
        };
        break;
      case UserRole.HR:
      case UserRole.OPCO_ADMIN:
      case UserRole.TSS_SUPER_ADMIN:
        // HR and admins can see all within tenant
        break;
    }

    const where = {
      ...withTenantFilter(request),
      ...roleFilter,
      ...(query.year && { year: query.year }),
      ...(query.status && { status: query.status }),
      ...(query.employeeId && { employeeId: query.employeeId }),
      ...(query.managerId && { managerId: query.managerId }),
    };

    const [reviews, total] = await Promise.all([
      fastify.prisma.reviewCycle.findMany({
        where,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          manager: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          tovLevel: true,
          stages: true,
        },
        skip,
        take: query.limit,
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      }),
      fastify.prisma.reviewCycle.count({ where }),
    ]);

    return {
      data: reviews.map(review => ({
        ...review,
        scores: {
          midYear: {
            whatScore: review.whatScoreMidYear,
            howScore: review.howScoreMidYear,
          },
          endYear: {
            whatScore: review.whatScoreEndYear,
            howScore: review.howScoreEndYear,
          },
        },
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  });

  // Get single review cycle with full details
  fastify.get('/:id', {
    schema: {
      description: 'Get review cycle by ID with all details',
      tags: ['Reviews'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const review = await fastify.prisma.reviewCycle.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            functionTitle: { select: { id: true, name: true } },
          },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        hrUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tovLevel: true,
        stages: {
          orderBy: { stageType: 'asc' },
        },
        goals: {
          orderBy: { sortOrder: 'asc' },
        },
        competencyScores: {
          include: {
            competencyLevel: true,
          },
          orderBy: { competencyLevel: { sortOrder: 'asc' } },
        },
        goalChangeRequests: {
          where: { status: 'PENDING' },
          include: {
            requestedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            goal: true,
          },
          orderBy: { requestedAt: 'desc' },
        },
      },
    });

    if (!review) {
      return reply.status(404).send({
        error: { message: 'Review cycle not found', statusCode: 404 },
      });
    }

    // Check access based on role
    const userId = request.user.keycloakId;
    const isEmployee = review.employee.keycloakId === userId;
    const isManager = review.manager.keycloakId === userId;
    const isHR = review.hrUser?.keycloakId === userId;
    const isAdmin = [UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN].includes(request.user.role);

    if (!isEmployee && !isManager && !isHR && !isAdmin) {
      return reply.status(403).send({
        error: { message: 'Forbidden', statusCode: 403 },
      });
    }

    // Audit log access
    await fastify.audit.logFromRequest(request, {
      entityType: 'ReviewCycle',
      entityId: review.id,
      action: 'ACCESS',
      reviewCycleId: review.id,
      metadata: { employeeName: `${review.employee.firstName} ${review.employee.lastName}` },
    });

    // Calculate current scores
    const midYearScores = calculateReviewScores(
      review.goals.map(g => ({
        title: g.title,
        weight: g.weight,
        scoreMidYear: g.scoreMidYear,
        scoreEndYear: g.scoreEndYear,
      })),
      review.competencyScores,
      'midYear'
    );

    const endYearScores = calculateReviewScores(
      review.goals.map(g => ({
        title: g.title,
        weight: g.weight,
        scoreMidYear: g.scoreMidYear,
        scoreEndYear: g.scoreEndYear,
      })),
      review.competencyScores,
      'endYear'
    );

    return {
      ...review,
      calculatedScores: {
        midYear: midYearScores,
        endYear: endYearScores,
      },
      goalValidation: {
        totalWeight: calculateTotalWeight(review.goals.map(g => ({ title: g.title, weight: g.weight }))),
        isValid: validateWeights(review.goals.map(g => ({ title: g.title, weight: g.weight }))),
      },
      permissions: {
        canEdit: isEmployee || isManager || isAdmin,
        canScore: isManager || isAdmin,
        canApproveGoalChanges: isManager || isAdmin,
        canCompleteStage: isManager || isAdmin,
        isEmployee,
        isManager,
      },
    };
  });

  // Create review cycle
  fastify.post('/', {
    schema: {
      description: 'Create a new review cycle',
      tags: ['Reviews'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          employeeId: { type: 'string' },
          managerId: { type: 'string' },
          year: { type: 'integer' },
          tovLevelId: { type: 'string' },
          hrUserId: { type: 'string' },
        },
        required: ['employeeId', 'managerId', 'year', 'tovLevelId'],
      },
    },
    preHandler: [fastify.authorize(UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const parseResult = createReviewCycleSchema.safeParse(request.body);
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

    // Check if review already exists for this employee/year
    const existing = await fastify.prisma.reviewCycle.findFirst({
      where: {
        employeeId: body.employeeId,
        year: body.year,
        ...withTenantFilter(request),
      },
    });

    if (existing) {
      return reply.status(409).send({
        error: { message: 'Review cycle already exists for this employee and year', statusCode: 409 },
      });
    }

    // Get competency levels for the TOV level
    const competencyLevels = await fastify.prisma.competencyLevel.findMany({
      where: {
        tovLevelId: body.tovLevelId,
        ...withTenantFilter(request),
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Create review cycle with stages and competency scores
    const review = await fastify.prisma.reviewCycle.create({
      data: {
        opcoId: request.tenant.opcoId,
        employeeId: body.employeeId,
        managerId: body.managerId,
        year: body.year,
        tovLevelId: body.tovLevelId,
        hrUserId: body.hrUserId,
        status: 'DRAFT',
        stages: {
          create: [
            { stageType: 'GOAL_SETTING', status: 'PENDING' },
            { stageType: 'MID_YEAR_REVIEW', status: 'PENDING' },
            { stageType: 'END_YEAR_REVIEW', status: 'PENDING' },
          ],
        },
        // Initialize competency scores for all competencies in the TOV level
        competencyScores: {
          create: competencyLevels.map(cl => ({
            competencyLevelId: cl.id,
          })),
        },
      },
      include: {
        stages: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        competencyScores: {
          include: { competencyLevel: true },
        },
      },
    });

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'ReviewCycle',
      entityId: review.id,
      action: 'CREATE',
      reviewCycleId: review.id,
      metadata: {
        year: review.year,
        employeeName: `${review.employee.firstName} ${review.employee.lastName}`,
      },
    });
    markAsAudited(request);

    return reply.status(201).send(review);
  });

  // Update review cycle
  fastify.patch('/:id', {
    schema: {
      description: 'Update review cycle metadata',
      tags: ['Reviews'],
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

    const parseResult = updateReviewCycleSchema.safeParse(request.body);
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

    const existingReview = await fastify.prisma.reviewCycle.findFirst({
      where: { id, ...withTenantFilter(request) },
    });

    if (!existingReview) {
      return reply.status(404).send({
        error: { message: 'Review cycle not found', statusCode: 404 },
      });
    }

    const review = await fastify.prisma.reviewCycle.update({
      where: { id },
      data: body,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        stages: true,
      },
    });

    // Log changes
    const changes = computeChanges(existingReview as Record<string, unknown>, body as Record<string, unknown>);
    if (Object.keys(changes).length > 0) {
      await fastify.audit.logFromRequest(request, {
        entityType: 'ReviewCycle',
        entityId: review.id,
        action: 'UPDATE',
        changes,
        reviewCycleId: review.id,
      });
    }
    markAsAudited(request);

    return review;
  });

  // ============================================
  // STAGE TRANSITIONS
  // ============================================

  // Start a stage
  fastify.post('/:id/stages/:stage/start', {
    schema: {
      description: 'Start a review stage',
      tags: ['Reviews'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          stage: { type: 'string', enum: ['GOAL_SETTING', 'MID_YEAR_REVIEW', 'END_YEAR_REVIEW'] },
        },
        required: ['id', 'stage'],
      },
    },
    preHandler: [fastify.authorize(UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id, stage } = request.params as { id: string; stage: string };
    const stageType = stage.toUpperCase() as 'GOAL_SETTING' | 'MID_YEAR_REVIEW' | 'END_YEAR_REVIEW';

    const review = await fastify.prisma.reviewCycle.findFirst({
      where: { id, ...withTenantFilter(request) },
      include: { stages: true, goals: true },
    });

    if (!review) {
      return reply.status(404).send({
        error: { message: 'Review cycle not found', statusCode: 404 },
      });
    }

    // Validate state transition
    const stageConfig = STAGE_STATUS_MAP[stageType];
    const expectedPreviousStatus = stageType === 'GOAL_SETTING' ? 'DRAFT' :
      stageType === 'MID_YEAR_REVIEW' ? 'GOAL_SETTING_COMPLETE' :
      'MID_YEAR_COMPLETE';

    if (review.status !== expectedPreviousStatus) {
      return reply.status(400).send({
        error: {
          message: `Cannot start ${stageType}. Current status: ${review.status}. Required: ${expectedPreviousStatus}`,
          statusCode: 400,
        },
      });
    }

    // For MID_YEAR and END_YEAR, verify goals are complete
    if (stageType !== 'GOAL_SETTING') {
      if (review.goals.length === 0) {
        return reply.status(400).send({
          error: { message: 'Cannot start review stage: No goals defined', statusCode: 400 },
        });
      }
      if (!validateWeights(review.goals.map(g => ({ title: g.title, weight: g.weight })))) {
        return reply.status(400).send({
          error: { message: 'Cannot start review stage: Goal weights must sum to 100%', statusCode: 400 },
        });
      }
    }

    // Update stage and cycle status
    await fastify.prisma.$transaction([
      fastify.prisma.reviewStage.updateMany({
        where: {
          reviewCycleId: id,
          stageType,
        },
        data: {
          status: 'IN_PROGRESS',
        },
      }),
      fastify.prisma.reviewCycle.update({
        where: { id },
        data: {
          status: stageConfig.start,
          ...(stageType === 'GOAL_SETTING' && { goalSettingStart: new Date() }),
          ...(stageType === 'MID_YEAR_REVIEW' && { midYearStart: new Date() }),
          ...(stageType === 'END_YEAR_REVIEW' && { endYearStart: new Date() }),
        },
      }),
    ]);

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'ReviewCycle',
      entityId: id,
      action: 'STAGE_START',
      reviewCycleId: id,
      metadata: { stageType },
    });
    markAsAudited(request);

    return { success: true, stage: stageType, status: 'IN_PROGRESS' };
  });

  // Complete a stage
  fastify.post('/:id/stages/:stage/complete', {
    schema: {
      description: 'Complete a review stage',
      tags: ['Reviews'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          stage: { type: 'string', enum: ['GOAL_SETTING', 'MID_YEAR_REVIEW', 'END_YEAR_REVIEW'] },
        },
        required: ['id', 'stage'],
      },
      body: {
        type: 'object',
        properties: {
          employeeComments: { type: 'string' },
          managerComments: { type: 'string' },
          selfAssessment: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id, stage } = request.params as { id: string; stage: string };
    const body = request.body as {
      employeeComments?: string;
      managerComments?: string;
      selfAssessment?: string;
    };
    const stageType = stage.toUpperCase() as 'GOAL_SETTING' | 'MID_YEAR_REVIEW' | 'END_YEAR_REVIEW';

    const review = await fastify.prisma.reviewCycle.findFirst({
      where: { id, ...withTenantFilter(request) },
      include: { stages: true, goals: true, competencyScores: true },
    });

    if (!review) {
      return reply.status(404).send({
        error: { message: 'Review cycle not found', statusCode: 404 },
      });
    }

    const currentStage = review.stages.find(s => s.stageType === stageType);
    if (!currentStage || currentStage.status !== 'IN_PROGRESS') {
      return reply.status(400).send({
        error: { message: `Stage ${stageType} is not in progress`, statusCode: 400 },
      });
    }

    // Validate based on stage type
    if (stageType === 'GOAL_SETTING') {
      // Validate goals are complete
      if (review.goals.length === 0) {
        return reply.status(400).send({
          error: { message: 'At least one goal is required', statusCode: 400 },
        });
      }
      if (!validateWeights(review.goals.map(g => ({ title: g.title, weight: g.weight })))) {
        return reply.status(400).send({
          error: { message: 'Goal weights must sum to 100%', statusCode: 400 },
        });
      }
    } else {
      // Validate all goals are scored
      const scoreField = stageType === 'MID_YEAR_REVIEW' ? 'scoreMidYear' : 'scoreEndYear';
      const unscoredGoals = review.goals.filter(g => g[scoreField] === null);
      if (unscoredGoals.length > 0) {
        return reply.status(400).send({
          error: {
            message: `All goals must be scored. ${unscoredGoals.length} goals missing scores.`,
            statusCode: 400,
          },
        });
      }

      // Validate all competencies are scored
      const unscoredCompetencies = review.competencyScores.filter(cs => cs[scoreField] === null);
      if (unscoredCompetencies.length > 0) {
        return reply.status(400).send({
          error: {
            message: `All competencies must be scored. ${unscoredCompetencies.length} competencies missing scores.`,
            statusCode: 400,
          },
        });
      }
    }

    // Calculate and store scores
    const stageKey = stageType === 'MID_YEAR_REVIEW' ? 'midYear' : 'endYear';
    const whatScore = stageType !== 'GOAL_SETTING' ? calculateWhatScore(
      review.goals.map(g => ({
        title: g.title,
        weight: g.weight,
        scoreMidYear: g.scoreMidYear,
        scoreEndYear: g.scoreEndYear,
      })),
      stageKey
    ) : null;

    const howScore = stageType !== 'GOAL_SETTING' ? calculateHowScore(
      review.competencyScores,
      stageKey
    ) : null;

    const stageConfig = STAGE_STATUS_MAP[stageType];

    // Transaction to update everything
    await fastify.prisma.$transaction([
      // Update stage
      fastify.prisma.reviewStage.update({
        where: { id: currentStage.id },
        data: {
          status: 'COMPLETED',
          employeeComments: body.employeeComments,
          managerComments: body.managerComments,
          selfAssessment: body.selfAssessment,
          managerCompletedAt: new Date(),
        },
      }),
      // Update cycle status and scores
      fastify.prisma.reviewCycle.update({
        where: { id },
        data: {
          status: stageConfig.complete,
          ...(stageType === 'GOAL_SETTING' && { goalSettingEnd: new Date() }),
          ...(stageType === 'MID_YEAR_REVIEW' && {
            midYearEnd: new Date(),
            whatScoreMidYear: whatScore,
            howScoreMidYear: howScore,
          }),
          ...(stageType === 'END_YEAR_REVIEW' && {
            endYearEnd: new Date(),
            whatScoreEndYear: whatScore,
            howScoreEndYear: howScore,
          }),
        },
      }),
      // Lock goals after goal setting
      ...(stageType === 'GOAL_SETTING' ? [
        fastify.prisma.goal.updateMany({
          where: { reviewCycleId: id },
          data: { isLocked: true },
        }),
      ] : []),
    ]);

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'ReviewCycle',
      entityId: id,
      action: 'STAGE_COMPLETE',
      reviewCycleId: id,
      metadata: {
        stageType,
        whatScore,
        howScore,
      },
    });
    markAsAudited(request);

    return {
      success: true,
      stage: stageType,
      status: 'COMPLETED',
      scores: stageType !== 'GOAL_SETTING' ? { whatScore, howScore } : undefined,
    };
  });

  // ============================================
  // GOALS
  // ============================================

  // Get goals for a review cycle
  fastify.get('/:id/goals', {
    schema: {
      description: 'Get goals for a review cycle',
      tags: ['Reviews', 'Goals'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };

    const goals = await fastify.prisma.goal.findMany({
      where: {
        reviewCycleId: id,
        reviewCycle: withTenantFilter(request),
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      goals,
      totalWeight: calculateTotalWeight(goals.map(g => ({ title: g.title, weight: g.weight }))),
      isWeightValid: validateWeights(goals.map(g => ({ title: g.title, weight: g.weight }))),
    };
  });

  // Add goal
  fastify.post('/:id/goals', {
    schema: {
      description: 'Add a goal to a review cycle',
      tags: ['Reviews', 'Goals'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          description: { type: 'string', maxLength: 5000 },
          weight: { type: 'integer', minimum: 0, maximum: 100 },
        },
        required: ['title', 'weight'],
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parseResult = createGoalSchema.safeParse(request.body);
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

    // Get review and verify access
    const review = await fastify.prisma.reviewCycle.findFirst({
      where: { id, ...withTenantFilter(request) },
      include: { goals: true, employee: true, manager: true },
    });

    if (!review) {
      return reply.status(404).send({
        error: { message: 'Review cycle not found', statusCode: 404 },
      });
    }

    // Check if goals can be added (only during DRAFT or GOAL_SETTING, or via change request)
    const canAddDirectly = ['DRAFT', 'GOAL_SETTING'].includes(review.status);
    const isEmployee = review.employee.keycloakId === request.user.keycloakId;
    const isManager = review.manager.keycloakId === request.user.keycloakId;
    const isAdmin = [UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN].includes(request.user.role);

    if (!canAddDirectly) {
      // After goal setting, only managers/admins can add goals directly
      // Employees must use change requests
      if (isEmployee && !isManager && !isAdmin) {
        return reply.status(400).send({
          error: {
            message: 'Goals are locked. Please submit a goal change request.',
            statusCode: 400,
          },
        });
      }
    }

    // Verify user can edit this review
    if (!isEmployee && !isManager && !isAdmin) {
      return reply.status(403).send({
        error: { message: 'Forbidden', statusCode: 403 },
      });
    }

    // Check goal limit
    if (review.goals.length >= 9) {
      return reply.status(400).send({
        error: { message: 'Maximum of 9 goals allowed', statusCode: 400 },
      });
    }

    // Get max sort order
    const maxSort = await fastify.prisma.goal.aggregate({
      where: { reviewCycleId: id },
      _max: { sortOrder: true },
    });

    const goal = await fastify.prisma.goal.create({
      data: {
        reviewCycleId: id,
        title: body.title,
        description: body.description,
        weight: body.weight,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
        isLocked: !canAddDirectly, // Lock if adding outside goal setting
      },
    });

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'Goal',
      entityId: goal.id,
      action: 'CREATE',
      reviewCycleId: id,
      metadata: { title: goal.title, weight: goal.weight },
    });
    markAsAudited(request);

    return reply.status(201).send(goal);
  });

  // Update goal
  fastify.patch('/:id/goals/:goalId', {
    schema: {
      description: 'Update a goal',
      tags: ['Reviews', 'Goals'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, goalId } = request.params as { id: string; goalId: string };

    const parseResult = updateGoalSchema.safeParse(request.body);
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

    // Get goal and review
    const existingGoal = await fastify.prisma.goal.findFirst({
      where: {
        id: goalId,
        reviewCycleId: id,
        reviewCycle: withTenantFilter(request),
      },
      include: {
        reviewCycle: {
          include: { employee: true, manager: true },
        },
      },
    });

    if (!existingGoal) {
      return reply.status(404).send({
        error: { message: 'Goal not found', statusCode: 404 },
      });
    }

    const review = existingGoal.reviewCycle;
    const isEmployee = review.employee.keycloakId === request.user.keycloakId;
    const isManager = review.manager.keycloakId === request.user.keycloakId;
    const isAdmin = [UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN].includes(request.user.role);

    // Check what can be edited
    const isLocked = existingGoal.isLocked;
    const isScoringField = body.scoreMidYear !== undefined || body.scoreEndYear !== undefined ||
                          body.notesMidYear !== undefined || body.notesEndYear !== undefined;
    const isMetadataField = body.title !== undefined || body.description !== undefined || body.weight !== undefined;

    // Scoring can only be done by managers/admins during review stages
    if (isScoringField && !isManager && !isAdmin) {
      return reply.status(403).send({
        error: { message: 'Only managers can score goals', statusCode: 403 },
      });
    }

    // Metadata changes on locked goals require approval (unless manager/admin)
    if (isLocked && isMetadataField && !isManager && !isAdmin) {
      return reply.status(400).send({
        error: {
          message: 'Goal is locked. Submit a goal change request to modify.',
          statusCode: 400,
        },
      });
    }

    const goal = await fastify.prisma.goal.update({
      where: { id: goalId },
      data: body,
    });

    // Log changes
    const changes = computeChanges(existingGoal as unknown as Record<string, unknown>, body as Record<string, unknown>);
    if (Object.keys(changes).length > 0) {
      await fastify.audit.logFromRequest(request, {
        entityType: 'Goal',
        entityId: goal.id,
        action: 'UPDATE',
        changes,
        reviewCycleId: id,
      });
    }
    markAsAudited(request);

    return goal;
  });

  // Delete goal
  fastify.delete('/:id/goals/:goalId', {
    schema: {
      description: 'Delete a goal',
      tags: ['Reviews', 'Goals'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, goalId } = request.params as { id: string; goalId: string };

    const goal = await fastify.prisma.goal.findFirst({
      where: {
        id: goalId,
        reviewCycleId: id,
        reviewCycle: withTenantFilter(request),
      },
      include: {
        reviewCycle: {
          include: { employee: true, manager: true },
        },
      },
    });

    if (!goal) {
      return reply.status(404).send({
        error: { message: 'Goal not found', statusCode: 404 },
      });
    }

    const review = goal.reviewCycle;
    const isManager = review.manager.keycloakId === request.user.keycloakId;
    const isAdmin = [UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN].includes(request.user.role);

    // Only allow deletion during goal setting or by manager/admin
    if (goal.isLocked && !isManager && !isAdmin) {
      return reply.status(400).send({
        error: {
          message: 'Goal is locked. Submit a goal change request to delete.',
          statusCode: 400,
        },
      });
    }

    await fastify.prisma.goal.delete({
      where: { id: goalId },
    });

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'Goal',
      entityId: goalId,
      action: 'DELETE',
      reviewCycleId: id,
      metadata: { title: goal.title },
    });
    markAsAudited(request);

    return reply.status(204).send();
  });

  // Reorder goals
  fastify.post('/:id/goals/reorder', {
    schema: {
      description: 'Reorder goals',
      tags: ['Reviews', 'Goals'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          goalIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['goalIds'],
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parseResult = reorderGoalsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          message: 'Validation failed',
          statusCode: 400,
          details: parseResult.error.errors,
        },
      });
    }

    const { goalIds } = parseResult.data;

    // Verify review exists
    const review = await fastify.prisma.reviewCycle.findFirst({
      where: { id, ...withTenantFilter(request) },
    });

    if (!review) {
      return reply.status(404).send({
        error: { message: 'Review cycle not found', statusCode: 404 },
      });
    }

    // Update sort orders
    await fastify.prisma.$transaction(
      goalIds.map((goalId, index) =>
        fastify.prisma.goal.update({
          where: { id: goalId },
          data: { sortOrder: index + 1 },
        })
      )
    );

    return { success: true };
  });

  // ============================================
  // COMPETENCY SCORES
  // ============================================

  // Get competency scores
  fastify.get('/:id/competencies', {
    schema: {
      description: 'Get competency scores for a review cycle',
      tags: ['Reviews', 'Competencies'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };

    const scores = await fastify.prisma.competencyScore.findMany({
      where: {
        reviewCycleId: id,
        reviewCycle: withTenantFilter(request),
      },
      include: {
        competencyLevel: true,
      },
      orderBy: { competencyLevel: { sortOrder: 'asc' } },
    });

    // Calculate HOW scores
    const midYearHowScore = calculateHowScore(scores, 'midYear');
    const endYearHowScore = calculateHowScore(scores, 'endYear');

    return {
      competencyScores: scores,
      howScores: {
        midYear: midYearHowScore,
        endYear: endYearHowScore,
      },
      vetoApplied: {
        midYear: midYearHowScore === 1 && scores.some(s => s.scoreMidYear === 1),
        endYear: endYearHowScore === 1 && scores.some(s => s.scoreEndYear === 1),
      },
    };
  });

  // Update competency score
  fastify.patch('/:id/competencies/:competencyScoreId', {
    schema: {
      description: 'Update a competency score',
      tags: ['Reviews', 'Competencies'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id, competencyScoreId } = request.params as { id: string; competencyScoreId: string };

    const parseResult = updateCompetencyScoreSchema.safeParse(request.body);
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

    // Verify competency score exists and belongs to the review
    const existingScore = await fastify.prisma.competencyScore.findFirst({
      where: {
        id: competencyScoreId,
        reviewCycleId: id,
        reviewCycle: withTenantFilter(request),
      },
      include: { competencyLevel: true },
    });

    if (!existingScore) {
      return reply.status(404).send({
        error: { message: 'Competency score not found', statusCode: 404 },
      });
    }

    const score = await fastify.prisma.competencyScore.update({
      where: { id: competencyScoreId },
      data: body,
      include: { competencyLevel: true },
    });

    // Log changes
    const changes = computeChanges(existingScore as unknown as Record<string, unknown>, body as Record<string, unknown>);
    if (Object.keys(changes).length > 0) {
      await fastify.audit.logFromRequest(request, {
        entityType: 'CompetencyScore',
        entityId: score.id,
        action: 'UPDATE',
        changes,
        reviewCycleId: id,
        metadata: {
          competencyTitle: score.competencyLevel.title,
        },
      });
    }
    markAsAudited(request);

    // Check if VETO rule applies
    const allScores = await fastify.prisma.competencyScore.findMany({
      where: { reviewCycleId: id },
    });

    const midYearHowScore = calculateHowScore(allScores, 'midYear');
    const endYearHowScore = calculateHowScore(allScores, 'endYear');

    return {
      ...score,
      howScores: {
        midYear: midYearHowScore,
        endYear: endYearHowScore,
      },
      vetoApplied: {
        midYear: midYearHowScore === 1,
        endYear: endYearHowScore === 1,
      },
    };
  });

  // ============================================
  // GOAL CHANGE REQUESTS
  // ============================================

  // Get pending change requests
  fastify.get('/:id/change-requests', {
    schema: {
      description: 'Get goal change requests for a review cycle',
      tags: ['Reviews', 'Change Requests'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };

    const changeRequests = await fastify.prisma.goalChangeRequest.findMany({
      where: {
        reviewCycleId: id,
        reviewCycle: withTenantFilter(request),
      },
      include: {
        requestedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        goal: true,
      },
      orderBy: { requestedAt: 'desc' },
    });

    return changeRequests;
  });

  // Create goal change request
  fastify.post('/:id/change-requests', {
    schema: {
      description: 'Create a goal change request',
      tags: ['Reviews', 'Change Requests'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          changeType: { type: 'string', enum: ['ADD', 'MODIFY', 'DELETE', 'WEIGHT_CHANGE'] },
          goalId: { type: 'string' },
          proposedData: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              weight: { type: 'integer' },
            },
          },
          reason: { type: 'string' },
        },
        required: ['changeType', 'proposedData'],
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      changeType: 'ADD' | 'MODIFY' | 'DELETE' | 'WEIGHT_CHANGE';
      goalId?: string;
      proposedData: { title?: string; description?: string; weight?: number };
      reason?: string;
    };

    // Get review
    const review = await fastify.prisma.reviewCycle.findFirst({
      where: { id, ...withTenantFilter(request) },
      include: { employee: true },
    });

    if (!review) {
      return reply.status(404).send({
        error: { message: 'Review cycle not found', statusCode: 404 },
      });
    }

    // Verify user is the employee or has higher role
    const isEmployee = review.employee.keycloakId === request.user.keycloakId;
    if (!isEmployee && request.user.role === UserRole.EMPLOYEE) {
      return reply.status(403).send({
        error: { message: 'Forbidden', statusCode: 403 },
      });
    }

    // Get requesting user's ID
    const requestingUser = await fastify.prisma.user.findUnique({
      where: { keycloakId: request.user.keycloakId },
    });

    if (!requestingUser) {
      return reply.status(404).send({
        error: { message: 'User not found', statusCode: 404 },
      });
    }

    // Get original goal data if modifying/deleting
    let originalData = null;
    if (body.goalId) {
      const goal = await fastify.prisma.goal.findUnique({
        where: { id: body.goalId },
      });
      if (goal) {
        originalData = {
          title: goal.title,
          description: goal.description,
          weight: goal.weight,
        };
      }
    }

    const changeRequest = await fastify.prisma.goalChangeRequest.create({
      data: {
        reviewCycleId: id,
        goalId: body.goalId,
        changeType: body.changeType,
        originalData,
        proposedData: body.proposedData,
        reason: body.reason,
        requestedById: requestingUser.id,
      },
      include: {
        requestedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        goal: true,
      },
    });

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'GoalChangeRequest',
      entityId: changeRequest.id,
      action: 'GOAL_CHANGE_REQUEST',
      reviewCycleId: id,
      metadata: {
        changeType: body.changeType,
        goalId: body.goalId,
      },
    });
    markAsAudited(request);

    return reply.status(201).send(changeRequest);
  });

  // Approve change request
  fastify.post('/:id/change-requests/:requestId/approve', {
    schema: {
      description: 'Approve a goal change request',
      tags: ['Reviews', 'Change Requests'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id, requestId } = request.params as { id: string; requestId: string };
    const body = request.body as { approverNotes?: string };

    const changeRequest = await fastify.prisma.goalChangeRequest.findFirst({
      where: {
        id: requestId,
        reviewCycleId: id,
        status: 'PENDING',
        reviewCycle: withTenantFilter(request),
      },
    });

    if (!changeRequest) {
      return reply.status(404).send({
        error: { message: 'Change request not found or already processed', statusCode: 404 },
      });
    }

    const approvingUser = await fastify.prisma.user.findUnique({
      where: { keycloakId: request.user.keycloakId },
    });

    // Apply the change based on type
    const proposedData = changeRequest.proposedData as { title?: string; description?: string; weight?: number };

    await fastify.prisma.$transaction(async (tx) => {
      switch (changeRequest.changeType) {
        case 'ADD':
          const maxSort = await tx.goal.aggregate({
            where: { reviewCycleId: id },
            _max: { sortOrder: true },
          });
          await tx.goal.create({
            data: {
              reviewCycleId: id,
              title: proposedData.title || 'New Goal',
              description: proposedData.description,
              weight: proposedData.weight || 0,
              sortOrder: (maxSort._max.sortOrder || 0) + 1,
              isLocked: true,
            },
          });
          break;

        case 'MODIFY':
        case 'WEIGHT_CHANGE':
          if (changeRequest.goalId) {
            await tx.goal.update({
              where: { id: changeRequest.goalId },
              data: proposedData,
            });
          }
          break;

        case 'DELETE':
          if (changeRequest.goalId) {
            await tx.goal.delete({
              where: { id: changeRequest.goalId },
            });
          }
          break;
      }

      // Update change request status
      await tx.goalChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedById: approvingUser?.id,
          approverNotes: body.approverNotes,
          respondedAt: new Date(),
        },
      });
    });

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'GoalChangeRequest',
      entityId: requestId,
      action: 'GOAL_CHANGE_APPROVE',
      reviewCycleId: id,
      metadata: { changeType: changeRequest.changeType },
    });
    markAsAudited(request);

    return { success: true, status: 'APPROVED' };
  });

  // Reject change request
  fastify.post('/:id/change-requests/:requestId/reject', {
    schema: {
      description: 'Reject a goal change request',
      tags: ['Reviews', 'Change Requests'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id, requestId } = request.params as { id: string; requestId: string };
    const body = request.body as { approverNotes?: string };

    const changeRequest = await fastify.prisma.goalChangeRequest.findFirst({
      where: {
        id: requestId,
        reviewCycleId: id,
        status: 'PENDING',
        reviewCycle: withTenantFilter(request),
      },
    });

    if (!changeRequest) {
      return reply.status(404).send({
        error: { message: 'Change request not found or already processed', statusCode: 404 },
      });
    }

    const approvingUser = await fastify.prisma.user.findUnique({
      where: { keycloakId: request.user.keycloakId },
    });

    await fastify.prisma.goalChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approvedById: approvingUser?.id,
        approverNotes: body.approverNotes,
        respondedAt: new Date(),
      },
    });

    // Audit log
    await fastify.audit.logFromRequest(request, {
      entityType: 'GoalChangeRequest',
      entityId: requestId,
      action: 'GOAL_CHANGE_REJECT',
      reviewCycleId: id,
      metadata: { changeType: changeRequest.changeType },
    });
    markAsAudited(request);

    return { success: true, status: 'REJECTED' };
  });
};
