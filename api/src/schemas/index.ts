// Zod Validation Schemas for TSS PPM API
import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Multi-language text schema
export const multiLangTextSchema = z.object({
  en: z.string(),
  nl: z.string(),
  es: z.string(),
});

// ============================================
// USER SCHEMAS
// ============================================

export const userRoleSchema = z.enum([
  'EMPLOYEE',
  'MANAGER',
  'HR',
  'OPCO_ADMIN',
  'TSS_SUPER_ADMIN',
]);

export const createUserSchema = z.object({
  keycloakId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  role: userRoleSchema.default('EMPLOYEE'),
  opcoId: uuidSchema,
  functionTitleId: uuidSchema.optional(),
  tovLevelId: uuidSchema.optional(),
  managerId: uuidSchema.optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().max(200).optional(),
  role: userRoleSchema.optional(),
  functionTitleId: uuidSchema.nullable().optional(),
  tovLevelId: uuidSchema.nullable().optional(),
  managerId: uuidSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

export const userQuerySchema = paginationSchema.extend({
  role: userRoleSchema.optional(),
  managerId: uuidSchema.optional(),
  search: z.string().max(100).optional(),
  isActive: z.coerce.boolean().optional(),
});

// ============================================
// REVIEW CYCLE SCHEMAS
// ============================================

export const cycleStatusSchema = z.enum([
  'DRAFT',
  'GOAL_SETTING',
  'GOAL_SETTING_COMPLETE',
  'MID_YEAR_REVIEW',
  'MID_YEAR_COMPLETE',
  'END_YEAR_REVIEW',
  'COMPLETED',
  'ARCHIVED',
]);

export const stageTypeSchema = z.enum([
  'GOAL_SETTING',
  'MID_YEAR_REVIEW',
  'END_YEAR_REVIEW',
]);

export const stageStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'COMPLETED',
  'SKIPPED',
]);

export const createReviewCycleSchema = z.object({
  employeeId: uuidSchema,
  managerId: uuidSchema,
  year: z.number().int().min(2020).max(2100),
  tovLevelId: uuidSchema,
  hrUserId: uuidSchema.optional(),
});

export const updateReviewCycleSchema = z.object({
  summary: z.string().max(5000).optional(),
  hrUserId: uuidSchema.nullable().optional(),
  goalSettingStart: z.string().datetime().optional(),
  goalSettingEnd: z.string().datetime().optional(),
  midYearStart: z.string().datetime().optional(),
  midYearEnd: z.string().datetime().optional(),
  endYearStart: z.string().datetime().optional(),
  endYearEnd: z.string().datetime().optional(),
});

export const reviewQuerySchema = paginationSchema.extend({
  year: z.coerce.number().int().optional(),
  status: cycleStatusSchema.optional(),
  employeeId: uuidSchema.optional(),
  managerId: uuidSchema.optional(),
});

// ============================================
// GOAL SCHEMAS
// ============================================

export const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  weight: z.number().int().min(0).max(100),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  weight: z.number().int().min(0).max(100).optional(),
  scoreMidYear: z.number().int().min(1).max(3).nullable().optional(),
  scoreEndYear: z.number().int().min(1).max(3).nullable().optional(),
  notesMidYear: z.string().max(5000).optional(),
  notesEndYear: z.string().max(5000).optional(),
});

export const reorderGoalsSchema = z.object({
  goalIds: z.array(uuidSchema).min(1),
});

// ============================================
// COMPETENCY SCORE SCHEMAS
// ============================================

export const updateCompetencyScoreSchema = z.object({
  scoreMidYear: z.number().int().min(1).max(3).nullable().optional(),
  scoreEndYear: z.number().int().min(1).max(3).nullable().optional(),
  notesMidYear: z.string().max(5000).optional(),
  notesEndYear: z.string().max(5000).optional(),
});

// ============================================
// GOAL CHANGE REQUEST SCHEMAS
// ============================================

export const goalChangeTypeSchema = z.enum([
  'ADD',
  'MODIFY',
  'DELETE',
  'WEIGHT_CHANGE',
]);

export const approvalStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
]);

export const createGoalChangeRequestSchema = z.object({
  changeType: goalChangeTypeSchema,
  goalId: uuidSchema.optional(), // Required for MODIFY, DELETE, WEIGHT_CHANGE
  proposedData: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    weight: z.number().int().min(0).max(100).optional(),
  }),
  reason: z.string().max(2000).optional(),
});

export const respondToChangeRequestSchema = z.object({
  approverNotes: z.string().max(2000).optional(),
});

// ============================================
// STAGE TRANSITION SCHEMAS
// ============================================

export const startStageSchema = z.object({
  stage: stageTypeSchema,
});

export const completeStageSchema = z.object({
  stage: stageTypeSchema,
  employeeComments: z.string().max(5000).optional(),
  managerComments: z.string().max(5000).optional(),
  selfAssessment: z.string().max(5000).optional(),
});

// ============================================
// ADMIN SCHEMAS
// ============================================

export const createFunctionTitleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().default(0),
});

export const updateFunctionTitleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const createTovLevelSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  description: multiLangTextSchema.optional(),
  sortOrder: z.number().int().default(0),
});

export const updateTovLevelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: multiLangTextSchema.optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const createCompetencyLevelSchema = z.object({
  competencyId: z.string().min(1).max(100),
  tovLevelId: uuidSchema,
  category: z.string().min(1).max(100),
  subcategory: z.string().min(1).max(100),
  title: multiLangTextSchema,
  indicators: z.object({
    en: z.array(z.string()),
    nl: z.array(z.string()),
    es: z.array(z.string()),
  }),
  sortOrder: z.number().int().default(0),
});

export const updateCompetencyLevelSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  subcategory: z.string().min(1).max(100).optional(),
  title: multiLangTextSchema.optional(),
  indicators: z.object({
    en: z.array(z.string()),
    nl: z.array(z.string()),
    es: z.array(z.string()),
  }).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// SUPER ADMIN SCHEMAS
// ============================================

export const createOpCoSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Name must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1).max(200),
  domain: z.string().max(100).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const updateOpCoSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  domain: z.string().max(100).optional(),
  settings: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;

export type CreateReviewCycle = z.infer<typeof createReviewCycleSchema>;
export type UpdateReviewCycle = z.infer<typeof updateReviewCycleSchema>;
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;

export type CreateGoal = z.infer<typeof createGoalSchema>;
export type UpdateGoal = z.infer<typeof updateGoalSchema>;
export type ReorderGoals = z.infer<typeof reorderGoalsSchema>;

export type UpdateCompetencyScore = z.infer<typeof updateCompetencyScoreSchema>;

export type CreateGoalChangeRequest = z.infer<typeof createGoalChangeRequestSchema>;
export type RespondToChangeRequest = z.infer<typeof respondToChangeRequestSchema>;

export type CreateFunctionTitle = z.infer<typeof createFunctionTitleSchema>;
export type UpdateFunctionTitle = z.infer<typeof updateFunctionTitleSchema>;

export type CreateTovLevel = z.infer<typeof createTovLevelSchema>;
export type UpdateTovLevel = z.infer<typeof updateTovLevelSchema>;

export type CreateCompetencyLevel = z.infer<typeof createCompetencyLevelSchema>;
export type UpdateCompetencyLevel = z.infer<typeof updateCompetencyLevelSchema>;

export type CreateOpCo = z.infer<typeof createOpCoSchema>;
export type UpdateOpCo = z.infer<typeof updateOpCoSchema>;
