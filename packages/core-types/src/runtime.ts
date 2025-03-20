import type { LOG_CONFIG } from '@warp-drive/build-config/-private/utils/logging';

import { getOrSetUniversal } from './-private';

const RuntimeConfig: { debug: Partial<LOG_CONFIG> } = getOrSetUniversal('WarpDriveRuntimeConfig', {
  debug: {},
});

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
