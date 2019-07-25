import { DEBUG } from '@glimmer/env';
import { assert } from '@ember/debug';
import { Dict } from '../ts-interfaces/utils';
import { ResourceIdentifierObject } from '../ts-interfaces/ember-data-json-api';
import {
  StableRecordIdentifier,
  IS_IDENTIFIER,
  DEBUG_CLIENT_ORIGINATED,
  DEBUG_IDENTIFIER_BUCKET,
  GenerationMethod,
  UpdateMethod,
  ForgetMethod,
  ResetMethod,
} from '../ts-interfaces/identifier';
import coerceId from '../system/coerce-id';
import uuidv4 from './utils/uuid-v4';
import normalizeModelName from '../system/normalize-model-name';
import isStableIdentifier from './is-stable-identifier';
import isNonEmptyString from '../utils/is-non-empty-string';
import Store from '../system/store';

/**
  @module @ember-data/store
*/

interface KeyOptions {
  lid: IdentifierMap;
  id: IdentifierMap;
  _allIdentifiers: StableRecordIdentifier[];
}

type IdentifierMap = Dict<string, StableRecordIdentifier>;
type TypeMap = Dict<string, KeyOptions>;

let configuredForgetMethod: ForgetMethod;
let configuredGenerationMethod: GenerationMethod;
let configuredResetMethod: ResetMethod;
let configuredUpdateMethod: UpdateMethod;

export function setIdentifierGenerationMethod(method: GenerationMethod): void {
  configuredGenerationMethod = method;
}

export function setIdentifierUpdateMethod(method: UpdateMethod): void {
  configuredUpdateMethod = method;
}

export function setIdentifierForgetMethod(method: ForgetMethod): void {
  configuredForgetMethod = method;
}

export function setIdentifierResetMethod(method: ResetMethod): void {
  configuredResetMethod = method;
}

function defaultGenerationMethod(data: ResourceIdentifierObject, bucket: string): string {
  if (isNonEmptyString(data.lid)) {
    return data.lid;
  }
  let { type, id } = data;
  if (isNonEmptyString(id)) {
    return `@ember-data:lid-${normalizeModelName(type)}-${id}`;
  }
  return uuidv4();
}

const IdentifierCaches = new WeakMap<Store, IdentifierCache>();

export function identifierCacheFor(store: Store): IdentifierCache {
  let cache = IdentifierCaches.get(store);

  if (cache === undefined) {
    cache = new IdentifierCache();
    IdentifierCaches.set(store, cache);
  }

  return cache;
}

function defaultEmptyCallback(...args: any[]): any {}

let DEBUG_MAP;
if (DEBUG) {
  DEBUG_MAP = new WeakMap<StableRecordIdentifier, StableRecordIdentifier>();
}

export class IdentifierCache {
  // Typescript still leaks private properties in the final
  // compiled class, so we may want to move these from _underscore
  // to a WeakMap to avoid leaking
  private _cache = {
    lids: Object.create(null) as IdentifierMap,
    types: Object.create(null) as TypeMap,
  };
  private _generate: GenerationMethod;
  private _update: UpdateMethod;
  private _forget: ForgetMethod;
  private _reset: ResetMethod;

  constructor() {
    // we cache the user configuredGenerationMethod at init because it must
    // be configured prior and is not allowed to be changed
    this._generate = configuredGenerationMethod || defaultGenerationMethod;
    this._update = configuredUpdateMethod || defaultEmptyCallback;
    this._forget = configuredForgetMethod || defaultEmptyCallback;
    this._reset = configuredResetMethod || defaultEmptyCallback;
  }

  /**
   * @internal
   */
  private _getRecordIdentifier(resource: ResourceIdentifierObject, shouldGenerate: true): StableRecordIdentifier;
  private _getRecordIdentifier(
    resource: ResourceIdentifierObject,
    shouldGenerate: false
  ): StableRecordIdentifier | undefined;
  private _getRecordIdentifier(
    resource: ResourceIdentifierObject,
    shouldGenerate: boolean = false
  ): StableRecordIdentifier | undefined {
    // short circuit if we're already the stable version
    if (isStableIdentifier(resource)) {
      if (DEBUG) {
        // TODO should we instead just treat this case as a new generation skipping the short circuit?
        if (!(resource.lid in this._cache.lids) || this._cache.lids[resource.lid] !== resource) {
          throw new Error(`The supplied identifier ${resource} does not belong to this store instance`);
        }
      }
      return resource;
    }

    // `type` must always be present
    if (DEBUG) {
      if (!isNonEmptyString(resource.type)) {
        throw new Error('resource.type needs to be a string');
      }
    }

    let type = normalizeModelName(resource.type);
    let keyOptions = getTypeIndex(this._cache.types, type);
    let identifier: StableRecordIdentifier | undefined;
    let lid = coerceId(resource.lid);
    let id = coerceId(resource.id);

    // go straight for the stable RecordIdentifier key'd to `lid`
    if (lid !== null) {
      identifier = keyOptions.lid[lid];
    }

    // we may have not seen this resource before
    // but just in case we check our own secondary lookup (`id`)
    if (identifier === undefined && id !== null) {
      identifier = keyOptions.id[id];
    }

    if (identifier === undefined) {
      // we have definitely not seen this resource before
      // so we allow the user configured `GenerationMethod` to tell us
      let newLid = this._generate(resource, 'record');

      // we do this _even_ when `lid` is present because secondary lookups
      // may need to be populated, but we enforce not giving us something
      // different than expected
      if (lid !== null && newLid !== lid) {
        throw new Error(`You should not change the <lid> of a RecordIdentifier`);
      } else if (lid === null) {
        // allow configuration to tell us that we have
        // seen this `lid` before. E.g. a secondary lookup
        // connects this resource to a previously seen
        // resource.
        identifier = keyOptions.lid[newLid];
      }

      if (shouldGenerate === true) {
        if (identifier === undefined) {
          // if we still don't have an identifier, time to generate one
          identifier = makeStableRecordIdentifier(id, type, newLid, 'record', false);

          // populate our unique table
          if (DEBUG) {
            // realistically if you hit this it means you changed `type` :/
            // TODO consider how to handle type change assertions more gracefully
            if (identifier.lid in this._cache.lids) {
              throw new Error(`You should not change the <type> of a RecordIdentifier`);
            }
          }
          this._cache.lids[identifier.lid] = identifier;

          // populate our primary lookup table
          // TODO consider having the `lid` cache be
          // one level up
          keyOptions.lid[identifier.lid] = identifier;
          // TODO exists temporarily to support `peekAll`
          // but likely to move
          keyOptions._allIdentifiers.push(identifier);
        }

        // populate our own secondary lookup table
        // even for the "successful" secondary lookup
        // by `_generate()`, since we missed the cache
        // previously
        if (id !== null) {
          keyOptions.id[id] = identifier;

          // TODO allow filling out of `id` here
          // for the `username` non-client created
          // case.
        }
      }
    }

    return identifier;
  }

  /**
   * allows us to peek without generating when needed
   * useful for the "create" case when we need to see if
   * we are accidentally overwritting something
   *
   * @internal
   */
  peekRecordIdentifier(resource: ResourceIdentifierObject): StableRecordIdentifier | undefined {
    return this._getRecordIdentifier(resource, false);
  }

  /*
    Returns the Identifier for the given Resource, creates one if it does not yet exist.

    Specifically this means that we:

    - validate the `id` `type` and `lid` combo against known identifiers
    - return an object with an `lid` that is stable (repeated calls with the same
      `id` + `type` or `lid` will return the same `lid` value)
    - this referential stability of the object itself is guaranteed
  */
  getOrCreateRecordIdentifier(resource: ResourceIdentifierObject): StableRecordIdentifier {
    return this._getRecordIdentifier(resource, true);
  }

  /*
   Returns a new Identifier for the supplied data. Call this method to generate
   an identifier when a new resource is being created local to the client and
   potentially does not have an `id`.

   Delegates generation to the user supplied `GenerateMethod` if one has been provided
   with the signature `generateMethod({ type }, 'record')`.

  */
  createIdentifierForNewRecord(data: { type: string; id?: string | null }): StableRecordIdentifier {
    let newLid = this._generate(data, 'record');
    let identifier = makeStableRecordIdentifier(data.id || null, data.type, newLid, 'record', true);
    let keyOptions = getTypeIndex(this._cache.types, data.type);

    // populate our unique table
    if (DEBUG) {
      if (identifier.lid in this._cache.lids) {
        throw new Error(`The lid generated for the new record is not unique as it matches an existing identifier`);
      }
    }
    this._cache.lids[identifier.lid] = identifier;

    // populate the type+lid cache
    keyOptions.lid[newLid] = identifier;
    // ensure a peekAll sees our new identifier too
    // TODO move this outta here?
    keyOptions._allIdentifiers.push(identifier);

    return identifier;
  }

  /*
   Provides the opportunity to update secondary lookup tables for existing identifiers
   Called after an identifier created with `createIdentifierForNewRecord` has been
   committed.

   Assigned `id` to an `Identifier` if `id` has not previously existed; however,
   attempting to change the `id` or calling update without providing an `id` when
   one is missing will throw an error.

    - sets `id` (if `id` was previously `null`)
    - `lid` and `type` MUST NOT be altered post creation
  */
  updateRecordIdentifier(identifier: StableRecordIdentifier, data: ResourceIdentifierObject): void {
    if (DEBUG) {
      assert(
        `The supplied identifier '${identifier}' does not belong to this store instance.`,
        this._cache.lids[identifier.lid] === identifier
      );

      let id = identifier.id;
      let newId = coerceId(data.id);

      if (id !== null && id !== newId && newId !== null) {
        let keyOptions = getTypeIndex(this._cache.types, identifier.type);
        let existingIdentifier = keyOptions.id[newId];

        if (existingIdentifier !== undefined) {
          throw new Error(
            `Failed to update the 'id' for the RecordIdentifier '${identifier}' to '${newId}', because that id is already in use by '${existingIdentifier}'`
          );
        }
      }
    }

    let id = identifier.id;
    performRecordIdentifierUpdate(identifier, data, this._update);
    let newId = identifier.id;

    // add to our own secondary lookup table
    if (id !== newId && newId !== null) {
      let keyOptions = getTypeIndex(this._cache.types, identifier.type);
      keyOptions.id[newId] = identifier;
    }
  }

  /*
   Provides the opportunity to eliminate an identifier from secondary lookup tables
   as well as eliminates it from ember-data's own lookup tables and book keeping.

   Useful when a record has been deleted and the deletion has been persisted and
   we do not care about the record anymore. Especially useful when an `id` of a
   deleted record might be reused later for a new record.
  */
  forgetRecordIdentifier(identifier: StableRecordIdentifier): void {
    let keyOptions = getTypeIndex(this._cache.types, identifier.type);
    if (identifier.id !== null) {
      delete keyOptions.id[identifier.id];
    }
    delete this._cache.lids[identifier.lid];
    delete keyOptions.lid[identifier.lid];

    let index = keyOptions._allIdentifiers.indexOf(identifier);
    keyOptions._allIdentifiers.splice(index, 1);

    this._forget(identifier, 'record');
  }
}

function getTypeIndex(typeMap: TypeMap, type: string): KeyOptions {
  let typeIndex: KeyOptions = typeMap[type];

  if (typeIndex === undefined) {
    typeIndex = {
      lid: Object.create(null),
      id: Object.create(null),
      _allIdentifiers: [],
    };
    typeMap[type] = typeIndex;
  }

  return typeIndex;
}

function makeStableRecordIdentifier(
  id: string | null,
  type: string,
  lid: string,
  bucket: string,
  clientOriginated: boolean = false
): Readonly<StableRecordIdentifier> {
  let recordIdentifier = {
    [IS_IDENTIFIER]: true as const,
    lid,
    id,
    type,
  };

  if (DEBUG) {
    // we enforce immutability in dev
    //  but preserve our ability to do controlled updates to the reference
    let wrapper = Object.freeze({
      [IS_IDENTIFIER]: true as const,
      [DEBUG_CLIENT_ORIGINATED]: clientOriginated,
      [DEBUG_IDENTIFIER_BUCKET]: bucket,
      get lid() {
        return recordIdentifier.lid;
      },
      get id() {
        return recordIdentifier.id;
      },
      get type() {
        return recordIdentifier.type;
      },
      toString() {
        let { type, id, lid } = recordIdentifier;
        return `${clientOriginated ? '[CLIENT_ORIGINATED] ' : ''}${type}:${id} (${lid})`;
      },
    });
    DEBUG_MAP.set(wrapper, recordIdentifier);
    return wrapper;
  }

  return recordIdentifier;
}

function performRecordIdentifierUpdate(
  identifier: StableRecordIdentifier,
  data: ResourceIdentifierObject,
  updateFn: UpdateMethod
) {
  let { id, lid } = data;
  let type = normalizeModelName(data.type);

  if (DEBUG) {
    // get the mutable instance behind our proxy wrapper
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

    // TODO consider just ignoring here to allow flexible polymorphic support
    if (type !== identifier.type) {
      throw new Error(
        `The 'type' for a RecordIdentifier cannot be updated once it has been set. Attempted to set type for '${wrapper}' to '${type}'.`
      );
    }

    updateFn(wrapper, data, 'record');
  } else {
    updateFn(identifier, data, 'record');
  }

  // upgrade the ID, this is a "one time only" ability
  // TODO do we need a strong check here?
  if (id !== undefined) {
    identifier.id = coerceId(id);
  }
}
