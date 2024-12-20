import type Store from '@ember-data/store';
import type { RelatedCollection as ManyArray } from '@ember-data/store/-private';
import { fastPush, SOURCE } from '@ember-data/store/-private';
import type { BaseFinderOptions } from '@ember-data/store/types';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { CollectionRelationship } from '@warp-drive/core-types/cache/relationship';
import { RecordStore } from '@warp-drive/core-types/symbols';

import type { SchemaRecord } from '../record';
import { Identifier } from '../symbols';

export class ManyArrayManager {
  declare record: SchemaRecord;
  declare store: Store;
  declare cache: Cache;
  declare identifier: StableRecordIdentifier;

  constructor(record: SchemaRecord) {
    this.record = record;
    this.store = record[RecordStore];
    this.identifier = record[Identifier];
  }

  _syncArray(array: ManyArray) {
    const rawValue = this.store.cache.getRelationship(this.identifier, array.key) as CollectionRelationship;

    if (rawValue.meta) {
      array.meta = rawValue.meta;
    }

    if (rawValue.links) {
      array.links = rawValue.links;
    }

    const currentState = array[SOURCE];
    currentState.length = 0;
    fastPush(currentState, rawValue.data as StableRecordIdentifier[]);
  }

  reloadHasMany<T>(key: string, options?: BaseFinderOptions): Promise<ManyArray<T>> {}
}
