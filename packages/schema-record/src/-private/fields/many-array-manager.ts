import type Store from '@ember-data/store';
import type { RelatedCollection as ManyArray } from '@ember-data/store/-private';
import { fastPush, SOURCE } from '@ember-data/store/-private';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { CollectionRelationship } from '@warp-drive/core-types/cache/relationship';
import type { LocalRelationshipOperation } from '@warp-drive/core-types/graph';
import type { CacheOptions } from '@warp-drive/core-types/request';
import { EnableHydration } from '@warp-drive/core-types/request';
import type { CollectionResourceRelationship } from '@warp-drive/core-types/spec/json-api-raw';
import { RecordStore } from '@warp-drive/core-types/symbols';

import type { SchemaRecord } from '../record';
import { Identifier } from '../symbols';

export interface FindHasManyOptions {
  reload?: boolean;
  backgroundReload?: boolean;
}

export class ManyArrayManager {
  declare record: SchemaRecord;
  declare store: Store;
  declare identifier: StableRecordIdentifier;
  declare editable: boolean;

  constructor(record: SchemaRecord, editable: boolean) {
    this.record = record;
    this.store = record[RecordStore];
    this.identifier = record[Identifier];
    this.editable = editable;
  }

  _syncArray(array: ManyArray) {
    const method = this.editable ? 'getRelationship' : 'getRemoteRelationship';
    const rawValue = this.store.cache[method](this.identifier, array.key) as CollectionRelationship;

    if (rawValue.meta) {
      array.meta = rawValue.meta;
    }

    if (rawValue.links) {
      array.links = rawValue.links;
    }

    const currentState = array[SOURCE];

    // unlike in the normal RecordArray case, we don't need to divorce the reference
    // because we don't need to worry about associate/disassociate since the graph
    // takes care of that for us
    if (currentState !== rawValue.data) {
      currentState.length = 0;
      fastPush(currentState, rawValue.data as StableRecordIdentifier[]);
    }
  }

  reloadHasMany<T>(key: string, options?: FindHasManyOptions): Promise<ManyArray<T>> {
    const field = this.store.schema.fields(this.identifier).get(key);
    assert(`Expected a hasMany field for ${key}`, field?.kind === 'hasMany');

    const cacheOptions = options ? extractCacheOptions(options) : { reload: true };
    cacheOptions.types = [field.type];

    const rawValue = this.store.cache.getRelationship(this.identifier, key) as CollectionRelationship;

    const req = {
      url: getRelatedLink(rawValue),
      op: 'findHasMany',
      method: 'GET' as const,
      records: rawValue.data as StableRecordIdentifier[],
      cacheOptions,
      options: {
        field,
        identifier: this.identifier,
        links: rawValue.links,
        meta: rawValue.meta,
      },
      [EnableHydration]: false,
    };

    return this.store.request(req) as unknown as Promise<ManyArray<T>>;
  }

  mutate(mutation: LocalRelationshipOperation): void {
    this.store.cache.mutate(mutation);
  }
}

function getRelatedLink(resource: CollectionResourceRelationship): string {
  const related = resource.links?.related;
  assert(`Expected a related link`, related);

  return typeof related === 'object' ? related.href : related;
}

function extractCacheOptions(options: FindHasManyOptions) {
  const cacheOptions: CacheOptions = {};
  if ('reload' in options) {
    cacheOptions.reload = options.reload;
  }
  if ('backgroundReload' in options) {
    cacheOptions.backgroundReload = options.backgroundReload;
  }
  return cacheOptions;
}
