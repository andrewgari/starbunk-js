import { LogLayer } from 'loglayer';
import pino from 'pino';
import { PinoTransport } from '@loglayer/transport-pino';
import { createPinoOtlpDestination } from './pino-otlp-transport';

// Determine service name from environment or default to 'starbunk'
const serviceName = process.env.SERVICE_NAME || 'starbunk';

// Create Pino logger with OTLP destination
// When OTEL_ENABLED=true, logs go to OTLP collector
// When OTEL_ENABLED=false, logs go to stdout (fallback)
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { severity: label.toUpperCase() };
    },
  },
}, createPinoOtlpDestination(serviceName));

export const logLayer = new LogLayer({
  transport: new PinoTransport({
    logger: pinoLogger,
  }),
});
