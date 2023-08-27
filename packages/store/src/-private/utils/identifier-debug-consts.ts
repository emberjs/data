// provided for additional debuggability
export const DEBUG_CLIENT_ORIGINATED: unique symbol = Symbol('record-originated-on-client');
export const DEBUG_IDENTIFIER_BUCKET: unique symbol = Symbol('identifier-bucket');

// also present in production
export const CACHE_OWNER: unique symbol = Symbol('warpDriveCache');
export const STALE_CACHE_OWNER: unique symbol = Symbol('warpDriveStaleCache');
