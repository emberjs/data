import { LOG_CONFIG } from './-private/utils/logging';

const RuntimeConfig = {
  debug: {},
};

export function getRuntimeConfig() {
  return RuntimeConfig;
}

/**
 * Upserts the specified logging configuration into the runtime
 * config.
 *
 * globalThis.setWarpDriveLogging({ LOG_PAYLOADS: true } });
 *
 * @typedoc
 */
export function setLogging(config: Partial<LOG_CONFIG>) {
  Object.assign(RuntimeConfig.debug, config);
}
