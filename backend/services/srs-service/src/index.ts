import express from 'express';
import helmet from 'helmet';
import { loadConfig } from './config';
import { initPool } from './db/pool';
import { runMigrations } from './db/migrate';
import { SrsStore } from './store/srs-store';
import { SrsService } from './service/srs-service';
import { startConsumer } from './events/consumer';
import { buildRoutes } from './http/routes';
import { errorMiddleware } from './http/error-middleware';

async function main() {
  const cfg = loadConfig();

  const pool = initPool(cfg.databaseUrl);
  await runMigrations(pool);

  const svc = new SrsService(new SrsStore(pool));
  const consumer = await startConsumer(cfg.rabbitUrl, svc);

  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', service: 'srs-service' });
  });
  app.use(buildRoutes(svc));
  app.use(errorMiddleware);

  const server = app.listen(cfg.port, () =>
    console.log(JSON.stringify({ level: 'info', msg: 'srs-service listening', port: cfg.port })),
  );

  const shutdown = async () => {
    await consumer.close();
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
