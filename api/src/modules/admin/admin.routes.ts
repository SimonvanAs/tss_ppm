import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { CycleStatus, Prisma } from '@prisma/client';
import { UserRole } from '../../plugins/auth.js';
import { withTenantFilter } from '../../plugins/tenant.js';
import {
  mergeWithDefaults,
  validateDateRanges,
  validateBranding,
  DEFAULT_SETTINGS,
  type OpCoSettings,
} from '../../utils/settingsDefaults.js';

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
        _count: {
          select: { users: true },
        },
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

    // Check if function title has assigned users
    const functionTitle = await fastify.prisma.functionTitle.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          take: 10, // Return up to 10 users for the error message
        },
      },
    });

    if (!functionTitle) {
      return reply.status(404).send({
        error: { message: 'Function title not found', statusCode: 404 },
      });
    }

    // Block deletion if users are assigned
    if (functionTitle._count.users > 0) {
      return reply.status(400).send({
        error: {
          message: `Cannot delete function title: ${functionTitle._count.users} user(s) are assigned to it`,
          statusCode: 400,
          userCount: functionTitle._count.users,
          users: functionTitle.users,
        },
      });
    }

    // Soft delete
    await fastify.prisma.functionTitle.update({
      where: { id },
      data: { isActive: false },
    });

    return reply.status(204).send();
  });

  fastify.get('/function-titles/export', {
    schema: {
      description: 'Export function titles as Excel file',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    try {
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

      // Generate Excel file
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Function Titles');

      // Add headers
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 30 },
        { header: 'TOV Level', key: 'tovLevel', width: 15 },
        { header: 'Description', key: 'description', width: 50 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7F3FF' },
      };

      // Add data rows
      functionTitles.forEach((ft) => {
        worksheet.addRow({
          name: ft.name,
          tovLevel: ft.tovLevel?.code || '',
          description: ft.description || '',
        });
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="function-titles.xlsx"');

      return reply.send(buffer);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: { message: err.message || 'Failed to export function titles', statusCode: 500 },
      });
    }
  });

  fastify.post('/function-titles/bulk', {
    schema: {
      description: 'Bulk import function titles from Excel file',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: { message: 'No file provided', statusCode: 400 },
        });
      }

      const bufferData = await data.toBuffer();
      const filename = data.filename || 'import.xlsx';

      // Parse Excel file
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      // @ts-ignore - Buffer type compatibility
      await workbook.xlsx.load(bufferData);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return reply.status(400).send({
          error: { message: 'Excel file is empty or invalid', statusCode: 400 },
        });
      }

      // Parse header row
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString() || '';
      });

      // Map columns
      const columnMap: Record<string, string> = {};
      headers.forEach((header) => {
        const normalized = header.toLowerCase().trim();
        if (normalized.includes('name')) {
          columnMap.name = header;
        } else if (normalized.includes('tov') || normalized.includes('level')) {
          columnMap.tovLevel = header;
        } else if (normalized.includes('description')) {
          columnMap.description = header;
        }
      });

      // Validate required columns
      if (!columnMap.name) {
        return reply.status(400).send({
          error: {
            message: 'Excel file must contain a Name column',
            statusCode: 400,
          },
        });
      }

      // Get all TOV levels for validation
      const tovLevels = await fastify.prisma.tovLevel.findMany({
        where: {
          ...withTenantFilter(request),
          isActive: true,
        },
      });
      const tovLevelMap = new Map(tovLevels.map(tl => [tl.code.toLowerCase(), tl]));

      // Get existing function titles for duplicate check
      const existingFunctionTitles = await fastify.prisma.functionTitle.findMany({
        where: {
          ...withTenantFilter(request),
          isActive: true,
        },
      });
      const existingNames = new Set(existingFunctionTitles.map(ft => ft.name.toLowerCase()));

      const results = {
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; message: string }>,
      };

      // Collect valid rows for bulk transaction
      type ValidRow = {
        name: string;
        tovLevelId: string | null;
        description: string;
        existingId?: string;
      };
      const validRows: Array<{ rowNum: number; data: ValidRow }> = [];

      // Process each row (validation pass)
      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        if (!row || row.cellCount === 0) continue;

        results.total++;

        try {
          const getCellValue = (colName: string): string | null => {
            const headerIndex = headers.indexOf(columnMap[colName]);
            if (headerIndex === -1) return null;
            const cell = row.getCell(headerIndex + 1);
            return cell.value?.toString()?.trim() || null;
          };

          const name = getCellValue('name');
          const tovLevelCode = getCellValue('tovLevel');
          const description = getCellValue('description') || '';

          if (!name) {
            results.skipped++;
            results.errors.push({ row: rowNum, message: 'Missing name' });
            continue;
          }

          // Validate TOV level if provided
          let tovLevelId: string | null = null;
          if (tovLevelCode) {
            const tovLevel = tovLevelMap.get(tovLevelCode.toLowerCase());
            if (!tovLevel) {
              results.skipped++;
              results.errors.push({
                row: rowNum,
                message: `Invalid TOV level: ${tovLevelCode}. Valid values: ${tovLevels.map(tl => tl.code).join(', ')}`,
              });
              continue;
            }
            tovLevelId = tovLevel.id;
          }

          // Check for duplicates within the import file
          const duplicateInFile = validRows.find(
            vr => vr.data.name.toLowerCase() === name.toLowerCase()
          );
          if (duplicateInFile) {
            results.skipped++;
            results.errors.push({
              row: rowNum,
              message: `Duplicate name in file (first seen at row ${duplicateInFile.rowNum})`,
            });
            continue;
          }

          // Check if exists (for update vs create)
          const existing = existingFunctionTitles.find(
            ft => ft.name.toLowerCase() === name.toLowerCase()
          );

          validRows.push({
            rowNum,
            data: {
              name,
              tovLevelId,
              description,
              existingId: existing?.id,
            },
          });
        } catch (err: any) {
          results.skipped++;
          results.errors.push({
            row: rowNum,
            message: err.message || 'Unknown error',
          });
        }
      }

      // Bulk create/update in transaction
      if (validRows.length > 0) {
        try {
          await fastify.prisma.$transaction(async (tx) => {
            // Get max sortOrder once before the loop (fixes N+1 query)
            const maxSortOrderResult = await tx.functionTitle.findFirst({
              where: { ...withTenantFilter(request) },
              orderBy: { sortOrder: 'desc' },
              select: { sortOrder: true },
            });
            let nextSortOrder = (maxSortOrderResult?.sortOrder || 0);

            for (const { data } of validRows) {
              if (data.existingId) {
                // Update existing
                await tx.functionTitle.update({
                  where: { id: data.existingId },
                  data: {
                    tovLevelId: data.tovLevelId,
                    description: data.description,
                  },
                });
                results.updated++;
              } else {
                // Create new with incrementing sortOrder
                nextSortOrder++;
                await tx.functionTitle.create({
                  data: {
                    opcoId: request.tenant.opcoId,
                    name: data.name,
                    tovLevelId: data.tovLevelId,
                    description: data.description,
                    sortOrder: nextSortOrder,
                  },
                });
                results.created++;
              }
            }
          });

          // Audit log for successful bulk import
          await fastify.audit.logFromRequest(request, {
            entityType: 'FunctionTitle',
            entityId: 'bulk',
            action: 'IMPORT',
            metadata: {
              filename,
              total: results.total,
              created: results.created,
              updated: results.updated,
              skipped: results.skipped,
            },
          });
        } catch (err: any) {
          // Transaction failed
          return reply.status(500).send({
            error: {
              message: `Bulk operation failed: ${err.message}`,
              statusCode: 500,
            },
          });
        }
      }

      return reply.status(200).send({
        success: true,
        filename,
        results,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: {
          message: err.message || 'Failed to import function titles',
          statusCode: 500,
        },
      });
    }
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
    // HR needs read access for creating reviews
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
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

    // Convert empty strings to null for foreign key fields
    const updateData: typeof body = { ...body };
    if (updateData.managerId === '') updateData.managerId = null as unknown as string;
    if (updateData.functionTitleId === '') updateData.functionTitleId = null as unknown as string;
    if (updateData.tovLevelId === '') updateData.tovLevelId = null as unknown as string;
    if (updateData.businessUnitId === '') updateData.businessUnitId = null as unknown as string;

    const user = await fastify.prisma.user.update({
      where: { id },
      data: updateData,
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

  // ============================================
  // OPCO SETTINGS
  // ============================================

  fastify.get('/settings', {
    schema: {
      description: 'Get OpCo settings (workflow, notifications, branding)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          opcoId: { type: 'string', description: 'OpCo ID (TSS Super Admin only)' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const query = request.query as { opcoId?: string };

    // TSS Super Admin can query any OpCo
    let targetOpcoId = request.tenant.opcoId;
    if (query.opcoId && request.user.role === UserRole.TSS_SUPER_ADMIN) {
      targetOpcoId = query.opcoId;
    }

    const opco = await fastify.prisma.opCo.findUnique({
      where: { id: targetOpcoId },
    });

    if (!opco) {
      return reply.status(404).send({
        error: { message: 'OpCo not found', statusCode: 404 },
      });
    }

    const settings = mergeWithDefaults(opco.settings as Partial<OpCoSettings>);
    return { opcoId: opco.id, opcoName: opco.displayName, settings };
  });

  fastify.patch('/settings', {
    schema: {
      description: 'Update workflow and notification settings for current OpCo',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          workflow: {
            type: 'object',
            properties: {
              reviewCycle: {
                type: 'object',
                properties: {
                  goalSettingStart: { type: ['string', 'null'] },
                  goalSettingEnd: { type: ['string', 'null'] },
                  midYearStart: { type: ['string', 'null'] },
                  midYearEnd: { type: ['string', 'null'] },
                  endYearStart: { type: ['string', 'null'] },
                  endYearEnd: { type: ['string', 'null'] },
                },
              },
              approvals: {
                type: 'object',
                properties: {
                  goalSettingRequiresManager: { type: 'boolean' },
                  goalSettingRequiresHR: { type: 'boolean' },
                  midYearRequiresManager: { type: 'boolean' },
                  midYearRequiresHR: { type: 'boolean' },
                  endYearRequiresManager: { type: 'boolean' },
                  endYearRequiresHR: { type: 'boolean' },
                },
              },
              signatures: {
                type: 'object',
                properties: {
                  requireEmployeeSignature: { type: 'boolean' },
                  requireManagerSignature: { type: 'boolean' },
                },
              },
            },
          },
          notifications: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              reminderDaysBeforeDeadline: { type: 'integer', minimum: 1, maximum: 30 },
              overdueReminderIntervalDays: { type: 'integer', minimum: 1, maximum: 14 },
              notifyOnPendingApprovals: { type: 'boolean' },
            },
          },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as Partial<Pick<OpCoSettings, 'workflow' | 'notifications'>>;

    // Get current OpCo settings
    const opco = await fastify.prisma.opCo.findUnique({
      where: { id: request.tenant.opcoId },
    });

    if (!opco) {
      return reply.status(404).send({
        error: { message: 'OpCo not found', statusCode: 404 },
      });
    }

    const currentSettings = mergeWithDefaults(opco.settings as Partial<OpCoSettings>);

    // Validate date ranges if provided
    if (body.workflow?.reviewCycle) {
      const mergedReviewCycle = {
        ...currentSettings.workflow.reviewCycle,
        ...body.workflow.reviewCycle,
      };
      const dateErrors = validateDateRanges(mergedReviewCycle);
      if (dateErrors.length > 0) {
        return reply.status(400).send({
          error: { message: dateErrors.join('; '), statusCode: 400 },
        });
      }
    }

    // Merge settings
    const newSettings: OpCoSettings = {
      ...currentSettings,
      workflow: {
        reviewCycle: {
          ...currentSettings.workflow.reviewCycle,
          ...(body.workflow?.reviewCycle || {}),
        },
        approvals: {
          ...currentSettings.workflow.approvals,
          ...(body.workflow?.approvals || {}),
        },
        signatures: {
          ...currentSettings.workflow.signatures,
          ...(body.workflow?.signatures || {}),
        },
      },
      notifications: {
        ...currentSettings.notifications,
        ...(body.notifications || {}),
      },
    };

    // Update OpCo
    const updated = await fastify.prisma.opCo.update({
      where: { id: request.tenant.opcoId },
      data: { settings: newSettings as unknown as Prisma.InputJsonValue },
    });

    return { opcoId: updated.id, settings: newSettings };
  });

  fastify.patch('/settings/branding', {
    schema: {
      description: 'Update branding settings for an OpCo (TSS Super Admin only)',
      tags: ['Super Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          opcoId: { type: 'string' },
          logoUrl: { type: ['string', 'null'] },
          primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          accentColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          customCss: { type: ['string', 'null'] },
        },
        required: ['opcoId'],
      },
    },
    preHandler: [fastify.authorize(UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as {
      opcoId: string;
      logoUrl?: string | null;
      primaryColor?: string;
      accentColor?: string;
      customCss?: string | null;
    };

    // Validate branding colors
    const brandingUpdate: Partial<OpCoSettings['branding']> = {};
    if (body.logoUrl !== undefined) brandingUpdate.logoUrl = body.logoUrl;
    if (body.primaryColor) brandingUpdate.primaryColor = body.primaryColor;
    if (body.accentColor) brandingUpdate.accentColor = body.accentColor;
    if (body.customCss !== undefined) brandingUpdate.customCss = body.customCss;

    const brandingErrors = validateBranding(brandingUpdate);
    if (brandingErrors.length > 0) {
      return reply.status(400).send({
        error: { message: brandingErrors.join('; '), statusCode: 400 },
      });
    }

    // Get current OpCo settings
    const opco = await fastify.prisma.opCo.findUnique({
      where: { id: body.opcoId },
    });

    if (!opco) {
      return reply.status(404).send({
        error: { message: 'OpCo not found', statusCode: 404 },
      });
    }

    const currentSettings = mergeWithDefaults(opco.settings as Partial<OpCoSettings>);

    // Merge branding
    const newSettings: OpCoSettings = {
      ...currentSettings,
      branding: {
        ...currentSettings.branding,
        ...brandingUpdate,
      },
    };

    // Update OpCo
    const updated = await fastify.prisma.opCo.update({
      where: { id: body.opcoId },
      data: { settings: newSettings as unknown as Prisma.InputJsonValue },
    });

    return { opcoId: updated.id, branding: newSettings.branding };
  });

  fastify.post('/settings/logo', {
    schema: {
      description: 'Upload a logo for an OpCo (TSS Super Admin only)',
      tags: ['Super Admin'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
    preHandler: [fastify.authorize(UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: { message: 'No file provided', statusCode: 400 },
        });
      }

      // Get opcoId from form field
      const fields = data.fields as Record<string, any>;
      const opcoIdField = fields.opcoId;
      const opcoId = opcoIdField?.value || opcoIdField;

      if (!opcoId) {
        return reply.status(400).send({
          error: { message: 'opcoId is required', statusCode: 400 },
        });
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: { message: 'Invalid file type. Allowed: PNG, JPEG, SVG, WebP', statusCode: 400 },
        });
      }

      // Read file buffer
      const buffer = await data.toBuffer();
      const filename = data.filename || 'logo';
      const ext = filename.split('.').pop() || 'png';
      const savedFilename = `${opcoId}-logo.${ext}`;

      // For now, store as base64 data URL in settings
      // In production, this would upload to a file storage service
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${data.mimetype};base64,${base64}`;

      // Get current OpCo settings
      const opco = await fastify.prisma.opCo.findUnique({
        where: { id: opcoId },
      });

      if (!opco) {
        return reply.status(404).send({
          error: { message: 'OpCo not found', statusCode: 404 },
        });
      }

      const currentSettings = mergeWithDefaults(opco.settings as Partial<OpCoSettings>);

      // Update logo URL in settings
      const newSettings: OpCoSettings = {
        ...currentSettings,
        branding: {
          ...currentSettings.branding,
          logoUrl: dataUrl,
        },
      };

      // Update OpCo
      await fastify.prisma.opCo.update({
        where: { id: opcoId },
        data: { settings: newSettings as unknown as Prisma.InputJsonValue },
      });

      return {
        success: true,
        filename: savedFilename,
        logoUrl: dataUrl,
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: { message: err.message || 'Failed to upload logo', statusCode: 500 },
      });
    }
  });

  // ============================================
  // REVIEW IMPORT
  // ============================================

  fastify.post('/reviews/import', {
    schema: {
      description: 'Import historical performance reviews from Excel file',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: { message: 'No file provided', statusCode: 400 },
        });
      }

      const bufferData = await data.toBuffer();
      const filename = data.filename || 'import.xlsx';

      // Parse Excel file
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      // @ts-ignore - Buffer type compatibility between Node.js versions
      await workbook.xlsx.load(bufferData);

      const worksheet = workbook.getWorksheet(1); // Get first worksheet
      if (!worksheet) {
        return reply.status(400).send({
          error: { message: 'Excel file is empty or invalid', statusCode: 400 },
        });
      }

      // Parse header row
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString() || '';
      });

      // Expected columns (flexible mapping)
      // Order matters: check more specific patterns first
      const columnMap: Record<string, string> = {};
      headers.forEach((header, index) => {
        const normalized = header.toLowerCase().trim();
        // Check score columns first (more specific) before year
        if (normalized.includes('what') && normalized.includes('score')) {
          columnMap.whatScore = header;
        } else if (normalized.includes('how') && normalized.includes('score')) {
          columnMap.howScore = header;
        } else if (normalized.includes('employee') && normalized.includes('email')) {
          columnMap.email = header;
        } else if (normalized.includes('employee') && normalized.includes('name')) {
          columnMap.employeeName = header;
        } else if (normalized.includes('tov') || (normalized.includes('ide') && normalized.includes('level'))) {
          columnMap.tovLevel = header;
        } else if (normalized.includes('status')) {
          columnMap.status = header;
        } else if (normalized === 'year' || (normalized.includes('year') && !normalized.includes('score'))) {
          // Only match 'year' if it's not part of a score column name
          columnMap.year = header;
        }
      });

      // Validate required columns
      if (!columnMap.email && !columnMap.employeeName) {
        return reply.status(400).send({
          error: {
            message: 'Excel file must contain employee email or name column',
            statusCode: 400,
          },
        });
      }
      if (!columnMap.year) {
        return reply.status(400).send({
          error: { message: 'Excel file must contain year column', statusCode: 400 },
        });
      }

      const results = {
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; message: string }>,
      };

      // Process each row
      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        if (!row || row.cellCount === 0) continue;

        results.total++;

        try {
          // Extract data from row
          const getCellValue = (colName: string): string | null => {
            const headerIndex = headers.indexOf(columnMap[colName]);
            if (headerIndex === -1) return null;
            const cell = row.getCell(headerIndex + 1);
            return cell.value?.toString()?.trim() || null;
          };

          const email = getCellValue('email');
          const employeeName = getCellValue('employeeName');
          const yearStr = getCellValue('year');
          const whatScoreStr = getCellValue('whatScore');
          const howScoreStr = getCellValue('howScore');
          const tovLevelCode = getCellValue('tovLevel');
          const statusStr = getCellValue('status');

          if (!yearStr) {
            results.skipped++;
            results.errors.push({ row: rowNum, message: 'Missing year' });
            continue;
          }

          const year = parseInt(yearStr, 10);
          if (isNaN(year) || year < 2000 || year > 2100) {
            results.skipped++;
            results.errors.push({ row: rowNum, message: `Invalid year: ${yearStr}` });
            continue;
          }

          // Find employee
          let employee;
          if (email) {
            employee = await fastify.prisma.user.findFirst({
              where: {
                email,
                ...withTenantFilter(request),
              },
            });
          } else if (employeeName) {
            const [firstName, ...lastNameParts] = employeeName.split(' ');
            const lastName = lastNameParts.join(' ');
            employee = await fastify.prisma.user.findFirst({
              where: {
                firstName: { contains: firstName, mode: 'insensitive' },
                lastName: { contains: lastName, mode: 'insensitive' },
                ...withTenantFilter(request),
              },
            });
          }

          if (!employee) {
            results.skipped++;
            results.errors.push({
              row: rowNum,
              message: `Employee not found: ${email || employeeName}`,
            });
            continue;
          }

          // Find or get default TOV level
          let tovLevelId = employee.tovLevelId;
          if (tovLevelCode) {
            const tovLevel = await fastify.prisma.tovLevel.findFirst({
              where: {
                code: { equals: tovLevelCode, mode: 'insensitive' },
                ...withTenantFilter(request),
                isActive: true,
              },
            });
            if (tovLevel) {
              tovLevelId = tovLevel.id;
            }
          }

          if (!tovLevelId) {
            // Get default TOV level for OpCo
            const defaultTovLevel = await fastify.prisma.tovLevel.findFirst({
              where: {
                ...withTenantFilter(request),
                isActive: true,
              },
              orderBy: { sortOrder: 'asc' },
            });
            if (defaultTovLevel) {
              tovLevelId = defaultTovLevel.id;
            } else {
              results.skipped++;
              results.errors.push({ row: rowNum, message: 'No TOV level available' });
              continue;
            }
          }

          // Parse scores
          const whatScore = whatScoreStr ? parseFloat(whatScoreStr) : null;
          const howScore = howScoreStr ? parseFloat(howScoreStr) : null;

          // Determine status
          let status: CycleStatus = CycleStatus.COMPLETED;
          if (statusStr) {
            const normalizedStatus = statusStr.toUpperCase().replace(/[^A-Z_]/g, '_');
            if (Object.values(CycleStatus).includes(normalizedStatus as CycleStatus)) {
              status = normalizedStatus as CycleStatus;
            }
          }

          // Check if review exists
          const existing = await fastify.prisma.reviewCycle.findFirst({
            where: {
              employeeId: employee.id,
              year,
              ...withTenantFilter(request),
            },
          });

          // Get competency levels
          const competencyLevels = await fastify.prisma.competencyLevel.findMany({
            where: {
              tovLevelId,
              ...withTenantFilter(request),
              isActive: true,
            },
            orderBy: { sortOrder: 'asc' },
          });

          if (existing) {
            // Update existing review
            await fastify.prisma.reviewCycle.update({
              where: { id: existing.id },
              data: {
                whatScoreEndYear: whatScore ?? existing.whatScoreEndYear,
                howScoreEndYear: howScore ?? existing.howScoreEndYear,
                status,
                tovLevelId,
              },
            });
            results.updated++;
          } else {
            // Create new review
            await fastify.prisma.reviewCycle.create({
              data: {
                opcoId: request.tenant.opcoId,
                employeeId: employee.id,
                managerId: employee.managerId,
                year,
                tovLevelId,
                status,
                whatScoreEndYear: whatScore,
                howScoreEndYear: howScore,
                stages: {
                  create: [
                    { stageType: 'GOAL_SETTING', status: 'COMPLETED' },
                    { stageType: 'MID_YEAR_REVIEW', status: 'COMPLETED' },
                    { stageType: 'END_YEAR_REVIEW', status: status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' },
                  ],
                },
                competencyScores: {
                  create: competencyLevels.map(cl => ({
                    competencyLevelId: cl.id,
                    scoreEndYear: howScore ? Math.round(howScore) : null,
                  })),
                },
              },
            });
            results.created++;
          }
        } catch (err: any) {
          results.skipped++;
          results.errors.push({
            row: rowNum,
            message: err.message || 'Unknown error',
          });
        }
      }

      return reply.status(200).send({
        success: true,
        filename,
        results,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: {
          message: err.message || 'Failed to import reviews',
          statusCode: 500,
        },
      });
    }
  });

  // ============================================
  // BULK REVIEW CYCLE CREATION
  // ============================================

  fastify.post('/review-cycles/bulk', {
    schema: {
      description: 'Bulk create review cycles for all eligible employees (Start New Performance Year)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          year: { type: 'integer', description: 'Performance year to create reviews for' },
          opcoId: { type: 'string', description: 'OpCo ID (required for TSS_SUPER_ADMIN)' },
          filters: {
            type: 'object',
            properties: {
              businessUnitId: { type: 'string', description: 'Filter by business unit' },
              excludeExisting: { type: 'boolean', description: 'Skip employees with existing reviews (default true)' },
              includeManagers: { type: 'boolean', description: 'Include users with MANAGER role (default false)' },
            },
          },
          dryRun: { type: 'boolean', description: 'Preview mode - no changes made' },
        },
        required: ['year'],
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as {
      year: number;
      opcoId?: string;
      filters?: {
        businessUnitId?: string;
        excludeExisting?: boolean;
        includeManagers?: boolean;
      };
      dryRun?: boolean;
    };

    // Determine opcoId
    const opcoId = request.user.role === UserRole.TSS_SUPER_ADMIN && body.opcoId
      ? body.opcoId
      : request.tenant.opcoId;

    // Validate year
    const currentYear = new Date().getFullYear();
    if (body.year < currentYear - 1 || body.year > currentYear + 2) {
      return reply.status(400).send({
        error: { message: 'Year must be within reasonable range (last year to 2 years ahead)', statusCode: 400 },
      });
    }

    const excludeExisting = body.filters?.excludeExisting !== false; // default true
    const includeManagers = body.filters?.includeManagers === true; // default false
    const isDryRun = body.dryRun === true;

    // Get all eligible employees
    const employeeWhere: any = {
      opcoId,
      isActive: true,
    };

    // Filter by role - include employees and optionally managers
    if (includeManagers) {
      employeeWhere.role = { in: [UserRole.EMPLOYEE, UserRole.MANAGER] };
    } else {
      employeeWhere.role = UserRole.EMPLOYEE;
    }

    // Filter by business unit if specified
    if (body.filters?.businessUnitId) {
      employeeWhere.businessUnitId = body.filters.businessUnitId;
    }

    // Get employees with their function titles
    const employees = await fastify.prisma.user.findMany({
      where: employeeWhere,
      include: {
        functionTitle: {
          include: { tovLevel: true },
        },
        tovLevel: true,
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        businessUnit: {
          select: { id: true, name: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    // Get existing reviews for the year if we need to exclude them
    let existingReviewEmployeeIds = new Set<string>();
    if (excludeExisting) {
      const existingReviews = await fastify.prisma.reviewCycle.findMany({
        where: { opcoId, year: body.year },
        select: { employeeId: true },
      });
      existingReviewEmployeeIds = new Set(existingReviews.map(r => r.employeeId));
    }

    // Pre-fetch all competency levels grouped by TOV level (fixes N+1 query)
    const allCompetencyLevels = await fastify.prisma.competencyLevel.findMany({
      where: {
        opcoId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    const competencyLevelsByTovLevel = new Map<string, typeof allCompetencyLevels>();
    for (const cl of allCompetencyLevels) {
      const existing = competencyLevelsByTovLevel.get(cl.tovLevelId) || [];
      existing.push(cl);
      competencyLevelsByTovLevel.set(cl.tovLevelId, existing);
    }

    // Process each employee
    type DetailItem = {
      userId: string;
      employeeName: string;
      managerName: string | null;
      tovLevelCode: string | null;
      status: 'created' | 'skipped' | 'failed' | 'will_create' | 'will_skip';
      reason?: string;
      reviewCycleId?: string;
      warnings?: string[];
    };

    const results: {
      created: number;
      skipped: number;
      failed: number;
      details: DetailItem[];
    } = {
      created: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };

    // Prepare employees for creation (validation pass)
    type EligibleEmployee = {
      employee: typeof employees[0];
      employeeName: string;
      managerName: string | null;
      tovLevelId: string;
      tovLevelCode: string | null;
      warnings: string[];
    };
    const eligibleEmployees: EligibleEmployee[] = [];

    for (const employee of employees) {
      const employeeName = `${employee.firstName} ${employee.lastName}`;
      const managerName = employee.manager
        ? `${employee.manager.firstName} ${employee.manager.lastName}`
        : null;

      // Get TOV level from employee or function title
      const tovLevelId = employee.tovLevelId || employee.functionTitle?.tovLevelId;
      const tovLevelCode = employee.tovLevel?.code || employee.functionTitle?.tovLevel?.code || null;

      // Collect warnings
      const warnings: string[] = [];
      if (!employee.managerId) {
        warnings.push('No manager assigned');
      }
      if (!tovLevelId) {
        warnings.push('No TOV level mapped');
      }

      // Check if already exists
      if (existingReviewEmployeeIds.has(employee.id)) {
        results.skipped++;
        results.details.push({
          userId: employee.id,
          employeeName,
          managerName,
          tovLevelCode,
          status: isDryRun ? 'will_skip' : 'skipped',
          reason: 'Review already exists for this year',
        });
        continue;
      }

      // Cannot create if no manager
      if (!employee.managerId) {
        results.skipped++;
        results.details.push({
          userId: employee.id,
          employeeName,
          managerName,
          tovLevelCode,
          status: isDryRun ? 'will_skip' : 'skipped',
          reason: 'No manager assigned',
          warnings,
        });
        continue;
      }

      // Cannot create if no TOV level
      if (!tovLevelId) {
        results.skipped++;
        results.details.push({
          userId: employee.id,
          employeeName,
          managerName,
          tovLevelCode,
          status: isDryRun ? 'will_skip' : 'skipped',
          reason: 'No TOV level assigned or mapped from function title',
          warnings,
        });
        continue;
      }

      // In dry run mode, just report what would happen
      if (isDryRun) {
        results.created++;
        results.details.push({
          userId: employee.id,
          employeeName,
          managerName,
          tovLevelCode,
          status: 'will_create',
          warnings: warnings.length > 0 ? warnings : undefined,
        });
        continue;
      }

      // Add to eligible list for transactional creation
      eligibleEmployees.push({
        employee,
        employeeName,
        managerName,
        tovLevelId,
        tovLevelCode,
        warnings,
      });
    }

    // Create all reviews in a transaction (all succeed or all fail)
    if (!isDryRun && eligibleEmployees.length > 0) {
      try {
        await fastify.prisma.$transaction(async (tx) => {
          for (const { employee, employeeName, managerName, tovLevelId, tovLevelCode, warnings } of eligibleEmployees) {
            const competencyLevels = competencyLevelsByTovLevel.get(tovLevelId) || [];

            const review = await tx.reviewCycle.create({
              data: {
                opcoId,
                employeeId: employee.id,
                managerId: employee.managerId!,
                year: body.year,
                tovLevelId,
                status: 'DRAFT',
                stages: {
                  create: [
                    { stageType: 'GOAL_SETTING', status: 'PENDING' },
                    { stageType: 'MID_YEAR_REVIEW', status: 'PENDING' },
                    { stageType: 'END_YEAR_REVIEW', status: 'PENDING' },
                  ],
                },
                competencyScores: {
                  create: competencyLevels.map(cl => ({
                    competencyLevelId: cl.id,
                  })),
                },
              },
            });

            results.created++;
            results.details.push({
              userId: employee.id,
              employeeName,
              managerName,
              tovLevelCode,
              status: 'created',
              reviewCycleId: review.id,
              warnings: warnings.length > 0 ? warnings : undefined,
            });
          }
        });
      } catch (err: any) {
        // Transaction failed - mark all eligible employees as failed
        results.created = 0;
        for (const { employee, employeeName, managerName, tovLevelCode, warnings } of eligibleEmployees) {
          results.failed++;
          results.details.push({
            userId: employee.id,
            employeeName,
            managerName,
            tovLevelCode,
            status: 'failed',
            reason: err.message || 'Transaction failed',
            warnings: warnings.length > 0 ? warnings : undefined,
          });
        }
      }
    }

    // Audit log (only for actual creation, not dry run)
    if (!isDryRun && results.created > 0) {
      await fastify.audit.logFromRequest(request, {
        entityType: 'ReviewCycle',
        entityId: 'bulk',
        action: 'CREATE',
        metadata: {
          year: body.year,
          created: results.created,
          skipped: results.skipped,
          failed: results.failed,
        },
      });
    }

    return {
      year: body.year,
      dryRun: isDryRun,
      created: results.created,
      skipped: results.skipped,
      failed: results.failed,
      details: results.details,
    };
  });
};
