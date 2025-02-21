import { config as configDotenv } from 'dotenv';
import { resolve } from 'path';

switch (process.env.NODE_ENV) {
  case 'development':
    console.log('Environment is \'development\'');
    configDotenv({
      path: resolve(__dirname, '../.env.development')
    });
    break;
  case 'test':
    configDotenv({
      path: resolve(__dirname, '../.env.test')
    });
    break;
  // Add 'staging' and 'production' cases here as well!
  default:
    throw new Error(`'NODE_ENV' ${process.env.NODE_ENV} is not handled!`);
}

// Helper function to validate required environment variables
const throwIfNot = function <T, K extends keyof T>(
  obj: Partial<T>,
  prop: K,
  msg?: string
): T[K] {
  if (obj[prop] === undefined || obj[prop] === null) {
    throw new Error(msg || `Environment is missing variable ${String(prop)}`);
  }

  return obj[prop] as T[K];
};

// Validate that we have our expected ENV variables defined!
const requiredEnvVars = ['AUTHENTICATION_API_URL', 'GRAPHQL_API_URL'] as const;
requiredEnvVars.forEach((v) => {
  throwIfNot(process.env, v);
});

export interface IProcessEnv {
  AUTHENTICATION_API_URL: string;
  GRAPHQL_API_URL: string;
}

declare global {
  interface ProcessEnv extends IProcessEnv {}
}
