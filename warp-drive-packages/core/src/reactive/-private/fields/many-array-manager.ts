import { assert } from '@warp-drive/core/build-config/macros';

import type { Store } from '../../../index.ts';
import type { RelatedCollection as ManyArray } from '../../../store/-private.ts';
import { fastPush, SOURCE } from '../../../store/-private.ts';
import type { CollectionRelationship } from '../../../types/cache/relationship.ts';
import type { LocalRelationshipOperation } from '../../../types/graph.ts';
import type { StableRecordIdentifier } from '../../../types/identifier.ts';
import type { CacheOptions } from '../../../types/request.ts';
import { EnableHydration } from '../../../types/request.ts';
import type { CollectionResourceRelationship } from '../../../types/spec/json-api-raw.ts';
import { RecordStore } from '../../../types/symbols.ts';
import type { SchemaRecord } from '../record.ts';
import { Identifier } from '../symbols.ts';

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
