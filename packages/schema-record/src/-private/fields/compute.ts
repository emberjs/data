import type { Future } from '@ember-data/request';
import type Store from '@ember-data/store';
import type { StoreRequestInput } from '@ember-data/store';
import { defineSignal, RelatedCollection as ManyArray } from '@ember-data/store/-private';
import { getSignal, peekSignal } from '@ember-data/tracking/-private';
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
  LegacyHasManyField,
  LocalField,
  ObjectField,
  SchemaArrayField,
  SchemaObjectField,
} from '@warp-drive/core-types/schema/fields';
import type { CollectionResourceRelationship, Link, Links } from '@warp-drive/core-types/spec/json-api-raw';
import { RecordStore } from '@warp-drive/core-types/symbols';

import { SchemaRecord } from '../record';
import type { SchemaService } from '../schema';
import { Editable, Identifier, Legacy, Parent } from '../symbols';
import { ManagedArray } from './managed-array';
import { ManagedObject } from './managed-object';
import { ManyArrayManager } from './many-array-manager';

export const ManagedArrayMap = getOrSetGlobal(
  'ManagedArrayMap',
  new Map<SchemaRecord, Map<string, ManagedArray | ManyArray>>()
);
export const ManagedObjectMap = getOrSetGlobal(
  'ManagedObjectMap',
  new Map<SchemaRecord, Map<string, ManagedObject | SchemaRecord>>()
);

export function computeLocal(record: typeof Proxy<SchemaRecord>, field: LocalField, prop: string): unknown {
  let signal = peekSignal(record, prop);

  if (!signal) {
    signal = getSignal(record, prop, false);
    signal.lastValue = field.options?.defaultValue ?? null;
  }

  return signal.lastValue;
}

export function peekManagedArray(record: SchemaRecord, field: FieldSchema): ManyArray | ManagedArray | undefined {
  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  if (managedArrayMapForRecord) {
    return managedArrayMapForRecord.get(field.name);
  }
}

export function peekManagedObject(record: SchemaRecord, field: ObjectField): ManagedObject | undefined;
export function peekManagedObject(record: SchemaRecord, field: SchemaObjectField): SchemaRecord | undefined;
export function peekManagedObject(
  record: SchemaRecord,
  field: ObjectField | SchemaObjectField
): ManagedObject | SchemaRecord | undefined {
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  if (managedObjectMapForRecord) {
    return managedObjectMapForRecord.get(field.name);
  }
}

export function computeField(
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: GenericField,
  prop: string | string[],
  editable: boolean
): unknown {
  const rawValue = editable ? cache.getAttr(identifier, prop) : cache.getRemoteAttr(identifier, prop);
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
  editable: boolean,
  legacy: boolean
) {
  const isSchemaArray = field.kind === 'schema-array';
  // the thing we hand out needs to know its owner and path in a private manner
  // its "address" is the parent identifier (identifier) + field name (field.name)
  //  in the nested object case field name here is the full dot path from root resource to this value
  // its "key" is the field on the parent record
  // its "owner" is the parent record

  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  let managedArray: ManagedArray | undefined;
  if (managedArrayMapForRecord) {
    managedArray = managedArrayMapForRecord.get(field.name) as ManagedArray | undefined;
  }
  if (managedArray) {
    return managedArray;
  } else {
    const rawValue = (editable ? cache.getAttr(identifier, path) : cache.getRemoteAttr(identifier, path)) as unknown[];
    if (!rawValue) {
      return null;
    }
    managedArray = new ManagedArray(
      store,
      schema,
      cache,
      field,
      rawValue,
      identifier,
      path,
      record,
      isSchemaArray,
      editable,
      legacy
    );
    if (!managedArrayMapForRecord) {
      ManagedArrayMap.set(record, new Map([[field.name, managedArray]]));
    } else {
      managedArrayMapForRecord.set(field.name, managedArray);
    }
  }
  return managedArray;
}

export function computeObject(
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: ObjectField,
  path: string[],
  editable: boolean,
  legacy: boolean
) {
  const managedObjectMapForRecord = ManagedObjectMap.get(record);
  let managedObject;
  if (managedObjectMapForRecord) {
    managedObject = managedObjectMapForRecord.get(field.name);
  }
  if (managedObject) {
    return managedObject;
  } else {
    let rawValue = (editable ? cache.getAttr(identifier, path) : cache.getRemoteAttr(identifier, path)) as object;
    if (!rawValue) {
      return null;
    }
    if (field.type) {
      const transform = schema.transformation(field);
      rawValue = transform.hydrate(rawValue as ObjectValue, field.options ?? null, record) as object;
    }
    managedObject = new ManagedObject(schema, cache, field, rawValue, identifier, path, record, editable, legacy);

    if (!managedObjectMapForRecord) {
      ManagedObjectMap.set(record, new Map([[field.name, managedObject]]));
    } else {
      managedObjectMapForRecord.set(field.name, managedObject);
    }
  }
  return managedObject;
}

export function computeSchemaObject(
  store: Store,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: SchemaObjectField,
  path: string[],
  legacy: boolean,
  editable: boolean
) {
  const schemaObjectMapForRecord = ManagedObjectMap.get(record);
  let schemaObject;
  if (schemaObjectMapForRecord) {
    schemaObject = schemaObjectMapForRecord.get(field.name);
  }
  if (schemaObject) {
    return schemaObject;
  } else {
    const rawValue = (editable ? cache.getAttr(identifier, path) : cache.getRemoteAttr(identifier, path)) as object;
    if (!rawValue) {
      return null;
    }
    const embeddedPath = path.slice();
    schemaObject = new SchemaRecord(
      store,
      identifier,
      {
        [Editable]: editable,
        [Legacy]: legacy,
      },
      true,
      field.type,
      embeddedPath
    );
  }
  if (!schemaObjectMapForRecord) {
    ManagedObjectMap.set(record, new Map([[field.name, schemaObject]]));
  } else {
    schemaObjectMapForRecord.set(field.name, schemaObject);
  }
  return schemaObject;
}

export function computeAttribute(
  cache: Cache,
  identifier: StableRecordIdentifier,
  prop: string,
  editable: boolean
): unknown {
  return editable ? cache.getAttr(identifier, prop) : cache.getRemoteAttr(identifier, prop);
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
    name: string,
    editable: boolean
  ) {
    const rawValue = (
      editable ? cache.getRelationship(identifier, name) : cache.getRemoteRelationship(identifier, name)
    ) as SingleResourceRelationship;

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

defineSignal(ResourceRelationship.prototype, 'data', null);
defineSignal(ResourceRelationship.prototype, 'links', null);
defineSignal(ResourceRelationship.prototype, 'meta', null);

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
  prop: string,
  editable: boolean
): ResourceRelationship<T> {
  if (field.kind !== 'resource') {
    throw new Error(`The schema for ${identifier.type}.${String(prop)} is not a resource relationship`);
  }

  return new ResourceRelationship<T>(store, cache, parent, identifier, field, prop, editable);
}

export function computeHasMany(
  store: Store,
  schema: SchemaService,
  cache: Cache,
  record: SchemaRecord,
  identifier: StableRecordIdentifier,
  field: LegacyHasManyField,
  path: string[],
  editable: boolean,
  legacy: boolean
) {
  // the thing we hand out needs to know its owner and path in a private manner
  // its "address" is the parent identifier (identifier) + field name (field.name)
  //  in the nested object case field name here is the full dot path from root resource to this value
  // its "key" is the field on the parent record
  // its "owner" is the parent record

  const managedArrayMapForRecord = ManagedArrayMap.get(record);
  let managedArray: ManyArray | undefined;
  if (managedArrayMapForRecord) {
    managedArray = managedArrayMapForRecord.get(field.name) as ManyArray | undefined;
  }
  if (managedArray) {
    return managedArray;
  } else {
    const rawValue = cache.getRelationship(identifier, field.name) as CollectionResourceRelationship;
    if (!rawValue) {
      return null;
    }
    managedArray = new ManyArray<unknown>({
      store,
      type: field.type,
      identifier,
      cache,
      // we divorce the reference here because ManyArray mutates the target directly
      // before sending the mutation op to the cache. We may be able to avoid this in the future
      identifiers: rawValue.data?.slice() as StableRecordIdentifier[],
      key: field.name,
      meta: rawValue.meta || null,
      links: rawValue.links || null,
      isPolymorphic: field.options.polymorphic ?? false,
      isAsync: field.options.async ?? false,
      // TODO: Grab the proper value
      _inverseIsAsync: false,
      // @ts-expect-error Typescript doesn't have a way for us to thread the generic backwards so it infers unknown instead of T
      manager: new ManyArrayManager(record, editable),
      isLoaded: true,
      allowMutation: editable,
    });
    if (!managedArrayMapForRecord) {
      ManagedArrayMap.set(record, new Map([[field.name, managedArray]]));
    } else {
      managedArrayMapForRecord.set(field.name, managedArray);
    }
  }
  return managedArray;
}
