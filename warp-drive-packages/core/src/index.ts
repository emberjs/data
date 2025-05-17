import { getRuntimeConfig, setLogging } from './types/runtime.ts';

export { Fetch } from './request/-private/fetch.ts';
export { RequestManager } from './request/-private/manager.ts';

// @ts-expect-error adding to globalThis
globalThis.setWarpDriveLogging = setLogging;

// @ts-expect-error adding to globalThis
globalThis.getWarpDriveRuntimeConfig = getRuntimeConfig;
