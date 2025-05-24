import type { Store } from '@warp-drive/core';

import type { CompatStore } from '../compat.ts';

/**
 * Utilities - often temporary - for maintaining backwards compatibility with
 * older parts of EmberData.
 *
  @module
*/
export { SnapshotRecordArray } from './legacy-network-handler/snapshot-record-array.ts';
export { SaveOp } from './legacy-network-handler/fetch-manager.ts';
export { FetchManager } from './legacy-network-handler/fetch-manager.ts';
export { Snapshot } from './legacy-network-handler/snapshot.ts';

export function upgradeStore(store: Store): asserts store is CompatStore {}
