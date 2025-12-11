import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserRole } from '../../plugins/auth.js';
import { withTenantFilter } from '../../plugins/tenant.js';

// Grid position configuration
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

// Performance tier classification
function getPerformanceLevel(whatPos: number, howPos: number): string {
  const key = `${whatPos}-${howPos}`;
  const topTalent = ['3-3', '2-3', '3-2'];
  const solid = ['2-2', '1-3', '3-1'];
  const needsAttention = ['1-2', '2-1'];

  if (topTalent.includes(key)) return 'Top Talent';
  if (solid.includes(key)) return 'Solid Performer';
  if (needsAttention.includes(key)) return 'Needs Attention';
  return 'Concern';
}

// Grid cell colors
function getGridColor(whatPos: number, howPos: number): string {
  const key = `${whatPos}-${howPos}`;
  const colors: Record<string, string> = {
    '1-1': '#DC3545', // Red - Concern
    '1-2': '#FFA500', // Orange
    '2-1': '#FFA500', // Orange
    '1-3': '#28A745', // Green
    '2-2': '#28A745', // Green
    '3-1': '#28A745', // Green
    '2-3': '#1B5E20', // Dark Green
    '3-2': '#1B5E20', // Dark Green
    '3-3': '#1B5E20', // Dark Green - Top Talent
  };
  return colors[key] || '#6c757d';
}

// Round score to grid position (1-3)
function roundToGridPosition(score: number | null): number | null {
  if (score === null || score === undefined) return null;
  if (score < 1.5) return 1;
  if (score < 2.5) return 2;
  return 3;
}

export const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // GET /analytics/9grid - Main analytics endpoint
  fastify.get('/9grid', {
    schema: {
      description: 'Get 9-grid analytics at different organizational levels',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['manager', 'bu', 'company'], default: 'manager' },
          year: { type: 'integer' },
          stage: { type: 'string', enum: ['midYear', 'endYear'], default: 'endYear' },
          businessUnitId: { type: 'string' },
          managerId: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const query = request.query as {
      level?: 'manager' | 'bu' | 'company';
      year?: number;
      stage?: 'midYear' | 'endYear';
      businessUnitId?: string;
      managerId?: string;
    };

    const level = query.level || 'manager';
    const year = query.year || new Date().getFullYear();
    const stage = query.stage || 'endYear';
    const scoreField = stage === 'midYear' ? 'whatScoreMidYear' : 'whatScoreEndYear';
    const howScoreField = stage === 'midYear' ? 'howScoreMidYear' : 'howScoreEndYear';

    // Access control based on level
    const userRole = request.user.role;
    const isHROrAdmin = [UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN].includes(userRole);

    // BU and Company level require HR+ access
    if ((level === 'bu' || level === 'company') && !isHROrAdmin) {
      return reply.status(403).send({
        error: { message: 'Insufficient permissions for this analytics level', statusCode: 403 },
      });
    }

    // Build scope name and filter
    let scopeName = '';
    let scopeId = '';
    let userFilter: Record<string, unknown> = {};

    if (level === 'manager') {
      // Get manager ID - either from query (for HR+) or current user
      let managerId = query.managerId;

      if (!managerId) {
        // Get current user's database ID
        const currentUser = await fastify.prisma.user.findUnique({
          where: { keycloakId: request.user.keycloakId },
        });
        if (!currentUser) {
          return reply.status(404).send({
            error: { message: 'User not found', statusCode: 404 },
          });
        }
        managerId = currentUser.id;
      } else if (!isHROrAdmin) {
        // Non-HR users can only see their own team
        const currentUser = await fastify.prisma.user.findUnique({
          where: { keycloakId: request.user.keycloakId },
        });
        if (currentUser?.id !== managerId) {
          return reply.status(403).send({
            error: { message: 'Cannot view other managers\' analytics', statusCode: 403 },
          });
        }
      }

      const manager = await fastify.prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!manager) {
        return reply.status(404).send({
          error: { message: 'Manager not found', statusCode: 404 },
        });
      }

      scopeName = `${manager.firstName} ${manager.lastName}'s Team`;
      scopeId = manager.id;
      userFilter = { managerId: manager.id };

    } else if (level === 'bu') {
      if (!query.businessUnitId) {
        return reply.status(400).send({
          error: { message: 'businessUnitId is required for BU-level analytics', statusCode: 400 },
        });
      }

      const bu = await fastify.prisma.businessUnit.findFirst({
        where: {
          id: query.businessUnitId,
          ...withTenantFilter(request),
        },
      });

      if (!bu) {
        return reply.status(404).send({
          error: { message: 'Business Unit not found', statusCode: 404 },
        });
      }

      scopeName = bu.name;
      scopeId = bu.id;
      userFilter = { businessUnitId: bu.id };

    } else {
      // Company level - all users in OpCo
      const opco = await fastify.prisma.opCo.findFirst({
        where: { id: request.tenant.opcoId },
      });

      scopeName = opco?.displayName || opco?.name || 'Company';
      scopeId = request.tenant.opcoId;
      // No additional user filter - tenant filter handles it
    }

    // Get all reviews with scores for the selected scope
    const reviews = await fastify.prisma.reviewCycle.findMany({
      where: {
        ...withTenantFilter(request),
        year,
        employee: {
          ...withTenantFilter(request),
          ...userFilter,
          isActive: true,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            functionTitle: { select: { name: true } },
            businessUnit: { select: { name: true } },
          },
        },
      },
    });

    // Count total employees in scope
    const totalEmployees = await fastify.prisma.user.count({
      where: {
        ...withTenantFilter(request),
        ...userFilter,
        isActive: true,
      },
    });

    // Calculate grid distribution
    const gridCounts: Record<string, { count: number; employees: Array<{ id: string; name: string }> }> = {};

    // Initialize all positions
    GRID_POSITIONS.forEach(pos => {
      gridCounts[pos.key] = { count: 0, employees: [] };
    });

    let scoredEmployees = 0;
    let completedReviews = 0;
    let totalWhatScore = 0;
    let totalHowScore = 0;
    let scoredCount = 0;

    reviews.forEach(review => {
      const whatScore = stage === 'midYear' ? review.whatScoreMidYear : review.whatScoreEndYear;
      const howScore = stage === 'midYear' ? review.howScoreMidYear : review.howScoreEndYear;

      if (review.status === 'COMPLETED') {
        completedReviews++;
      }

      if (whatScore !== null && howScore !== null) {
        scoredEmployees++;
        totalWhatScore += whatScore;
        totalHowScore += howScore;
        scoredCount++;

        const whatPos = roundToGridPosition(whatScore);
        const howPos = roundToGridPosition(howScore);

        if (whatPos && howPos) {
          const key = `${whatPos}-${howPos}`;
          if (gridCounts[key]) {
            gridCounts[key].count++;
            gridCounts[key].employees.push({
              id: review.employee.id,
              name: `${review.employee.firstName} ${review.employee.lastName}`,
            });
          }
        }
      }
    });

    // Build grid response
    const grid: Record<string, {
      count: number;
      percentage: number;
      label: string;
      performanceLevel: string;
      color: string;
    }> = {};

    GRID_POSITIONS.forEach(pos => {
      const count = gridCounts[pos.key].count;
      grid[pos.key] = {
        count,
        percentage: scoredEmployees > 0 ? Math.round((count / scoredEmployees) * 100 * 10) / 10 : 0,
        label: pos.label,
        performanceLevel: getPerformanceLevel(pos.what, pos.how),
        color: getGridColor(pos.what, pos.how),
      };
    });

    // Calculate distribution by performance tier
    const distribution = {
      topTalent: (gridCounts['3-3'].count + gridCounts['2-3'].count + gridCounts['3-2'].count),
      solidPerformer: (gridCounts['2-2'].count + gridCounts['1-3'].count + gridCounts['3-1'].count),
      needsAttention: (gridCounts['1-2'].count + gridCounts['2-1'].count),
      concern: gridCounts['1-1'].count,
    };

    return {
      level,
      scope: {
        name: scopeName,
        id: scopeId,
        year,
        stage,
      },
      summary: {
        totalEmployees,
        scoredEmployees,
        completedReviews,
        completionRate: totalEmployees > 0 ? Math.round((completedReviews / totalEmployees) * 100) : 0,
        avgWhatScore: scoredCount > 0 ? Math.round((totalWhatScore / scoredCount) * 100) / 100 : null,
        avgHowScore: scoredCount > 0 ? Math.round((totalHowScore / scoredCount) * 100) / 100 : null,
      },
      grid,
      distribution,
    };
  });

  // GET /analytics/9grid/:boxKey/employees - Drill-down to employee list
  fastify.get('/9grid/:boxKey/employees', {
    schema: {
      description: 'Get employees in a specific 9-grid position',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          boxKey: { type: 'string', pattern: '^[1-3]-[1-3]$' },
        },
        required: ['boxKey'],
      },
      querystring: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['manager', 'bu', 'company'], default: 'manager' },
          year: { type: 'integer' },
          stage: { type: 'string', enum: ['midYear', 'endYear'], default: 'endYear' },
          businessUnitId: { type: 'string' },
          managerId: { type: 'string' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20, maximum: 100 },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { boxKey } = request.params as { boxKey: string };
    const query = request.query as {
      level?: 'manager' | 'bu' | 'company';
      year?: number;
      stage?: 'midYear' | 'endYear';
      businessUnitId?: string;
      managerId?: string;
      page?: number;
      limit?: number;
    };

    const [whatPosStr, howPosStr] = boxKey.split('-');
    const whatPos = parseInt(whatPosStr, 10);
    const howPos = parseInt(howPosStr, 10);

    if (isNaN(whatPos) || isNaN(howPos) || whatPos < 1 || whatPos > 3 || howPos < 1 || howPos > 3) {
      return reply.status(400).send({
        error: { message: 'Invalid boxKey format. Expected: 1-1 to 3-3', statusCode: 400 },
      });
    }

    const level = query.level || 'manager';
    const year = query.year || new Date().getFullYear();
    const stage = query.stage || 'endYear';
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Access control
    const userRole = request.user.role;
    const isHROrAdmin = [UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN].includes(userRole);

    if ((level === 'bu' || level === 'company') && !isHROrAdmin) {
      return reply.status(403).send({
        error: { message: 'Insufficient permissions', statusCode: 403 },
      });
    }

    // Build user filter based on level
    let userFilter: Record<string, unknown> = {};

    if (level === 'manager') {
      let managerId = query.managerId;
      if (!managerId) {
        const currentUser = await fastify.prisma.user.findUnique({
          where: { keycloakId: request.user.keycloakId },
        });
        managerId = currentUser?.id;
      } else if (!isHROrAdmin) {
        const currentUser = await fastify.prisma.user.findUnique({
          where: { keycloakId: request.user.keycloakId },
        });
        if (currentUser?.id !== managerId) {
          return reply.status(403).send({
            error: { message: 'Cannot view other managers\' data', statusCode: 403 },
          });
        }
      }
      userFilter = { managerId };
    } else if (level === 'bu') {
      if (!query.businessUnitId) {
        return reply.status(400).send({
          error: { message: 'businessUnitId required for BU level', statusCode: 400 },
        });
      }
      userFilter = { businessUnitId: query.businessUnitId };
    }

    // Calculate score ranges for the grid position
    const whatScoreMin = whatPos === 1 ? 1 : whatPos === 2 ? 1.5 : 2.5;
    const whatScoreMax = whatPos === 1 ? 1.5 : whatPos === 2 ? 2.5 : 3;
    const howScoreMin = howPos === 1 ? 1 : howPos === 2 ? 1.5 : 2.5;
    const howScoreMax = howPos === 1 ? 1.5 : howPos === 2 ? 2.5 : 3;

    const whatScoreField = stage === 'midYear' ? 'whatScoreMidYear' : 'whatScoreEndYear';
    const howScoreField = stage === 'midYear' ? 'howScoreMidYear' : 'howScoreEndYear';

    // Query for employees in this grid position
    const whereClause = {
      ...withTenantFilter(request),
      year,
      [whatScoreField]: {
        gte: whatScoreMin,
        lt: whatPos === 3 ? 3.01 : whatScoreMax, // Include max for position 3
      },
      [howScoreField]: {
        gte: howScoreMin,
        lt: howPos === 3 ? 3.01 : howScoreMax,
      },
      employee: {
        ...withTenantFilter(request),
        ...userFilter,
        isActive: true,
      },
    };

    const [reviews, total] = await Promise.all([
      fastify.prisma.reviewCycle.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              functionTitle: { select: { name: true } },
              businessUnit: { select: { name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { [whatScoreField]: 'desc' },
          { [howScoreField]: 'desc' },
        ],
      }),
      fastify.prisma.reviewCycle.count({ where: whereClause }),
    ]);

    const gridPos = GRID_POSITIONS.find(p => p.key === boxKey);

    return {
      boxKey,
      label: gridPos?.label || boxKey,
      performanceLevel: getPerformanceLevel(whatPos, howPos),
      color: getGridColor(whatPos, howPos),
      employees: reviews.map(review => ({
        id: review.employee.id,
        firstName: review.employee.firstName,
        lastName: review.employee.lastName,
        email: review.employee.email,
        functionTitle: review.employee.functionTitle?.name || null,
        businessUnit: review.employee.businessUnit?.name || null,
        whatScore: stage === 'midYear' ? review.whatScoreMidYear : review.whatScoreEndYear,
        howScore: stage === 'midYear' ? review.howScoreMidYear : review.howScoreEndYear,
        reviewId: review.id,
        reviewStatus: review.status,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // GET /analytics/9grid/trends - Historical trends
  fastify.get('/9grid/trends', {
    schema: {
      description: 'Get 9-grid distribution trends over multiple years',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['manager', 'bu', 'company'], default: 'company' },
          fromYear: { type: 'integer' },
          toYear: { type: 'integer' },
          businessUnitId: { type: 'string' },
          managerId: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const query = request.query as {
      level?: 'manager' | 'bu' | 'company';
      fromYear?: number;
      toYear?: number;
      businessUnitId?: string;
      managerId?: string;
    };

    const currentYear = new Date().getFullYear();
    const fromYear = query.fromYear || currentYear - 4;
    const toYear = query.toYear || currentYear;
    const level = query.level || 'company';

    // Build user filter based on level
    let userFilter: Record<string, unknown> = {};
    if (level === 'manager' && query.managerId) {
      userFilter = { managerId: query.managerId };
    } else if (level === 'bu' && query.businessUnitId) {
      userFilter = { businessUnitId: query.businessUnitId };
    }

    const years: Array<{
      year: number;
      distribution: {
        topTalent: number;
        solidPerformer: number;
        needsAttention: number;
        concern: number;
      };
      avgWhatScore: number | null;
      avgHowScore: number | null;
      totalScored: number;
    }> = [];

    for (let year = fromYear; year <= toYear; year++) {
      const reviews = await fastify.prisma.reviewCycle.findMany({
        where: {
          ...withTenantFilter(request),
          year,
          whatScoreEndYear: { not: null },
          howScoreEndYear: { not: null },
          employee: {
            ...withTenantFilter(request),
            ...userFilter,
          },
        },
        select: {
          whatScoreEndYear: true,
          howScoreEndYear: true,
        },
      });

      const gridCounts: Record<string, number> = {};
      GRID_POSITIONS.forEach(pos => { gridCounts[pos.key] = 0; });

      let totalWhat = 0;
      let totalHow = 0;

      reviews.forEach(review => {
        if (review.whatScoreEndYear !== null && review.howScoreEndYear !== null) {
          totalWhat += review.whatScoreEndYear;
          totalHow += review.howScoreEndYear;

          const whatPos = roundToGridPosition(review.whatScoreEndYear);
          const howPos = roundToGridPosition(review.howScoreEndYear);

          if (whatPos && howPos) {
            const key = `${whatPos}-${howPos}`;
            gridCounts[key] = (gridCounts[key] || 0) + 1;
          }
        }
      });

      years.push({
        year,
        distribution: {
          topTalent: gridCounts['3-3'] + gridCounts['2-3'] + gridCounts['3-2'],
          solidPerformer: gridCounts['2-2'] + gridCounts['1-3'] + gridCounts['3-1'],
          needsAttention: gridCounts['1-2'] + gridCounts['2-1'],
          concern: gridCounts['1-1'],
        },
        avgWhatScore: reviews.length > 0 ? Math.round((totalWhat / reviews.length) * 100) / 100 : null,
        avgHowScore: reviews.length > 0 ? Math.round((totalHow / reviews.length) * 100) / 100 : null,
        totalScored: reviews.length,
      });
    }

    return {
      level,
      fromYear,
      toYear,
      years,
    };
  });

  // GET /analytics/business-units - List BUs with summary stats
  fastify.get('/business-units', {
    schema: {
      description: 'List business units with performance summary',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'integer' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const query = request.query as { year?: number };
    const year = query.year || new Date().getFullYear();

    const businessUnits = await fastify.prisma.businessUnit.findMany({
      where: {
        ...withTenantFilter(request),
        isActive: true,
      },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Get review stats for each BU
    const buStats = await Promise.all(
      businessUnits.map(async (bu) => {
        const reviews = await fastify.prisma.reviewCycle.findMany({
          where: {
            ...withTenantFilter(request),
            year,
            employee: {
              businessUnitId: bu.id,
            },
            whatScoreEndYear: { not: null },
            howScoreEndYear: { not: null },
          },
          select: {
            whatScoreEndYear: true,
            howScoreEndYear: true,
          },
        });

        let topTalent = 0;
        let totalWhat = 0;
        let totalHow = 0;

        reviews.forEach(review => {
          if (review.whatScoreEndYear && review.howScoreEndYear) {
            totalWhat += review.whatScoreEndYear;
            totalHow += review.howScoreEndYear;

            const whatPos = roundToGridPosition(review.whatScoreEndYear);
            const howPos = roundToGridPosition(review.howScoreEndYear);

            if ((whatPos === 3 && howPos === 3) || (whatPos === 2 && howPos === 3) || (whatPos === 3 && howPos === 2)) {
              topTalent++;
            }
          }
        });

        return {
          id: bu.id,
          code: bu.code,
          name: bu.name,
          head: bu.head ? `${bu.head.firstName} ${bu.head.lastName}` : null,
          employeeCount: bu._count.users,
          scoredCount: reviews.length,
          topTalentCount: topTalent,
          avgWhatScore: reviews.length > 0 ? Math.round((totalWhat / reviews.length) * 100) / 100 : null,
          avgHowScore: reviews.length > 0 ? Math.round((totalHow / reviews.length) * 100) / 100 : null,
        };
      })
    );

    return {
      year,
      businessUnits: buStats,
    };
  });
};
