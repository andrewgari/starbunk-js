import { registerHealthCheckModule } from '../observability/health-server';
import { logLayer } from '../observability/log-layer';

const logger = logLayer.withPrefix('ConfigHealth');

/**
 * Register a health check module that reports whether all required environment
 * variables are present. Missing or empty variables are surfaced as warnings
 * in the /health response.
 *
 * @param requiredVars - list of env var names that must be non-empty
 * @param serviceName  - label used in the module name (e.g. "bunkbot")
 */
export function registerConfigHealthCheck(requiredVars: string[], serviceName: string): void {
  registerHealthCheckModule({
    name: 'config',
    getHealth: async () => {
      const missing: string[] = [];
      const present: string[] = [];

      for (const name of requiredVars) {
        const val = process.env[name];
        if (!val) {
          missing.push(name);
        } else {
          present.push(name);
        }
      }

      const status = missing.length > 0 ? 'error' : 'ok';
      if (status === 'error') {
        logger
          .withMetadata({ service: serviceName, missing })
          .warn('Required configuration variables are missing');
      }

      return {
        status,
        service: serviceName,
        required_vars: requiredVars.length,
        present_count: present.length,
        missing,
      };
    },
  });

  logger
    .withMetadata({ service: serviceName, var_count: requiredVars.length })
    .info('Config health check registered');
}
