-- Migration: Add Teams and Organizational Hierarchy
-- This migration adds:
-- 1. OpCoAdmin junction table for admin assignments to OpCos
-- 2. BusinessUnitHR junction table for HR assignments to Business Units
-- 3. Team model with standard team types
-- 4. Team membership for users

-- Create TeamType enum
CREATE TYPE "TeamType" AS ENUM ('PS', 'CS', 'RD', 'SM', 'GA', 'MA');

-- Create OpCoAdmin junction table (Super Admin assigns Admins to OpCos)
CREATE TABLE "opco_admins" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opcoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "opco_admins_pkey" PRIMARY KEY ("id")
);

-- Create BusinessUnitHR junction table (Admins assign HR to Business Units)
CREATE TABLE "business_unit_hr" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessUnitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "business_unit_hr_pkey" PRIMARY KEY ("id")
);

-- Create Teams table
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teamType" "TeamType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opcoId" TEXT NOT NULL,
    "businessUnitId" TEXT NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- Add team membership to users
ALTER TABLE "users" ADD COLUMN "teamId" TEXT;

-- Create indexes for OpCoAdmin
CREATE INDEX "opco_admins_opcoId_idx" ON "opco_admins"("opcoId");
CREATE INDEX "opco_admins_userId_idx" ON "opco_admins"("userId");
CREATE UNIQUE INDEX "opco_admins_opcoId_userId_key" ON "opco_admins"("opcoId", "userId");

-- Create indexes for BusinessUnitHR
CREATE INDEX "business_unit_hr_businessUnitId_idx" ON "business_unit_hr"("businessUnitId");
CREATE INDEX "business_unit_hr_userId_idx" ON "business_unit_hr"("userId");
CREATE UNIQUE INDEX "business_unit_hr_businessUnitId_userId_key" ON "business_unit_hr"("businessUnitId", "userId");

-- Create indexes for Teams
CREATE INDEX "teams_opcoId_idx" ON "teams"("opcoId");
CREATE INDEX "teams_businessUnitId_idx" ON "teams"("businessUnitId");
CREATE INDEX "teams_managerId_idx" ON "teams"("managerId");
CREATE UNIQUE INDEX "teams_businessUnitId_code_key" ON "teams"("businessUnitId", "code");

-- Create index for user team membership
CREATE INDEX "users_teamId_idx" ON "users"("teamId");

-- Add foreign key constraints for OpCoAdmin
ALTER TABLE "opco_admins" ADD CONSTRAINT "opco_admins_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opco_admins" ADD CONSTRAINT "opco_admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for BusinessUnitHR
ALTER TABLE "business_unit_hr" ADD CONSTRAINT "business_unit_hr_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_unit_hr" ADD CONSTRAINT "business_unit_hr_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for Teams
ALTER TABLE "teams" ADD CONSTRAINT "teams_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "opcos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key constraint for user team membership
ALTER TABLE "users" ADD CONSTRAINT "users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
