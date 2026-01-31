import * as http from 'http';
import { logLayer } from '../observability/log-layer';

const logger = logLayer.withPrefix('SmokeMode');

/**
 * Runs the application in smoke test mode for CI/CD validation.
 * Creates a minimal health server without connecting to Discord.
 *
 * @returns true if smoke mode was activated, false otherwise
 */
export function runSmokeMode(): boolean {
  // CI Smoke Mode: Start minimal health server and skip Discord login
  // This allows CI to verify the Docker container builds and starts correctly
  if (process.env.CI_SMOKE_MODE !== 'true') {
    return false;
  }

  logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
  const port = process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT, 10) : 3000;

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          service: 'bunkbot',
          mode: 'smoke',
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    if (req.url === '/live') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'alive', service: 'bunkbot', mode: 'smoke' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, () => {
    logger.info(`[SMOKE] BunkBot health server running on port ${port}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down smoke mode server...`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return true;
}
