// Database Seed Script
// Seeds default OpCo, TOV levels, and competencies

import { PrismaClient, Prisma } from '@prisma/client';
import { defaultCompetencies, levelDescriptions } from './competencies.js';

const prisma = new PrismaClient();

// Helper to cast multilang objects to Prisma JSON
const toJson = <T>(obj: T): Prisma.InputJsonValue => obj as unknown as Prisma.InputJsonValue;

// Check if running in production mode
const isProduction = process.env.NODE_ENV === 'production';

async function main() {
  console.log(`Starting database seed... (${isProduction ? 'production' : 'development'} mode)`);

  // Create default TSS OpCo
  const tssOpCo = await prisma.opCo.upsert({
    where: { name: 'tss' },
    update: {},
    create: {
      name: 'tss',
      displayName: 'Total Specific Solutions',
      domain: 'tss.eu',
      settings: {},
    },
  });
  console.log(`Created/updated OpCo: ${tssOpCo.displayName}`);

  // Create TOV Levels for the OpCo
  const levels = ['A', 'B', 'C', 'D'] as const;
  const levelNames: Record<string, string> = {
    A: 'Entry',
    B: 'Professional',
    C: 'Senior',
    D: 'Leadership',
  };

  const tovLevelMap: Record<string, string> = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const tovLevel = await prisma.tovLevel.upsert({
      where: {
        opcoId_code: {
          opcoId: tssOpCo.id,
          code: level,
        },
      },
      update: {
        description: toJson(levelDescriptions[level]),
      },
      create: {
        opcoId: tssOpCo.id,
        code: level,
        name: levelNames[level],
        description: toJson(levelDescriptions[level]),
        sortOrder: i,
      },
    });
    tovLevelMap[level] = tovLevel.id;
    console.log(`Created/updated TOV Level: ${level} - ${levelNames[level]}`);
  }

  // Create competencies for each level
  for (const level of levels) {
    const competencies = defaultCompetencies[level];

    for (let i = 0; i < competencies.length; i++) {
      const comp = competencies[i];
      await prisma.competencyLevel.upsert({
        where: {
          opcoId_tovLevelId_competencyId: {
            opcoId: tssOpCo.id,
            tovLevelId: tovLevelMap[level],
            competencyId: comp.id,
          },
        },
        update: {
          title: toJson(comp.title),
          indicators: toJson(comp.indicators),
        },
        create: {
          opcoId: tssOpCo.id,
          tovLevelId: tovLevelMap[level],
          competencyId: comp.id,
          category: comp.category,
          subcategory: comp.subcategory,
          title: toJson(comp.title),
          indicators: toJson(comp.indicators),
          sortOrder: i,
        },
      });
    }
    console.log(`Created/updated ${competencies.length} competencies for level ${level}`);
  }

  // Create some default function titles
  const defaultFunctionTitles = [
    'Software Developer',
    'Senior Software Developer',
    'Lead Developer',
    'Software Architect',
    'Product Owner',
    'Scrum Master',
    'Project Manager',
    'Business Analyst',
    'QA Engineer',
    'DevOps Engineer',
    'Technical Consultant',
    'Sales Consultant',
    'Account Manager',
    'Team Lead',
    'Manager',
    'Director',
  ];

  for (let i = 0; i < defaultFunctionTitles.length; i++) {
    await prisma.functionTitle.upsert({
      where: {
        opcoId_name: {
          opcoId: tssOpCo.id,
          name: defaultFunctionTitles[i],
        },
      },
      update: {},
      create: {
        opcoId: tssOpCo.id,
        name: defaultFunctionTitles[i],
        sortOrder: i,
      },
    });
  }
  console.log(`Created/updated ${defaultFunctionTitles.length} function titles`);

  // Only create test users and sample data in development mode
  if (!isProduction) {
    // Create test users for development
    // These users match the Keycloak realm import (keycloak/tss-ppm-realm.json)
    const testUsers = [
    {
      keycloakId: 'employee-test-id',
      email: 'employee@tss.eu',
      firstName: 'Emma',
      lastName: 'Employee',
      displayName: 'Emma Employee',
      role: 'EMPLOYEE' as const,
    },
    {
      keycloakId: 'manager-test-id',
      email: 'manager@tss.eu',
      firstName: 'Michael',
      lastName: 'Manager',
      displayName: 'Michael Manager',
      role: 'MANAGER' as const,
    },
    {
      keycloakId: 'hr-test-id',
      email: 'hr@tss.eu',
      firstName: 'Hannah',
      lastName: 'HR',
      displayName: 'Hannah HR',
      role: 'HR' as const,
    },
    {
      keycloakId: 'admin-test-id',
      email: 'admin@tss.eu',
      firstName: 'Adam',
      lastName: 'Admin',
      displayName: 'Adam Admin',
      role: 'OPCO_ADMIN' as const,
    },
    {
      keycloakId: 'superadmin-test-id',
      email: 'superadmin@tss.eu',
      firstName: 'Sarah',
      lastName: 'SuperAdmin',
      displayName: 'Sarah SuperAdmin',
      role: 'TSS_SUPER_ADMIN' as const,
    },
    {
      keycloakId: 'dev1-test-id',
      email: 'dev1@tss.eu',
      firstName: 'David',
      lastName: 'Developer',
      displayName: 'David Developer',
      role: 'EMPLOYEE' as const,
    },
    {
      keycloakId: 'dev2-test-id',
      email: 'dev2@tss.eu',
      firstName: 'Diana',
      lastName: 'Developer',
      displayName: 'Diana Developer',
      role: 'EMPLOYEE' as const,
    },
  ];

  // Get default TOV level and function title for users
  const defaultTovLevel = await prisma.tovLevel.findFirst({
    where: { opcoId: tssOpCo.id, code: 'B' },
  });
  const defaultFunctionTitle = await prisma.functionTitle.findFirst({
    where: { opcoId: tssOpCo.id, name: 'Software Developer' },
  });

  const userIds: Record<string, string> = {};

  for (const userData of testUsers) {
    // Check if user already exists with this email (JIT-created users)
    const existingUser = await prisma.user.findFirst({
      where: { opcoId: tssOpCo.id, email: userData.email },
    });

    if (existingUser) {
      // User already exists (likely JIT-created), skip creation
      userIds[userData.email] = existingUser.id;
      console.log(`User already exists: ${userData.email} (${existingUser.role}) - skipping`);
      continue;
    }

    // Create new test user
    const user = await prisma.user.create({
      data: {
        keycloakId: userData.keycloakId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        role: userData.role,
        opcoId: tssOpCo.id,
        tovLevelId: defaultTovLevel?.id,
        functionTitleId: defaultFunctionTitle?.id,
      },
    });
    userIds[userData.email] = user.id;
    console.log(`Created user: ${userData.email} (${userData.role})`);
  }

  // Set up manager hierarchy: Manager manages Employee, Dev1, Dev2
  const managerUser = await prisma.user.findUnique({
    where: { keycloakId: 'manager-test-id' },
  });

  if (managerUser) {
    await prisma.user.updateMany({
      where: {
        email: { in: ['employee@tss.eu', 'dev1@tss.eu', 'dev2@tss.eu'] },
      },
      data: {
        managerId: managerUser.id,
      },
    });
    console.log('Set up manager hierarchy');
  }

  // Create a sample review cycle for the employee
  const currentYear = new Date().getFullYear();
  const employeeUser = await prisma.user.findUnique({
    where: { keycloakId: 'employee-test-id' },
  });

  if (employeeUser && managerUser && defaultTovLevel) {
    const existingReview = await prisma.reviewCycle.findFirst({
      where: {
        opcoId: tssOpCo.id,
        employeeId: employeeUser.id,
        year: currentYear,
      },
    });

    if (!existingReview) {
      const reviewCycle = await prisma.reviewCycle.create({
        data: {
          year: currentYear,
          status: 'GOAL_SETTING',
          opcoId: tssOpCo.id,
          employeeId: employeeUser.id,
          managerId: managerUser.id,
          tovLevelId: defaultTovLevel.id,
          goalSettingStart: new Date(),
          goalSettingEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      });

      // Create sample goals
      await prisma.goal.createMany({
        data: [
          {
            title: 'Complete Project Alpha',
            description: 'Deliver all milestones for Project Alpha on time and within budget',
            weight: 40,
            sortOrder: 0,
            reviewCycleId: reviewCycle.id,
          },
          {
            title: 'Improve Technical Skills',
            description: 'Complete certification in cloud technologies',
            weight: 30,
            sortOrder: 1,
            reviewCycleId: reviewCycle.id,
          },
          {
            title: 'Team Collaboration',
            description: 'Actively participate in code reviews and knowledge sharing sessions',
            weight: 30,
            sortOrder: 2,
            reviewCycleId: reviewCycle.id,
          },
        ],
      });

      // Create review stages
      await prisma.reviewStage.createMany({
        data: [
          { stageType: 'GOAL_SETTING', status: 'IN_PROGRESS', reviewCycleId: reviewCycle.id },
          { stageType: 'MID_YEAR_REVIEW', status: 'PENDING', reviewCycleId: reviewCycle.id },
          { stageType: 'END_YEAR_REVIEW', status: 'PENDING', reviewCycleId: reviewCycle.id },
        ],
      });

      console.log(`Created sample review cycle for ${currentYear}`);
    }
  }
  } else {
    console.log('Skipping test users and sample data (production mode)');
  }

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
