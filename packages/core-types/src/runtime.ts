import type { LOG_CONFIG } from '@warp-drive/build-config/-private/utils/logging';

import { getOrSetUniversal } from './-private';

const RuntimeConfig: { debug: Partial<LOG_CONFIG> } = getOrSetUniversal('WarpDriveRuntimeConfig', {
  debug: {},
});

function trySessionStorage() {
  // This works even when sessionStorage is not available.
  // See https://github.com/emberjs/data/issues/9784
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

const storage = trySessionStorage();
const settings = storage?.getItem('WarpDriveRuntimeConfig');
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
 * globalThis.setWarpDriveLogging({ LOG_CACHE: true } });
 *
 * @typedoc
 */
export function setLogging(config: Partial<LOG_CONFIG>): void {
  Object.assign(RuntimeConfig.debug, config);
  storage?.setItem('WarpDriveRuntimeConfig', JSON.stringify(RuntimeConfig));
}
