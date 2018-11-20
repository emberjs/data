import Store from '../store';
import coerceId from '../coerce-id';
import { DEBUG } from '@glimmer/env';
import { Dict, LegacyRecordIdentifier, LegacyResourceIdentifier } from '../../types';
import { assert } from '@ember/debug';

type TStore = InstanceType<typeof Store>;
type ModelName = string;
type ClientId = string;
type Id = string;

interface KeyOptions {
  lid: Dict<ClientId, LegacyRecordIdentifier>;
  id: Dict<Id, LegacyRecordIdentifier>;
  _allIdentifiers: LegacyRecordIdentifier[];
}

type TypeMap = Dict<ModelName, KeyOptions>;

let CLIENT_ID = 0;
let DEBUG_MAP;

if (DEBUG) {
  DEBUG_MAP = new WeakMap<LegacyRecordIdentifier, LegacyRecordIdentifier>();
}

function generateLid(): string {
  return `@ember-data:lid-${CLIENT_ID++}`;
}

const STORE_MAP = new WeakMap<TStore, TypeMap>();

function makeRecordIdentifier(
  resourceIdentifier: LegacyResourceIdentifier
): LegacyRecordIdentifier {
  let lid = coerceId(resourceIdentifier.lid);

  // fallback to clientId just in case
  // TODO deprecate this fallback
  lid = lid === null ? coerceId(resourceIdentifier.clientId) : lid;
  lid = lid === null ? generateLid() : lid;

  let recordIdentifier: LegacyRecordIdentifier = {
    lid,
    id: coerceId(resourceIdentifier.id),
    clientId: lid,
    type: resourceIdentifier.type,
    meta: resourceIdentifier.meta || null,
  };

  if (DEBUG) {
    // we enforce immutability in dev
    //  but preserve our ability to do controlled updates to the reference
    let wrapper: LegacyRecordIdentifier = {
      get lid() {
        return recordIdentifier.lid;
      },
      // TODO deprecate this prop
      get clientId() {
        return recordIdentifier.lid;
      },
      get id() {
        return recordIdentifier.id;
      },
      get type() {
        return recordIdentifier.type;
      },
      get meta() {
        return recordIdentifier.meta;
      },
      toString() {
        let { type, id, lid } = recordIdentifier;
        return `${type}:${id} (${lid})`;
      },
    };
    Object.freeze(wrapper);
    DEBUG_MAP.set(wrapper, recordIdentifier);
    return wrapper;
  }

  return recordIdentifier;
}

function performRecordIdentifierUpdate(
  identifier: LegacyRecordIdentifier,
  { meta, type, id, lid }: LegacyResourceIdentifier
) {
  if (DEBUG) {
    let wrapper = identifier;
    identifier = DEBUG_MAP.get(wrapper);

    if (lid !== undefined) {
      let newLid = coerceId(lid);
      if (newLid !== identifier.lid) {
        throw new Error(
          `The 'lid' for a RecordIdentifier cannot be updated once it has been created. Attempted to set lid for '${wrapper}' to '${lid}'.`
        );
      }
    }

    if (id !== undefined) {
      let newId = coerceId(id);

      if (identifier.id !== null && identifier.id !== newId) {
        throw new Error(
          `The 'id' for a RecordIdentifier cannot be updated once it has been set. Attempted to set id for '${wrapper}' to '${newId}'.`
        );
      }
    }

    // TODO consider how to support both single and multi table polymorphism
    if (type !== identifier.type) {
      throw new Error(
        `The 'type' for a RecordIdentifier cannot be updated once it has been set. Attempted to set type for '${wrapper}' to '${type}'.`
      );
    }
  }

  if (id !== undefined) {
    identifier.id = coerceId(id);
  }

  if (meta) {
    Object.assign(identifier.meta, meta);
  } else if (meta === null) {
    identifier.meta = null;
  }
}

/**
 * EmberData supports multiple store instances. Each store
 *   has it's own unique RecordIdentifiers.
 *
 * This method Updates a RecordIdentifier for a given store
 *   with new information.
 *
 * - `id` (if `id` was previously `null`)
 * - `meta`
 * - `lid` and `type` MUST NOT be altered post creation
 *
 * @method updateRecordIdentifier
 * @param {Store} store - the Store instance to which this identifier belongs
 * @param {IRecordIdentifier} identifier - the identifier to update
 * @param {IResourceIdentifier} resourceIdentifier - new information for this identifier
 */
export function updateRecordIdentifier(
  store: TStore,
  identifier: LegacyRecordIdentifier,
  resourceIdentifier: LegacyResourceIdentifier
): void {
  if (DEBUG) {
    assert(
      `The passed identifier for '${identifier}' does not belong to the given store instance.`,
      identifier === recordIdentifierFor(store, identifier)
    );

    let id = identifier.id;
    let newId = coerceId(resourceIdentifier.id);

    if (id !== null && id !== newId && newId !== null) {
      let keyOptions = getLookupBucket(store, identifier.type);
      let existingIdentifier = keyOptions.id[newId];
      if (existingIdentifier !== undefined) {
        throw new Error(
          `Attempted to update the 'id' for the RecordIdentifier '${identifier}' to '${newId}', but that id is already in use by '${existingIdentifier}'`
        );
      }
    }
  }

  let id = identifier.id;
  performRecordIdentifierUpdate(identifier, resourceIdentifier);
  let newId = identifier.id;

  if (id !== newId && newId !== null) {
    let keyOptions = getLookupBucket(store, identifier.type);
    keyOptions.id[newId] = identifier;
  }
}

function getLookupBucket(store: TStore, type) {
  let typeMap: TypeMap | undefined = STORE_MAP.get(store);

  if (typeMap === undefined) {
    typeMap = Object.create(null) as TypeMap;
    STORE_MAP.set(store, typeMap);
  }

  let keyOptions: KeyOptions = typeMap[type];
  if (keyOptions === undefined) {
    keyOptions = {
      lid: Object.create(null),
      id: Object.create(null),
      _allIdentifiers: [],
    } as KeyOptions;
    typeMap[type] = keyOptions;
  }

  return keyOptions;
}

export function recordIdentifiersFor(store: TStore, type) {
  return getLookupBucket(store, type)._allIdentifiers;
}

function isNonEmptyString(str?: string | null): str is string {
  return typeof str === 'string' && str.length > 0;
}

export function createRecordIdentifier(
  store: TStore,
  resourceIdentifier: LegacyResourceIdentifier
): LegacyRecordIdentifier {
  let keyOptions = getLookupBucket(store, resourceIdentifier.type);
  let identifier = makeRecordIdentifier(resourceIdentifier);

  if (identifier.id !== null) {
    if (DEBUG) {
      let eid = keyOptions.id[identifier.id];
      if (eid !== undefined) {
        throw new Error(
          `Attempted to create a new RecordIdentifier '${identifier}' but that id is already in use by '${eid}'`
        );
      }
    }

    keyOptions.id[identifier.id] = identifier;
  }

  keyOptions.lid[identifier.lid] = identifier;
  keyOptions._allIdentifiers.push(identifier);

  return identifier;
}

export function forgetRecordIdentifier(store: TStore, identifier: LegacyRecordIdentifier) {
  let keyOptions = getLookupBucket(store, identifier.type);
  if (identifier.id !== null) {
    delete keyOptions.id[identifier.id];
  }
  delete keyOptions.lid[identifier.lid];

  let index = keyOptions._allIdentifiers.indexOf(identifier);
  keyOptions._allIdentifiers.splice(index, 1);
}

export function recordIdentifierFor(
  store: TStore,
  resourceIdentifier: LegacyResourceIdentifier
): LegacyRecordIdentifier | null {
  let clientId = coerceId(resourceIdentifier.clientId);
  let keyOptions = getLookupBucket(store, resourceIdentifier.type);
  let identifier: LegacyRecordIdentifier | null = null;
  let lid = coerceId(resourceIdentifier.lid);

  if (lid === null && clientId !== null) {
    lid = clientId;
    resourceIdentifier.lid = clientId;
  }

  let id = coerceId(resourceIdentifier.id);
  let hasLid = isNonEmptyString(lid);
  let hasId = isNonEmptyString(id);

  if (DEBUG) {
    if (!hasId && !hasLid) {
      throw new Error('Resource Identifiers must have either an `id` or an `lid` on them');
    }
  }

  if (hasLid) {
    identifier = keyOptions.lid[lid as string] || null;
  }

  if (identifier === null && hasId) {
    identifier = keyOptions.id[id as string] || null;
  }

  if (identifier === null && (hasId || hasLid)) {
    identifier = makeRecordIdentifier(resourceIdentifier);
    keyOptions.lid[identifier.lid] = identifier;
    keyOptions._allIdentifiers.push(identifier);

    if (hasId) {
      keyOptions.id[id as string] = identifier;
    }
  }

  return identifier || null;
}
