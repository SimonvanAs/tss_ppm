-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('DRAFT', 'GOAL_SETTING', 'GOAL_SETTING_COMPLETE', 'MID_YEAR_REVIEW', 'MID_YEAR_COMPLETE', 'END_YEAR_REVIEW', 'PENDING_EMPLOYEE_SIGNATURE', 'PENDING_MANAGER_SIGNATURE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('GOAL_SETTING', 'MID_YEAR_REVIEW', 'END_YEAR_REVIEW');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "GoalChangeType" AS ENUM ('ADD', 'MODIFY', 'DELETE', 'WEIGHT_CHANGE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CalibrationScope" AS ENUM ('MANAGER', 'BUSINESS_UNIT', 'COMPANY');

-- CreateEnum
CREATE TYPE "CalibrationParticipantRole" AS ENUM ('FACILITATOR', 'MANAGER', 'OBSERVER');

-- CreateTable
CREATE TABLE "opcos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opcos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "keycloakId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opcoId" TEXT NOT NULL,
    "functionTitleId" TEXT,
    "tovLevelId" TEXT,
    "managerId" TEXT,
    "businessUnitId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_units" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opcoId" TEXT NOT NULL,
    "parentId" TEXT,
    "headId" TEXT,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "function_titles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opcoId" TEXT NOT NULL,
    "tovLevelId" TEXT,

    CONSTRAINT "function_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tov_levels" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opcoId" TEXT NOT NULL,

    CONSTRAINT "tov_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_levels" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "indicators" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opcoId" TEXT NOT NULL,
    "tovLevelId" TEXT NOT NULL,

    CONSTRAINT "competency_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_cycles" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'DRAFT',
    "goalSettingStart" TIMESTAMP(3),
    "goalSettingEnd" TIMESTAMP(3),
    "midYearStart" TIMESTAMP(3),
    "midYearEnd" TIMESTAMP(3),
    "endYearStart" TIMESTAMP(3),
    "endYearEnd" TIMESTAMP(3),
    "whatScoreMidYear" DOUBLE PRECISION,
    "whatScoreEndYear" DOUBLE PRECISION,
    "howScoreMidYear" DOUBLE PRECISION,
    "howScoreEndYear" DOUBLE PRECISION,
    "summary" TEXT,
    "employeeSignedAt" TIMESTAMP(3),
    "employeeSignature" TEXT,
    "employeeSignComment" TEXT,
    "managerSignedAt" TIMESTAMP(3),
    "managerSignature" TEXT,
    "managerSignComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opcoId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "hrUserId" TEXT,
    "tovLevelId" TEXT NOT NULL,

    CONSTRAINT "review_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_stages" (
    "id" TEXT NOT NULL,
    "stageType" "StageType" NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "employeeComments" TEXT,
    "managerComments" TEXT,
    "selfAssessment" TEXT,
    "employeeCompletedAt" TIMESTAMP(3),
    "managerCompletedAt" TIMESTAMP(3),
    "hrApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewCycleId" TEXT NOT NULL,

    CONSTRAINT "review_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "scoreMidYear" INTEGER,
    "scoreEndYear" INTEGER,
    "notesMidYear" TEXT,
    "notesEndYear" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewCycleId" TEXT NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_scores" (
    "id" TEXT NOT NULL,
    "scoreMidYear" INTEGER,
    "scoreEndYear" INTEGER,
    "notesMidYear" TEXT,
    "notesEndYear" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewCycleId" TEXT NOT NULL,
    "competencyLevelId" TEXT NOT NULL,

    CONSTRAINT "competency_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_change_requests" (
    "id" TEXT NOT NULL,
    "changeType" "GoalChangeType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "originalData" JSONB,
    "proposedData" JSONB NOT NULL,
    "reason" TEXT,
    "approverNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "reviewCycleId" TEXT NOT NULL,
    "goalId" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "goal_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "reviewCycleId" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "CalibrationStatus" NOT NULL DEFAULT 'DRAFT',
    "scope" "CalibrationScope" NOT NULL DEFAULT 'BUSINESS_UNIT',
    "targetDistribution" JSONB,
    "enforceDistribution" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opcoId" TEXT NOT NULL,
    "businessUnitId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "calibration_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_items" (
    "id" TEXT NOT NULL,
    "originalWhatScore" DOUBLE PRECISION NOT NULL,
    "originalHowScore" DOUBLE PRECISION NOT NULL,
    "originalGridPos" TEXT NOT NULL,
    "calibratedWhatScore" DOUBLE PRECISION,
    "calibratedHowScore" DOUBLE PRECISION,
    "calibratedGridPos" TEXT,
    "isAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "adjustmentNotes" TEXT,
    "adjustedAt" TIMESTAMP(3),
    "adjustedById" TEXT,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reviewCycleId" TEXT NOT NULL,

    CONSTRAINT "calibration_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_participants" (
    "id" TEXT NOT NULL,
    "role" "CalibrationParticipantRole" NOT NULL DEFAULT 'OBSERVER',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "calibration_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opcos_name_key" ON "opcos"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloakId_key" ON "users"("keycloakId");

-- CreateIndex
CREATE INDEX "users_opcoId_idx" ON "users"("opcoId");

-- CreateIndex
CREATE INDEX "users_managerId_idx" ON "users"("managerId");

-- CreateIndex
CREATE INDEX "users_businessUnitId_idx" ON "users"("businessUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "users_opcoId_email_key" ON "users"("opcoId", "email");

-- CreateIndex
CREATE INDEX "business_units_opcoId_idx" ON "business_units"("opcoId");

-- CreateIndex
CREATE INDEX "business_units_parentId_idx" ON "business_units"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "business_units_opcoId_code_key" ON "business_units"("opcoId", "code");

-- CreateIndex
CREATE INDEX "function_titles_opcoId_idx" ON "function_titles"("opcoId");

-- CreateIndex
CREATE INDEX "function_titles_tovLevelId_idx" ON "function_titles"("tovLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "function_titles_opcoId_name_key" ON "function_titles"("opcoId", "name");

-- CreateIndex
CREATE INDEX "tov_levels_opcoId_idx" ON "tov_levels"("opcoId");

-- CreateIndex
CREATE UNIQUE INDEX "tov_levels_opcoId_code_key" ON "tov_levels"("opcoId", "code");

-- CreateIndex
CREATE INDEX "competency_levels_opcoId_idx" ON "competency_levels"("opcoId");

-- CreateIndex
CREATE INDEX "competency_levels_tovLevelId_idx" ON "competency_levels"("tovLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "competency_levels_opcoId_tovLevelId_competencyId_key" ON "competency_levels"("opcoId", "tovLevelId", "competencyId");

-- CreateIndex
CREATE INDEX "review_cycles_opcoId_idx" ON "review_cycles"("opcoId");

-- CreateIndex
CREATE INDEX "review_cycles_employeeId_idx" ON "review_cycles"("employeeId");

-- CreateIndex
CREATE INDEX "review_cycles_managerId_idx" ON "review_cycles"("managerId");

-- CreateIndex
CREATE INDEX "review_cycles_year_idx" ON "review_cycles"("year");

-- CreateIndex
CREATE UNIQUE INDEX "review_cycles_opcoId_employeeId_year_key" ON "review_cycles"("opcoId", "employeeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "review_stages_reviewCycleId_stageType_key" ON "review_stages"("reviewCycleId", "stageType");

-- CreateIndex
CREATE INDEX "goals_reviewCycleId_idx" ON "goals"("reviewCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "competency_scores_reviewCycleId_competencyLevelId_key" ON "competency_scores"("reviewCycleId", "competencyLevelId");

-- CreateIndex
CREATE INDEX "goal_change_requests_reviewCycleId_idx" ON "goal_change_requests"("reviewCycleId");

-- CreateIndex
CREATE INDEX "goal_change_requests_status_idx" ON "goal_change_requests"("status");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "calibration_sessions_opcoId_idx" ON "calibration_sessions"("opcoId");

-- CreateIndex
CREATE INDEX "calibration_sessions_year_idx" ON "calibration_sessions"("year");

-- CreateIndex
CREATE INDEX "calibration_sessions_status_idx" ON "calibration_sessions"("status");

-- CreateIndex
CREATE INDEX "calibration_items_sessionId_idx" ON "calibration_items"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "calibration_items_sessionId_reviewCycleId_key" ON "calibration_items"("sessionId", "reviewCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "calibration_participants_sessionId_userId_key" ON "calibration_participants"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_functionTitleId_fkey" FOREIGN KEY ("functionTitleId") REFERENCES "function_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tovLevelId_fkey" FOREIGN KEY ("tovLevelId") REFERENCES "tov_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_headId_fkey" FOREIGN KEY ("headId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_titles" ADD CONSTRAINT "function_titles_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_titles" ADD CONSTRAINT "function_titles_tovLevelId_fkey" FOREIGN KEY ("tovLevelId") REFERENCES "tov_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tov_levels" ADD CONSTRAINT "tov_levels_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_levels" ADD CONSTRAINT "competency_levels_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_levels" ADD CONSTRAINT "competency_levels_tovLevelId_fkey" FOREIGN KEY ("tovLevelId") REFERENCES "tov_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_hrUserId_fkey" FOREIGN KEY ("hrUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_tovLevelId_fkey" FOREIGN KEY ("tovLevelId") REFERENCES "tov_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_stages" ADD CONSTRAINT "review_stages_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "review_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "review_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_scores" ADD CONSTRAINT "competency_scores_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "review_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_scores" ADD CONSTRAINT "competency_scores_competencyLevelId_fkey" FOREIGN KEY ("competencyLevelId") REFERENCES "competency_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_change_requests" ADD CONSTRAINT "goal_change_requests_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "review_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_change_requests" ADD CONSTRAINT "goal_change_requests_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_change_requests" ADD CONSTRAINT "goal_change_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_change_requests" ADD CONSTRAINT "goal_change_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "review_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "calibration_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_items" ADD CONSTRAINT "calibration_items_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "review_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_participants" ADD CONSTRAINT "calibration_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "calibration_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_participants" ADD CONSTRAINT "calibration_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
