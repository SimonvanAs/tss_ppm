import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { healthRoutes } from '../src/modules/health/health.routes.js';

describe('Health Routes', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    $queryRaw: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeAll(async () => {
    app = Fastify({ logger: false });

    // Decorate with mock prisma
    app.decorate('prisma', mockPrisma);

    await app.register(healthRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return healthy status when database is connected', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.database).toBe('healthy');
      expect(body.version).toBe('1.0.0');
      expect(body.timestamp).toBeDefined();
    });

    it('should return degraded status when database is disconnected', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('degraded');
      expect(body.database).toBe('unhealthy');
    });
  });

  describe('GET /ready', () => {
    it('should return ready: true when database is available', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ready).toBe(true);
    });

    it('should return ready: false when database is unavailable', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ready).toBe(false);
    });
  });

  describe('GET /live', () => {
    it('should always return alive: true', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.alive).toBe(true);
    });
  });
});
