import express from 'express';
import http from 'http';

export interface HealthServer {
  app: express.Express;
  server: http.Server;
}

export function createHealthServer(port = 3003): HealthServer {
  const app = express();

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'covabot', port });
  });

  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[Health] CovaBot health server listening on ${port}`);
  });

  return { app, server };
}

