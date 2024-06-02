import { dependencySatisfies, importSync } from '@embroider/macros';

import type { Future } from '@ember-data/request';
import type Store from '@ember-data/store';
import type { StoreRequestInput } from '@ember-data/store';
import { defineSignal, getSignal, peekSignal } from '@ember-data/tracking/-private';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { Cache } from '@warp-drive/core-types/cache';
import type { ResourceRelationship as SingleResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import type {
  ArrayField,
  DerivedField,
  FieldSchema,
  GenericField,
  LocalField,
  ObjectField,
  SchemaArrayField,
} from '@warp-drive/core-types/schema/fields';
import type { Link, Links } from '@warp-drive/core-types/spec/json-api-raw';
import { RecordStore } from '@warp-drive/core-types/symbols';

import { ManagedArray } from './managed-array';
import { ManagedObject } from './managed-object';
import type { SchemaService } from '../schema';
import { Identifier, Parent } from '../symbols';
import { SchemaRecord } from '../record';

export const ManagedArrayMap = getOrSetGlobal(
  'ManagedArrayMap',
  new Map<SchemaRecord, Map<FieldSchema, ManagedArray>>()
);
export const ManagedObjectMap = getOrSetGlobal(
  'ManagedObjectMap',
  new Map<SchemaRecord, Map<FieldSchema, ManagedObject>>()
);

export function computeLocal(record: typeof Proxy<SchemaRecord>, field: LocalField, prop: string): unknown {
  let signal = peekSignal(record, prop);

  if (!signal) {
    signal = getSignal(record, prop, false);
    signal.lastValue = field.options?.defaultValue ?? null;
  }

  return signal.lastValue;
}

export function peekManagedArray(record: SchemaRecord, field: FieldSchema): ManagedArray | undefined {
  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  if (managedArrayMapForRecord) {
    return managedArrayMapForRecord.get(field);
  }
}

export function peekManagedObject(record: SchemaRecord, field: FieldSchema): ManagedObject | undefined {
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  if (managedObjectMapForRecord) {
    return managedObjectMapForRecord.get(field);
  }
}

export function computeField(
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: GenericField,
  prop: string | string[]
): unknown {
  const rawValue = cache.getAttr(identifier, prop);
  if (!field.type) {
    return rawValue;
  }
  const transform = schema.transformation(field);
  return transform.hydrate(rawValue, field.options ?? null, record);
}

export function computeArray(
  store: Store,
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: ArrayField | SchemaArrayField,
  path: string[],
  isSchemaArray = false
) {
  // the thing we hand out needs to know its owner and path in a private manner
  // its "address" is the parent identifier (identifier) + field name (field.name)
  //  in the nested object case field name here is the full dot path from root resource to this value
  // its "key" is the field on the parent record
  // its "owner" is the parent record

  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  let managedArray;
  if (managedArrayMapForRecord) {
    managedArray = managedArrayMapForRecord.get(field);
  }
  if (managedArray) {
    return managedArray;
  } else {
    const rawValue = cache.getAttr(identifier, path) as unknown[];
    if (!rawValue) {
      return null;
    }
    managedArray = new ManagedArray(store, schema, cache, field, rawValue, identifier, path, record, isSchemaArray);
    if (!managedArrayMapForRecord) {
      ManagedArrayMap.set(record, new Map([[field, managedArray]]));
    } else {
      managedArrayMapForRecord.set(field, managedArray);
    }
  }
  return managedArray;
}

export function computeObject(
  store: Store,
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: ObjectField,
  prop: string
) {
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  let managedObject;
  if (managedObjectMapForRecord) {
    managedObject = managedObjectMapForRecord.get(field);
  }
  if (managedObject) {
    return managedObject;
  } else {
    let rawValue = cache.getAttr(identifier, prop) as object;
    if (!rawValue) {
      return null;
    }
    if (field.kind === 'object') {
      if (field.type) {
        const transform = schema.transformation(field);
        rawValue = transform.hydrate(rawValue as ObjectValue, field.options ?? null, record) as object;
      }
    }
    managedObject = new ManagedObject(store, schema, cache, field, rawValue, identifier, prop, record);
    if (!managedObjectMapForRecord) {
      ManagedObjectMap.set(record, new Map([[field, managedObject]]));
    } else {
      managedObjectMapForRecord.set(field, managedObject);
    }
  }
  return managedObject;
}

export function computeAttribute(cache: Cache, identifier: StableRecordIdentifier, prop: string): unknown {
  return cache.getAttr(identifier, prop);
}

export function computeDerivation(
  schema: SchemaService,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: DerivedField,
  prop: string
): unknown {
  return schema.derivation(field)(record, field.options ?? null, prop);
}

// TODO probably this should just be a Document
// but its separate until we work out the lid situation
class ResourceRelationship<T extends SchemaRecord = SchemaRecord> {
  declare lid: string;
  declare [Parent]: SchemaRecord;
  declare [RecordStore]: Store;
  declare name: string;

  declare data: T | null;
  declare links: Links;
  declare meta: Record<string, unknown>;

  constructor(
    store: Store,
    cache: Cache,
    parent: SchemaRecord,
    identifier: StableRecordIdentifier,
    field: FieldSchema,
    name: string
  ) {
    const rawValue = cache.getRelationship(identifier, name) as SingleResourceRelationship;

    // TODO setup true lids for relationship documents
    // @ts-expect-error we need to give relationship documents a lid
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.lid = rawValue.lid ?? rawValue.links?.self ?? `relationship:${identifier.lid}.${name}`;
    this.data = rawValue.data ? store.peekRecord<T>(rawValue.data) : null;
    this.name = name;

    if (DEBUG) {
      this.links = Object.freeze(Object.assign({}, rawValue.links));
      this.meta = Object.freeze(Object.assign({}, rawValue.meta));
    } else {
      this.links = rawValue.links ?? {};
      this.meta = rawValue.meta ?? {};
    }

    this[RecordStore] = store;
    this[Parent] = parent;
  }

  fetch(options?: StoreRequestInput<T, T>): Future<T> {
    const url = options?.url ?? getHref(this.links.related) ?? getHref(this.links.self) ?? null;

    if (!url) {
      throw new Error(
        `Cannot ${options?.method ?? 'fetch'} ${this[Parent][Identifier].type}.${String(
          this.name
        )} because it has no related link`
      );
    }
    const request = Object.assign(
      {
        url,
        method: 'GET',
      },
      options
    );

    return this[RecordStore].request<T>(request);
  }
}

defineSignal(ResourceRelationship.prototype, 'data');
defineSignal(ResourceRelationship.prototype, 'links');
defineSignal(ResourceRelationship.prototype, 'meta');

function getHref(link?: Link | null): string | null {
  if (!link) {
    return null;
  }
  if (typeof link === 'string') {
    return link;
  }
  return link.href;
}

export function computeResource<T extends SchemaRecord>(
  store: Store,
  cache: Cache,
  parent: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: FieldSchema,
  prop: string
): ResourceRelationship<T> {
  if (field.kind !== 'resource') {
    throw new Error(`The schema for ${identifier.type}.${String(prop)} is not a resource relationship`);
  }

  return new ResourceRelationship<T>(store, cache, parent, identifier, field, prop);
}
