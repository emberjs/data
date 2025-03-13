import { LOG_CONFIG } from './-private/utils/logging';

const RuntimeConfig = {
  debug: {},
};

const settings = globalThis.sessionStorage?.getItem('WarpDriveRuntimeConfig');
if (settings) {
  Object.assign(RuntimeConfig, JSON.parse(settings));
}

export function getRuntimeConfig(): typeof RuntimeConfig {
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
export function setLogging(config: Partial<LOG_CONFIG>): void {
  Object.assign(RuntimeConfig.debug, config);
  globalThis.sessionStorage?.setItem('WarpDriveRuntimeConfig', JSON.stringify(RuntimeConfig));
}
