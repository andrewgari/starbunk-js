import { LogLayer } from 'loglayer';
import pino from 'pino';
import { PinoTransport } from '@loglayer/transport-pino';

export const logLayer = new LogLayer({
  transport: new PinoTransport({
    logger: pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => {
          return { severity: label.toUpperCase() };
        },
      },
    })
  }),
});
