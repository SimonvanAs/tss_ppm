/**
 * Test helper utilities for API integration tests
 */

import { FastifyInstance } from 'fastify';
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { UserRole } from '../src/plugins/auth.js';

const JWT_SECRET = 'test-secret-key-for-testing-only';

/**
 * Create a mock JWT token for testing
 */
export function createTestToken(payload: {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: { roles: string[] };
  opco_id?: string;
} = {}): string {
  const defaultPayload = {
    sub: 'test-user-id',
    email: 'test@example.com',
    given_name: 'Test',
    family_name: 'User',
    preferred_username: 'testuser',
    realm_access: { roles: ['employee'] },
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  };

  return jwt.sign(defaultPayload, JWT_SECRET);
}

/**
 * Create a token for a specific role
 */
export function createRoleToken(role: UserRole, additionalPayload = {}): string {
  const roleMap: Record<UserRole, string> = {
    [UserRole.EMPLOYEE]: 'employee',
    [UserRole.MANAGER]: 'manager',
    [UserRole.HR]: 'hr',
    [UserRole.OPCO_ADMIN]: 'opco-admin',
    [UserRole.TSS_SUPER_ADMIN]: 'tss-super-admin',
  };

  return createTestToken({
    realm_access: { roles: [roleMap[role]] },
    ...additionalPayload,
  });
}

/**
 * Mock Prisma user lookup for auth
 */
export function mockUserLookup(prisma: any, user: {
  id?: string;
  keycloakId?: string;
  opcoId?: string;
  role?: UserRole;
} | null) {
  prisma.user.findUnique.mockResolvedValue(user ? {
    id: user.id || 'user-123',
    keycloakId: user.keycloakId || 'test-user-id',
    opcoId: user.opcoId || 'opco-123',
    role: user.role || UserRole.EMPLOYEE,
  } : null);
}

/**
 * Test data factory for creating mock entities
 */
export const testData = {
  opco: (overrides = {}) => ({
    id: 'opco-123',
    name: 'test-opco',
    displayName: 'Test OpCo',
    domain: 'test.example.com',
    isActive: true,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: 'user-123',
    opcoId: 'opco-123',
    keycloakId: 'kc-user-123',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.EMPLOYEE,
    managerId: null,
    functionTitleId: null,
    tovLevelId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  review: (overrides = {}) => ({
    id: 'review-123',
    opcoId: 'opco-123',
    userId: 'user-123',
    managerId: 'manager-123',
    reviewYear: 2024,
    status: 'GOAL_SETTING',
    employeeName: 'Test Employee',
    functionTitle: 'Software Developer',
    tovLevelId: 'tov-level-123',
    goalSettingStartedAt: new Date(),
    goalSettingCompletedAt: null,
    midYearStartedAt: null,
    midYearCompletedAt: null,
    endYearStartedAt: null,
    completedAt: null,
    whatScoreMidYear: null,
    howScoreMidYear: null,
    whatScoreEndYear: null,
    howScoreEndYear: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  goal: (overrides = {}) => ({
    id: 'goal-123',
    reviewId: 'review-123',
    opcoId: 'opco-123',
    title: 'Test Goal',
    description: 'Test goal description',
    weight: 50,
    sortOrder: 0,
    scoreMidYear: null,
    scoreEndYear: null,
    commentMidYear: null,
    commentEndYear: null,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  competencyScore: (overrides = {}) => ({
    id: 'score-123',
    reviewId: 'review-123',
    opcoId: 'opco-123',
    competencyLevelId: 'comp-level-123',
    scoreMidYear: null,
    scoreEndYear: null,
    commentMidYear: null,
    commentEndYear: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  functionTitle: (overrides = {}) => ({
    id: 'func-title-123',
    opcoId: 'opco-123',
    name: 'Software Developer',
    description: 'Develops software applications',
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  tovLevel: (overrides = {}) => ({
    id: 'tov-level-123',
    opcoId: 'opco-123',
    code: 'B',
    name: 'TOV Level B',
    description: { en: 'Professional level', nl: 'Professioneel niveau', es: 'Nivel profesional' },
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  competencyLevel: (overrides = {}) => ({
    id: 'comp-level-123',
    opcoId: 'opco-123',
    competencyId: 'comp-1',
    tovLevelId: 'tov-level-123',
    category: 'Leadership',
    subcategory: 'Communication',
    title: { en: 'Clear Communication', nl: 'Duidelijke Communicatie', es: 'Comunicación Clara' },
    indicators: { en: ['Speaks clearly', 'Listens actively'], nl: [], es: [] },
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  goalChangeRequest: (overrides = {}) => ({
    id: 'change-req-123',
    opcoId: 'opco-123',
    goalId: 'goal-123',
    requestedBy: 'user-123',
    reviewedBy: null,
    status: 'PENDING',
    requestType: 'MODIFICATION',
    originalTitle: 'Original Goal',
    proposedTitle: 'Updated Goal',
    originalDescription: 'Original description',
    proposedDescription: 'Updated description',
    originalWeight: 50,
    proposedWeight: 60,
    reason: 'Business priorities changed',
    reviewerComment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Create authorization header
 */
export function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}
