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

// Timeout for bulk import transaction (in ms)
const IMPORT_TRANSACTION_TIMEOUT_MS = 30000;

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
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ name: string; description: string; tovLevelId: string | null; sortOrder: number; isActive: boolean }>;

    // Verify function title belongs to current tenant
    const existing = await fastify.prisma.functionTitle.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { message: 'Function title not found', statusCode: 404 },
      });
    }

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
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      category: string;
      subcategory: string;
      title: object;
      indicators: object;
      sortOrder: number;
      isActive: boolean;
    }>;

    // Verify competency belongs to current tenant
    const existing = await fastify.prisma.competencyLevel.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { message: 'Competency not found', statusCode: 404 },
      });
    }

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

    // Verify competency belongs to current tenant
    const existing = await fastify.prisma.competencyLevel.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { message: 'Competency not found', statusCode: 404 },
      });
    }

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
  // EMPLOYEE BULK IMPORT (with User Creation and Historic Scores)
  // ============================================

  fastify.post('/employees/import', {
    schema: {
      description: 'Bulk import employees with user creation and historic performance scores',
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

      // File upload constants
      const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
      const MAX_ROW_COUNT = 1000;

      // Validate MIME type
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];

      if (!data.mimetype || !allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: { message: 'Invalid file type. Only Excel and CSV files are allowed.', statusCode: 400 },
        });
      }

      // Check file size
      if (bufferData.length > MAX_FILE_SIZE_BYTES) {
        return reply.status(400).send({
          error: { message: 'File size exceeds 10MB limit', statusCode: 400 },
        });
      }

      // Get dryRun from form fields
      const fields = data.fields as Record<string, any>;
      const dryRunField = fields.dryRun;
      const dryRun = dryRunField?.value === 'true' || dryRunField === 'true';

      // Parse Excel/CSV file
      const { default: ExcelJS } = await import('exceljs');
      const Papa = await import('papaparse');
      const workbook = new ExcelJS.Workbook();

      // Determine file type and load
      const isCSV = filename.toLowerCase().endsWith('.csv');
      if (isCSV) {
        // Use papaparse for robust CSV handling (handles quoted values, commas in values, etc.)
        const csvString = bufferData.toString('utf-8');
        const worksheet = workbook.addWorksheet('Import');
        const parseResult = Papa.parse(csvString, {
          skipEmptyLines: true,
          // Don't use header mode - we handle headers ourselves for flexible column mapping
        });

        if (parseResult.errors && parseResult.errors.length > 0) {
          const firstError = parseResult.errors[0];
          return reply.status(400).send({
            error: {
              message: `CSV parsing error at row ${firstError.row || 1}: ${firstError.message}`,
              statusCode: 400,
            },
          });
        }

        parseResult.data.forEach((row: string[]) => {
          worksheet.addRow(row);
        });
      } else {
        // @ts-ignore - Buffer type compatibility
        await workbook.xlsx.load(bufferData);
      }

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return reply.status(400).send({
          error: { message: 'Excel file is empty or invalid', statusCode: 400 },
        });
      }

      // Check row limit (max MAX_ROW_COUNT rows)
      if (worksheet.rowCount > MAX_ROW_COUNT + 1) { // +1 for header row
        return reply.status(400).send({
          error: { message: `File exceeds maximum of ${MAX_ROW_COUNT} rows`, statusCode: 400 },
        });
      }

      // Parse header row
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString() || '';
      });

      // Flexible column mapping
      const columnMap: Record<string, string> = {};
      headers.forEach((header) => {
        const normalized = header.toLowerCase().trim();
        if (normalized.includes('email') && !normalized.includes('manager')) {
          columnMap.email = header;
        } else if (normalized.includes('name') && !normalized.includes('manager') && !normalized.includes('function')) {
          columnMap.name = header;
        } else if (normalized.includes('first') && normalized.includes('name')) {
          columnMap.firstName = header;
        } else if (normalized.includes('last') && normalized.includes('name')) {
          columnMap.lastName = header;
        } else if (normalized.includes('role') && !normalized.includes('title')) {
          columnMap.role = header;
        } else if (normalized.includes('manager') && normalized.includes('email')) {
          columnMap.managerEmail = header;
        } else if (normalized.includes('function') || (normalized.includes('job') && normalized.includes('title'))) {
          columnMap.functionTitle = header;
        } else if (normalized.includes('tov') || (normalized.includes('ide') && normalized.includes('level'))) {
          columnMap.tovLevel = header;
        } else if (normalized.includes('business') && normalized.includes('unit')) {
          columnMap.businessUnit = header;
        } else if (normalized === 'year' || (normalized.includes('year') && !normalized.includes('score'))) {
          columnMap.year = header;
        } else if (normalized.includes('what') && normalized.includes('score')) {
          columnMap.whatScore = header;
        } else if (normalized.includes('how') && normalized.includes('score')) {
          columnMap.howScore = header;
        }
      });

      // Validate required columns
      if (!columnMap.email) {
        return reply.status(400).send({
          error: {
            message: 'Excel file must contain an Email column',
            statusCode: 400,
          },
        });
      }

      // Get lookup data for validation
      const [existingUsers, functionTitles, tovLevels, businessUnits] = await Promise.all([
        fastify.prisma.user.findMany({
          where: withTenantFilter(request),
          select: { id: true, email: true, keycloakId: true },
        }),
        fastify.prisma.functionTitle.findMany({
          where: { ...withTenantFilter(request), isActive: true },
          include: { tovLevel: true },
        }),
        fastify.prisma.tovLevel.findMany({
          where: { ...withTenantFilter(request), isActive: true },
        }),
        fastify.prisma.businessUnit.findMany({
          where: { ...withTenantFilter(request), isActive: true },
        }),
      ]);

      const usersByEmail = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));
      const functionTitlesByName = new Map(functionTitles.map(ft => [ft.name.toLowerCase(), ft]));
      const tovLevelsByCode = new Map(tovLevels.map(tl => [tl.code.toLowerCase(), tl]));
      const businessUnitsByCode = new Map(businessUnits.map(bu => [bu.code.toLowerCase(), bu]));
      const businessUnitsByName = new Map(businessUnits.map(bu => [bu.name.toLowerCase(), bu]));

      // Results tracking
      const results = {
        total: 0,
        usersCreated: 0,
        usersUpdated: 0,
        reviewsCreated: 0,
        reviewsUpdated: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; message: string }>,
      };

      // Collect valid rows for processing
      type ValidRow = {
        rowNum: number;
        email: string;
        firstName: string;
        lastName: string;
        role?: string;
        managerEmail?: string;
        functionTitleId?: string;
        tovLevelId?: string;
        businessUnitId?: string;
        year?: number;
        whatScore?: number;
        howScore?: number;
        existingUserId?: string;
        isNewUser: boolean;
      };
      const validRows: ValidRow[] = [];
      // Map for O(1) duplicate email detection within the import file
      const emailRowMap = new Map<string, number>();

      // First pass: validate all rows
      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        if (!row || row.cellCount === 0) continue;

        // Check if row is completely empty
        let hasContent = false;
        row.eachCell({ includeEmpty: false }, () => { hasContent = true; });
        if (!hasContent) continue;

        results.total++;

        try {
          const getCellValue = (colName: string): string | null => {
            const headerIndex = headers.indexOf(columnMap[colName]);
            if (headerIndex === -1) return null;
            const cell = row.getCell(headerIndex + 1);
            const value = cell.value;
            if (value === null || value === undefined) return null;
            if (typeof value === 'object' && 'text' in value) {
              return (value as any).text?.toString()?.trim() || null;
            }
            return value.toString()?.trim() || null;
          };

          // Required fields
          const email = getCellValue('email');
          if (!email) {
            results.skipped++;
            results.errors.push({ row: rowNum, message: 'Missing email' });
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            results.skipped++;
            results.errors.push({ row: rowNum, message: `Invalid email format: ${email}` });
            continue;
          }

          // Get name (either from Name column or First/Last name columns)
          let firstName = getCellValue('firstName');
          let lastName = getCellValue('lastName');
          const fullName = getCellValue('name');

          if (!firstName && !lastName && fullName) {
            const nameParts = fullName.split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }

          if (!firstName && !lastName) {
            // Try to derive from email
            const emailPart = email.split('@')[0];
            const nameParts = emailPart.split(/[._-]/);
            // Sanitize derived names: remove digits and special characters, capitalize first letter
            const sanitizeName = (name: string): string => {
              const cleaned = name
                .replace(/[^a-zA-Z\s]/g, '') // Remove non-letter characters
                .trim();
              if (!cleaned) return '';
              return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
            };
            firstName = sanitizeName(nameParts[0]) || 'Unknown';
            lastName = nameParts.slice(1).map(sanitizeName).filter(Boolean).join(' ') || '';
          }

          // Check for existing user
          const existingUser = usersByEmail.get(email.toLowerCase());

          // Get optional fields
          const roleStr = getCellValue('role');
          const managerEmail = getCellValue('managerEmail');
          const functionTitleName = getCellValue('functionTitle');
          const tovLevelCode = getCellValue('tovLevel');
          const businessUnitCodeOrName = getCellValue('businessUnit');
          const yearStr = getCellValue('year');
          const whatScoreStr = getCellValue('whatScore');
          const howScoreStr = getCellValue('howScore');

          // Validate and resolve references
          let functionTitleId: string | undefined;
          let tovLevelId: string | undefined;
          let businessUnitId: string | undefined;

          if (functionTitleName) {
            const ft = functionTitlesByName.get(functionTitleName.toLowerCase());
            if (ft) {
              functionTitleId = ft.id;
              // Auto-apply TOV level from function title if not explicitly set
              if (!tovLevelCode && ft.tovLevelId) {
                tovLevelId = ft.tovLevelId;
              }
            }
          }

          if (tovLevelCode) {
            const tl = tovLevelsByCode.get(tovLevelCode.toLowerCase());
            if (tl) {
              tovLevelId = tl.id;
            } else {
              results.skipped++;
              results.errors.push({
                row: rowNum,
                message: `Invalid TOV level: ${tovLevelCode}. Valid values: ${tovLevels.map(t => t.code).join(', ')}`,
              });
              continue;
            }
          }

          if (businessUnitCodeOrName) {
            const bu = businessUnitsByCode.get(businessUnitCodeOrName.toLowerCase()) ||
                       businessUnitsByName.get(businessUnitCodeOrName.toLowerCase());
            if (bu) {
              businessUnitId = bu.id;
            }
          }

          // Parse year and scores
          let year: number | undefined;
          let whatScore: number | undefined;
          let howScore: number | undefined;

          if (yearStr) {
            year = parseInt(yearStr, 10);
            if (isNaN(year) || year < 2000 || year > 2100) {
              results.skipped++;
              results.errors.push({ row: rowNum, message: `Invalid year: ${yearStr}` });
              continue;
            }
          }

          if (whatScoreStr) {
            whatScore = parseFloat(whatScoreStr);
            if (isNaN(whatScore) || whatScore < 1 || whatScore > 3) {
              results.skipped++;
              results.errors.push({ row: rowNum, message: `Invalid WHAT score: ${whatScoreStr}. Must be between 1 and 3.` });
              continue;
            }
          }

          if (howScoreStr) {
            howScore = parseFloat(howScoreStr);
            if (isNaN(howScore) || howScore < 1 || howScore > 3) {
              results.skipped++;
              results.errors.push({ row: rowNum, message: `Invalid HOW score: ${howScoreStr}. Must be between 1 and 3.` });
              continue;
            }
          }

          // Check for duplicate emails within the import file (O(1) lookup)
          const normalizedEmail = email.toLowerCase();
          const firstSeenRow = emailRowMap.get(normalizedEmail);
          if (firstSeenRow !== undefined) {
            results.skipped++;
            results.errors.push({
              row: rowNum,
              message: `Duplicate email '${email}' in file (first seen at row ${firstSeenRow})`,
            });
            continue;
          }
          // Track this email for duplicate detection
          emailRowMap.set(normalizedEmail, rowNum);

          // Add to valid rows
          validRows.push({
            rowNum,
            email: normalizedEmail,
            firstName: firstName || '',
            lastName: lastName || '',
            role: roleStr?.toUpperCase(),
            managerEmail: managerEmail?.toLowerCase(),
            functionTitleId,
            tovLevelId,
            businessUnitId,
            year,
            whatScore,
            howScore,
            existingUserId: existingUser?.id,
            isNewUser: !existingUser,
          });
        } catch (err: any) {
          results.skipped++;
          results.errors.push({
            row: rowNum,
            message: err.message || 'Unknown error parsing row',
          });
        }
      }

      // If dry run, just return what would happen
      if (dryRun) {
        // Batch fetch existing reviews to avoid N+1 query pattern
        const rowsWithScores = validRows.filter(vr =>
          vr.year && (vr.whatScore !== undefined || vr.howScore !== undefined) && vr.existingUserId
        );
        const existingReviews = rowsWithScores.length > 0
          ? await fastify.prisma.reviewCycle.findMany({
              where: {
                employeeId: { in: rowsWithScores.map(vr => vr.existingUserId!) },
                year: { in: [...new Set(rowsWithScores.map(vr => vr.year!))] },
                ...withTenantFilter(request),
              },
            })
          : [];
        const reviewMap = new Map(
          existingReviews.map(r => [`${r.employeeId}-${r.year}`, r])
        );

        for (const vr of validRows) {
          if (vr.isNewUser) {
            results.usersCreated++;
          } else {
            // Check if there are updates to apply
            if (vr.functionTitleId || vr.tovLevelId || vr.businessUnitId || vr.managerEmail) {
              results.usersUpdated++;
            }
          }
          if (vr.year && (vr.whatScore !== undefined || vr.howScore !== undefined)) {
            // Check if review exists using pre-fetched map
            const existingReview = vr.existingUserId
              ? reviewMap.get(`${vr.existingUserId}-${vr.year}`)
              : null;
            if (existingReview) {
              results.reviewsUpdated++;
            } else {
              results.reviewsCreated++;
            }
          }
        }

        return reply.status(200).send({
          success: true,
          dryRun: true,
          filename,
          results,
          preview: validRows.slice(0, 10).map(vr => ({
            row: vr.rowNum,
            email: vr.email,
            name: `${vr.firstName} ${vr.lastName}`.trim(),
            action: vr.isNewUser ? 'CREATE_USER' : 'UPDATE_USER',
            hasScores: !!(vr.year && (vr.whatScore !== undefined || vr.howScore !== undefined)),
          })),
        });
      }

      // Execute import in transaction
      if (validRows.length > 0) {
        // Pre-fetch competency levels grouped by TOV level to avoid N+1 queries
        const allCompetencyLevels = await fastify.prisma.competencyLevel.findMany({
          where: {
            ...withTenantFilter(request),
            isActive: true,
          },
          orderBy: { sortOrder: 'asc' },
        });
        const competencyLevelsByTovId = new Map<string, typeof allCompetencyLevels>();
        for (const cl of allCompetencyLevels) {
          const existing = competencyLevelsByTovId.get(cl.tovLevelId) || [];
          existing.push(cl);
          competencyLevelsByTovId.set(cl.tovLevelId, existing);
        }

        try {
          await fastify.prisma.$transaction(async (tx) => {
            // Build a map of emails to user IDs (including newly created users)
            const userIdByEmail = new Map(existingUsers.map(u => [u.email.toLowerCase(), u.id]));

            // First pass: Create new users
            for (const vr of validRows) {
              if (vr.isNewUser) {
                /**
                 * SECURITY NOTE: Placeholder Keycloak ID
                 *
                 * This generates a temporary placeholder ID for users created via bulk import.
                 * The user cannot authenticate with this placeholder ID.
                 *
                 * Expected flow:
                 * 1. Admin creates user via bulk import (placeholder keycloakId assigned)
                 * 2. User is invited/registered in Keycloak (via admin portal or self-registration)
                 * 3. On first login, the auth middleware (src/plugins/auth.ts):
                 *    - Doesn't find user by keycloakId (placeholder doesn't match Keycloak sub)
                 *    - Finds user by email instead
                 *    - Updates keycloakId to the real Keycloak subject ID
                 *
                 * The placeholder prefix ensures uniqueness and makes it obvious in the database
                 * which users haven't authenticated yet. The auth middleware handles the
                 * keycloakId synchronization automatically via email matching.
                 *
                 * Users with placeholder IDs:
                 * - Cannot log in until registered in Keycloak
                 * - Are visible in the admin portal for invitation
                 * - Can have reviews and relationships assigned before they authenticate
                 */
                const keycloakId = `placeholder-${Date.now()}-${Math.random().toString(36).substring(7)}`;

                // Build displayName, ensuring empty string becomes null
                const trimmedDisplayName = `${vr.firstName} ${vr.lastName}`.trim();

                // Validate role and warn if invalid
                const isValidRole = vr.role && Object.values(UserRole).includes(vr.role as UserRole);
                if (vr.role && !isValidRole) {
                  results.errors.push({
                    row: vr.rowNum,
                    message: `Invalid role '${vr.role}' - defaulting to EMPLOYEE. Valid roles: ${Object.values(UserRole).join(', ')}`,
                  });
                }

                const newUser = await tx.user.create({
                  data: {
                    opcoId: request.tenant.opcoId,
                    keycloakId,
                    email: vr.email,
                    firstName: vr.firstName,
                    lastName: vr.lastName,
                    displayName: trimmedDisplayName.length > 0 ? trimmedDisplayName : null,
                    role: isValidRole ? vr.role as UserRole : UserRole.EMPLOYEE,
                    functionTitleId: vr.functionTitleId || null,
                    tovLevelId: vr.tovLevelId || null,
                    businessUnitId: vr.businessUnitId || null,
                    isActive: true,
                  },
                });

                vr.existingUserId = newUser.id;
                userIdByEmail.set(vr.email, newUser.id);
                results.usersCreated++;
              }
            }

            // Second pass: Update existing users and resolve manager relationships
            for (const vr of validRows) {
              if (!vr.isNewUser && vr.existingUserId) {
                const updateData: any = {};

                if (vr.functionTitleId) updateData.functionTitleId = vr.functionTitleId;
                if (vr.tovLevelId) updateData.tovLevelId = vr.tovLevelId;
                if (vr.businessUnitId) updateData.businessUnitId = vr.businessUnitId;

                if (Object.keys(updateData).length > 0) {
                  await tx.user.update({
                    where: { id: vr.existingUserId },
                    data: updateData,
                  });
                  results.usersUpdated++;
                }
              }

              // Resolve manager relationship
              if (vr.managerEmail && vr.existingUserId) {
                const managerId = userIdByEmail.get(vr.managerEmail);
                if (managerId && managerId !== vr.existingUserId) {
                  await tx.user.update({
                    where: { id: vr.existingUserId },
                    data: { managerId },
                  });
                } else if (!managerId) {
                  // Warn when manager email can't be resolved
                  results.errors.push({
                    row: vr.rowNum,
                    message: `Manager email '${vr.managerEmail}' not found - manager relationship not set`,
                  });
                }
              }
            }

            // Third pass: Create/update review cycles
            // Batch-fetch user data (managerId, tovLevelId) to avoid N+1 queries
            const rowsWithScores = validRows.filter(vr =>
              vr.year && (vr.whatScore !== undefined || vr.howScore !== undefined) && vr.existingUserId
            );
            const userIdsForReviews = [...new Set(rowsWithScores.map(vr => vr.existingUserId!))];
            const usersForReviews = userIdsForReviews.length > 0
              ? await tx.user.findMany({
                  where: { id: { in: userIdsForReviews } },
                  select: { id: true, managerId: true, tovLevelId: true },
                })
              : [];
            const userDataMap = new Map(usersForReviews.map(u => [u.id, u]));

            // Batch-fetch existing reviews to avoid N+1 queries
            const existingReviews = rowsWithScores.length > 0
              ? await tx.reviewCycle.findMany({
                  where: {
                    employeeId: { in: userIdsForReviews },
                    year: { in: [...new Set(rowsWithScores.map(vr => vr.year!))] },
                    ...withTenantFilter(request),
                  },
                })
              : [];
            const reviewMap = new Map(
              existingReviews.map(r => [`${r.employeeId}-${r.year}`, r])
            );

            for (const vr of validRows) {
              if (!vr.year || (vr.whatScore === undefined && vr.howScore === undefined)) {
                continue;
              }

              if (!vr.existingUserId) continue;

              // Get user's manager and TOV level from pre-fetched map
              const user = userDataMap.get(vr.existingUserId);
              if (!user) continue;

              // Get TOV level (from row, user, or default)
              let reviewTovLevelId = vr.tovLevelId || user.tovLevelId;
              if (!reviewTovLevelId) {
                const defaultTov = tovLevels[0];
                if (defaultTov) reviewTovLevelId = defaultTov.id;
              }

              if (!reviewTovLevelId) {
                results.errors.push({
                  row: vr.rowNum,
                  message: 'Cannot create review without TOV level',
                });
                continue;
              }

              // Check for existing review using pre-fetched map
              const existingReview = reviewMap.get(`${vr.existingUserId}-${vr.year}`);

              if (existingReview) {
                // Update existing review
                await tx.reviewCycle.update({
                  where: { id: existingReview.id },
                  data: {
                    whatScoreEndYear: vr.whatScore ?? existingReview.whatScoreEndYear,
                    howScoreEndYear: vr.howScore ?? existingReview.howScoreEndYear,
                    status: CycleStatus.COMPLETED,
                    tovLevelId: vr.tovLevelId || existingReview.tovLevelId,
                  },
                });
                results.reviewsUpdated++;
              } else {
                // Get competency levels from pre-fetched map
                const competencyLevels = competencyLevelsByTovId.get(reviewTovLevelId) || [];

                // Create new review
                await tx.reviewCycle.create({
                  data: {
                    opcoId: request.tenant.opcoId,
                    employeeId: vr.existingUserId,
                    managerId: user.managerId || vr.existingUserId, // Self if no manager
                    year: vr.year,
                    tovLevelId: reviewTovLevelId,
                    status: CycleStatus.COMPLETED,
                    whatScoreEndYear: vr.whatScore ?? null,
                    howScoreEndYear: vr.howScore ?? null,
                    stages: {
                      create: [
                        { stageType: 'GOAL_SETTING', status: 'COMPLETED' },
                        { stageType: 'MID_YEAR_REVIEW', status: 'COMPLETED' },
                        { stageType: 'END_YEAR_REVIEW', status: 'COMPLETED' },
                      ],
                    },
                    // Note: For historical imports, we leave individual competency scores as null
                    // because the HOW score is an aggregate - we don't have actual per-competency data.
                    // The howScoreEndYear field stores the aggregate score for display purposes.
                    competencyScores: {
                      create: competencyLevels.map(cl => ({
                        competencyLevelId: cl.id,
                        scoreEndYear: null, // No individual scores for historical imports
                      })),
                    },
                  },
                });
                results.reviewsCreated++;
              }
            }
          }, { timeout: IMPORT_TRANSACTION_TIMEOUT_MS });

          // Audit log
          await fastify.audit.logFromRequest(request, {
            entityType: 'User',
            entityId: 'bulk-import',
            action: 'IMPORT',
            metadata: {
              filename,
              ...results,
            },
          });
        } catch (err: any) {
          fastify.log.error(err);
          return reply.status(500).send({
            error: {
              message: `Import failed: ${err.message}. No changes were made.`,
              statusCode: 500,
            },
          });
        }
      }

      return reply.status(200).send({
        success: true,
        dryRun: false,
        filename,
        results,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: {
          message: err.message || 'Failed to import employees',
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

  // ============================================
  // TEAMS MANAGEMENT (Admin creates, HR manages)
  // ============================================

  fastify.get('/teams', {
    schema: {
      description: 'List all teams for current OpCo (with optional BU filter)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          businessUnitId: { type: 'string', description: 'Filter by business unit' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request) => {
    const query = request.query as { businessUnitId?: string };

    const teams = await fastify.prisma.team.findMany({
      where: {
        ...withTenantFilter(request),
        ...(query.businessUnitId && { businessUnitId: query.businessUnitId }),
        isActive: true,
      },
      include: {
        businessUnit: {
          select: { id: true, name: true, code: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: [{ businessUnit: { name: 'asc' } }, { sortOrder: 'asc' }],
    });
    return teams;
  });

  fastify.post('/teams', {
    schema: {
      description: 'Create a team within a business unit',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          businessUnitId: { type: 'string', description: 'Parent business unit ID' },
          code: { type: 'string', description: 'Short unique code (e.g., PS, RD)' },
          name: { type: 'string', description: 'Display name' },
          description: { type: 'string' },
          teamType: { type: 'string', enum: ['PS', 'CS', 'RD', 'SM', 'GA', 'MA'], description: 'Standard team type' },
          managerId: { type: 'string', description: 'Team manager user ID' },
          sortOrder: { type: 'integer' },
        },
        required: ['businessUnitId', 'code', 'name', 'teamType'],
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const body = request.body as {
      businessUnitId: string;
      code: string;
      name: string;
      description?: string;
      teamType: 'PS' | 'CS' | 'RD' | 'SM' | 'GA' | 'MA';
      managerId?: string;
      sortOrder?: number;
    };

    // Verify business unit exists in tenant
    const businessUnit = await fastify.prisma.businessUnit.findFirst({
      where: {
        id: body.businessUnitId,
        ...withTenantFilter(request),
      },
    });

    if (!businessUnit) {
      return reply.status(404).send({
        error: { message: 'Business unit not found', statusCode: 404 },
      });
    }

    // Check for duplicate code within BU
    const existing = await fastify.prisma.team.findFirst({
      where: {
        businessUnitId: body.businessUnitId,
        code: body.code,
      },
    });

    if (existing) {
      return reply.status(409).send({
        error: { message: 'A team with this code already exists in this business unit', statusCode: 409 },
      });
    }

    const team = await fastify.prisma.team.create({
      data: {
        opcoId: request.tenant.opcoId,
        businessUnitId: body.businessUnitId,
        code: body.code,
        name: body.name,
        description: body.description,
        teamType: body.teamType,
        managerId: body.managerId || null,
        sortOrder: body.sortOrder || 0,
      },
      include: {
        businessUnit: {
          select: { id: true, name: true, code: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return reply.status(201).send(team);
  });

  fastify.patch('/teams/:id', {
    schema: {
      description: 'Update a team (HR can update manager, Admin can update all fields)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          teamType: { type: 'string', enum: ['PS', 'CS', 'RD', 'SM', 'GA', 'MA'] },
          managerId: { type: 'string' },
          sortOrder: { type: 'integer' },
          isActive: { type: 'boolean' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{
      code: string;
      name: string;
      description: string;
      teamType: 'PS' | 'CS' | 'RD' | 'SM' | 'GA' | 'MA';
      managerId: string | null;
      sortOrder: number;
      isActive: boolean;
    }>;

    // Verify team exists in tenant
    const existing = await fastify.prisma.team.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { message: 'Team not found', statusCode: 404 },
      });
    }

    // HR users can only update managerId
    if (request.user.role === UserRole.HR) {
      const allowedFields = ['managerId'];
      const hasDisallowedFields = Object.keys(body).some(key => !allowedFields.includes(key));
      if (hasDisallowedFields) {
        return reply.status(403).send({
          error: {
            message: 'HR users can only update the team manager',
            statusCode: 403,
          },
        });
      }
    }

    // Check for duplicate code if code is being changed
    if (body.code && body.code !== existing.code) {
      const duplicate = await fastify.prisma.team.findFirst({
        where: {
          businessUnitId: existing.businessUnitId,
          code: body.code,
          id: { not: id },
        },
      });

      if (duplicate) {
        return reply.status(409).send({
          error: { message: 'A team with this code already exists in this business unit', statusCode: 409 },
        });
      }
    }

    // Convert empty string to null for managerId
    const updateData: typeof body = { ...body };
    if (updateData.managerId === '') updateData.managerId = null;

    const team = await fastify.prisma.team.update({
      where: { id },
      data: updateData,
      include: {
        businessUnit: {
          select: { id: true, name: true, code: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return team;
  });

  fastify.delete('/teams/:id', {
    schema: {
      description: 'Delete a team (soft delete)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify team exists in tenant
    const existing = await fastify.prisma.team.findFirst({
      where: {
        id,
        ...withTenantFilter(request),
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { message: 'Team not found', statusCode: 404 },
      });
    }

    // Check if team has members
    if (existing._count.members > 0) {
      return reply.status(400).send({
        error: {
          message: `Cannot delete team: ${existing._count.members} members are assigned to it`,
          statusCode: 400,
        },
      });
    }

    // Soft delete
    await fastify.prisma.team.update({
      where: { id },
      data: { isActive: false },
    });

    return reply.status(204).send();
  });

  // Bulk create standard teams for a business unit
  fastify.post('/business-units/:buId/teams/standard', {
    schema: {
      description: 'Create standard teams for a business unit (PS, CS, R&D, S&M, G&A, optionally M&A)',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          includeMA: { type: 'boolean', description: 'Include Merger & Acquisition team (default false)' },
        },
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { buId } = request.params as { buId: string };
    const body = request.body as { includeMA?: boolean };

    // Verify business unit exists in tenant
    const businessUnit = await fastify.prisma.businessUnit.findFirst({
      where: {
        id: buId,
        ...withTenantFilter(request),
      },
    });

    if (!businessUnit) {
      return reply.status(404).send({
        error: { message: 'Business unit not found', statusCode: 404 },
      });
    }

    // Get existing teams for this BU
    const existingTeams = await fastify.prisma.team.findMany({
      where: { businessUnitId: buId },
      select: { code: true, teamType: true },
    });
    const existingCodes = new Set(existingTeams.map(t => t.code));

    // Standard team definitions
    const standardTeams: Array<{
      code: string;
      name: string;
      teamType: 'PS' | 'CS' | 'RD' | 'SM' | 'GA' | 'MA';
      sortOrder: number;
    }> = [
      { code: 'PS', name: 'Professional Services', teamType: 'PS', sortOrder: 1 },
      { code: 'CS', name: 'Customer Services & Maintenance', teamType: 'CS', sortOrder: 2 },
      { code: 'RD', name: 'Research & Development', teamType: 'RD', sortOrder: 3 },
      { code: 'SM', name: 'Sales & Marketing', teamType: 'SM', sortOrder: 4 },
      { code: 'GA', name: 'General & Administration', teamType: 'GA', sortOrder: 5 },
    ];

    // Optionally include M&A
    if (body.includeMA) {
      standardTeams.push({ code: 'MA', name: 'Merger & Acquisition', teamType: 'MA', sortOrder: 6 });
    }

    // Filter out teams that already exist
    const teamsToCreate = standardTeams.filter(t => !existingCodes.has(t.code));

    if (teamsToCreate.length === 0) {
      return reply.status(200).send({
        message: 'All standard teams already exist',
        created: 0,
        skipped: standardTeams.length,
        teams: [],
      });
    }

    // Create teams in transaction
    const createdTeams = await fastify.prisma.$transaction(
      teamsToCreate.map(team =>
        fastify.prisma.team.create({
          data: {
            opcoId: request.tenant.opcoId,
            businessUnitId: buId,
            ...team,
          },
          include: {
            businessUnit: {
              select: { id: true, name: true, code: true },
            },
          },
        })
      )
    );

    return reply.status(201).send({
      created: createdTeams.length,
      skipped: standardTeams.length - teamsToCreate.length,
      teams: createdTeams,
    });
  });

  // ============================================
  // HR ASSIGNMENTS TO BUSINESS UNITS
  // ============================================

  fastify.get('/business-units/:buId/hr-assignments', {
    schema: {
      description: 'List HR users assigned to a business unit',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { buId } = request.params as { buId: string };

    // Verify business unit exists in tenant
    const businessUnit = await fastify.prisma.businessUnit.findFirst({
      where: {
        id: buId,
        ...withTenantFilter(request),
      },
    });

    if (!businessUnit) {
      return reply.status(404).send({
        error: { message: 'Business unit not found', statusCode: 404 },
      });
    }

    const assignments = await fastify.prisma.businessUnitHR.findMany({
      where: { businessUnitId: buId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    return assignments.map(a => ({
      id: a.id,
      user: a.user,
      assignedAt: a.createdAt,
    }));
  });

  fastify.post('/business-units/:buId/hr-assignments', {
    schema: {
      description: 'Assign HR user(s) to a business unit',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          userIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'User IDs to assign (must have HR role)',
          },
        },
        required: ['userIds'],
      },
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { buId } = request.params as { buId: string };
    const body = request.body as { userIds: string[] };

    // Verify business unit exists in tenant
    const businessUnit = await fastify.prisma.businessUnit.findFirst({
      where: {
        id: buId,
        ...withTenantFilter(request),
      },
    });

    if (!businessUnit) {
      return reply.status(404).send({
        error: { message: 'Business unit not found', statusCode: 404 },
      });
    }

    // Verify all users exist and have HR role
    const users = await fastify.prisma.user.findMany({
      where: {
        id: { in: body.userIds },
        ...withTenantFilter(request),
        role: UserRole.HR,
      },
    });

    if (users.length !== body.userIds.length) {
      const foundIds = new Set(users.map(u => u.id));
      const notFound = body.userIds.filter(id => !foundIds.has(id));
      return reply.status(400).send({
        error: {
          message: 'Some users not found or do not have HR role',
          statusCode: 400,
          notFoundIds: notFound,
        },
      });
    }

    // Create assignments (skip duplicates using upsert-like behavior)
    const results = {
      created: 0,
      skipped: 0,
    };

    for (const userId of body.userIds) {
      const existing = await fastify.prisma.businessUnitHR.findFirst({
        where: { businessUnitId: buId, userId },
      });

      if (!existing) {
        await fastify.prisma.businessUnitHR.create({
          data: {
            businessUnitId: buId,
            userId,
          },
        });
        results.created++;
      } else {
        results.skipped++;
      }
    }

    return reply.status(201).send(results);
  });

  fastify.delete('/business-units/:buId/hr-assignments/:userId', {
    schema: {
      description: 'Remove HR user assignment from a business unit',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { buId, userId } = request.params as { buId: string; userId: string };

    // Verify business unit exists in tenant
    const businessUnit = await fastify.prisma.businessUnit.findFirst({
      where: {
        id: buId,
        ...withTenantFilter(request),
      },
    });

    if (!businessUnit) {
      return reply.status(404).send({
        error: { message: 'Business unit not found', statusCode: 404 },
      });
    }

    // Find and delete the assignment
    const deleted = await fastify.prisma.businessUnitHR.deleteMany({
      where: {
        businessUnitId: buId,
        userId,
      },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({
        error: { message: 'HR assignment not found', statusCode: 404 },
      });
    }

    return reply.status(204).send();
  });

  // ============================================
  // OPCO ADMIN ASSIGNMENTS (Super Admin only)
  // ============================================

  fastify.get('/opcos/:opcoId/admin-assignments', {
    schema: {
      description: 'List admin users assigned to an OpCo',
      tags: ['Super Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { opcoId } = request.params as { opcoId: string };

    // Verify OpCo exists
    const opco = await fastify.prisma.opCo.findUnique({
      where: { id: opcoId },
    });

    if (!opco) {
      return reply.status(404).send({
        error: { message: 'OpCo not found', statusCode: 404 },
      });
    }

    const assignments = await fastify.prisma.opCoAdmin.findMany({
      where: { opcoId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    return assignments.map(a => ({
      id: a.id,
      user: a.user,
      assignedAt: a.createdAt,
    }));
  });

  fastify.post('/opcos/:opcoId/admin-assignments', {
    schema: {
      description: 'Assign admin user(s) to an OpCo',
      tags: ['Super Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          userIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'User IDs to assign (must have OPCO_ADMIN role)',
          },
        },
        required: ['userIds'],
      },
    },
    preHandler: [fastify.authorize(UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { opcoId } = request.params as { opcoId: string };
    const body = request.body as { userIds: string[] };

    // Verify OpCo exists
    const opco = await fastify.prisma.opCo.findUnique({
      where: { id: opcoId },
    });

    if (!opco) {
      return reply.status(404).send({
        error: { message: 'OpCo not found', statusCode: 404 },
      });
    }

    // Verify all users exist and have OPCO_ADMIN role
    const users = await fastify.prisma.user.findMany({
      where: {
        id: { in: body.userIds },
        role: UserRole.OPCO_ADMIN,
      },
    });

    if (users.length !== body.userIds.length) {
      const foundIds = new Set(users.map(u => u.id));
      const notFound = body.userIds.filter(id => !foundIds.has(id));
      return reply.status(400).send({
        error: {
          message: 'Some users not found or do not have OPCO_ADMIN role',
          statusCode: 400,
          notFoundIds: notFound,
        },
      });
    }

    // Create assignments (skip duplicates)
    const results = {
      created: 0,
      skipped: 0,
    };

    for (const userId of body.userIds) {
      const existing = await fastify.prisma.opCoAdmin.findFirst({
        where: { opcoId, userId },
      });

      if (!existing) {
        await fastify.prisma.opCoAdmin.create({
          data: {
            opcoId,
            userId,
          },
        });
        results.created++;
      } else {
        results.skipped++;
      }
    }

    return reply.status(201).send(results);
  });

  fastify.delete('/opcos/:opcoId/admin-assignments/:userId', {
    schema: {
      description: 'Remove admin user assignment from an OpCo',
      tags: ['Super Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.TSS_SUPER_ADMIN)],
  }, async (request, reply) => {
    const { opcoId, userId } = request.params as { opcoId: string; userId: string };

    // Verify OpCo exists
    const opco = await fastify.prisma.opCo.findUnique({
      where: { id: opcoId },
    });

    if (!opco) {
      return reply.status(404).send({
        error: { message: 'OpCo not found', statusCode: 404 },
      });
    }

    // Find and delete the assignment
    const deleted = await fastify.prisma.opCoAdmin.deleteMany({
      where: {
        opcoId,
        userId,
      },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({
        error: { message: 'Admin assignment not found', statusCode: 404 },
      });
    }

    return reply.status(204).send();
  });

  // ============================================
  // TEAM TYPE REFERENCE
  // ============================================

  fastify.get('/team-types', {
    schema: {
      description: 'Get list of standard team types',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authorize(UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)],
  }, async () => {
    return [
      { code: 'PS', name: 'Professional Services', description: 'Professional Services team' },
      { code: 'CS', name: 'Customer Services & Maintenance', description: 'Customer Services and Maintenance team' },
      { code: 'RD', name: 'Research & Development', description: 'Research and Development team' },
      { code: 'SM', name: 'Sales & Marketing', description: 'Sales and Marketing team' },
      { code: 'GA', name: 'General & Administration', description: 'General and Administration team' },
      { code: 'MA', name: 'Merger & Acquisition', description: 'Merger and Acquisition team (optional)' },
    ];
  });
};
