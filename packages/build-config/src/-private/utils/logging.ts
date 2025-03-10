import * as LOGGING from '../../debugging.ts';

type LOG_CONFIG_KEY = keyof typeof LOGGING;
export type LOG_CONFIG = { [key in LOG_CONFIG_KEY]: boolean };

export function createLoggingConfig(env: { DEBUG: boolean; TESTING: boolean; PRODUCTION: boolean }, debug: LOG_CONFIG) {
  const config = {} as LOG_CONFIG;
  const keys = Object.keys(LOGGING) as LOG_CONFIG_KEY[];

  for (const key of keys) {
    if (env.DEBUG || env.TESTING) {
      config[key] = true;
    } else {
      config[key] = debug[key] || false;
    }
  }

  return config;
}
