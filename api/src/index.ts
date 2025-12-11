import { buildApp } from './app.js';
import { config } from './config/index.js';

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Server running on port ${config.port}`);
    app.log.info(`Environment: ${config.nodeEnv}`);
    app.log.info(`Swagger UI: http://localhost:${config.port}/documentation`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    process.exit(0);
  });
});

start();
