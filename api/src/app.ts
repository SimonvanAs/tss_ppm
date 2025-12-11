import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config/index.js';
import { authPlugin } from './plugins/auth.js';
import { tenantPlugin } from './plugins/tenant.js';
import { prismaPlugin } from './plugins/prisma.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { reviewsRoutes } from './modules/reviews/reviews.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { calibrationRoutes } from './modules/calibration/calibration.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: config.nodeEnv === 'production',
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  // Multipart support for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'TSS PPM API',
        description: 'Multi-tenant Performance Review Management API',
        version: '1.0.0',
      },
      servers: [
        { url: `http://localhost:${config.port}`, description: 'Development' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Database plugin
  await app.register(prismaPlugin);

  // Auth & tenant plugins
  await app.register(authPlugin);
  await app.register(tenantPlugin);

  // Routes
  await app.register(healthRoutes, { prefix: '/api/v1/health' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(usersRoutes, { prefix: '/api/v1/users' });
  await app.register(reviewsRoutes, { prefix: '/api/v1/reviews' });
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });
  await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  await app.register(calibrationRoutes, { prefix: '/api/v1/calibration' });

  // Global error handler
  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    app.log.error(error);

    const statusCode = error.statusCode ?? 500;
    const message = statusCode === 500 && config.nodeEnv === 'production'
      ? 'Internal Server Error'
      : error.message;

    reply.status(statusCode).send({
      error: {
        message,
        statusCode,
        ...(config.nodeEnv === 'development' && { stack: error.stack }),
      },
    });
  });

  return app;
}
