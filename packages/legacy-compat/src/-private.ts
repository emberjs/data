import type Store from '@ember-data/store';

import type { CompatStore } from '.';

/**
 * Utilities - often temporary - for maintaining backwards compatibility with
 * older parts of EmberData.
 *
  @module @ember-data/legacy-compat
  @main @ember-data/legacy-compat
*/
export { SnapshotRecordArray } from './legacy-network-handler/snapshot-record-array';
export { SaveOp } from './legacy-network-handler/fetch-manager';
export { FetchManager } from './legacy-network-handler/fetch-manager';
export { Snapshot } from './legacy-network-handler/snapshot';

export function upgradeStore(store: Store): asserts store is CompatStore {}
