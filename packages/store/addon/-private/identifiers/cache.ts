import { warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import coerceId from '../system/coerce-id';
import normalizeModelName from '../system/normalize-model-name';
import { DEBUG_CLIENT_ORIGINATED, DEBUG_IDENTIFIER_BUCKET } from '../ts-interfaces/identifier';
import { addSymbol } from '../ts-interfaces/utils/symbol';
import isNonEmptyString from '../utils/is-non-empty-string';
import isStableIdentifier, { markStableIdentifier, unmarkStableIdentifier } from './is-stable-identifier';
import uuidv4 from './utils/uuid-v4';

type Identifier = import('../ts-interfaces/identifier').Identifier;

type CoreStore = import('../system/core-store').default;
type StableRecordIdentifier = import('../ts-interfaces/identifier').StableRecordIdentifier;
type GenerationMethod = import('../ts-interfaces/identifier').GenerationMethod;
type UpdateMethod = import('../ts-interfaces/identifier').UpdateMethod;
type ForgetMethod = import('../ts-interfaces/identifier').ForgetMethod;
type ResetMethod = import('../ts-interfaces/identifier').ResetMethod;
type RecordIdentifier = import('../ts-interfaces/identifier').RecordIdentifier;
type ResourceIdentifierObject = import('../ts-interfaces/ember-data-json-api').ResourceIdentifierObject;
type ExistingResourceObject = import('../ts-interfaces/ember-data-json-api').ExistingResourceObject;
type ConfidentDict<T> = import('../ts-interfaces/utils').ConfidentDict<T>;

function freeze<T>(obj: T): T {
  if (typeof Object.freeze === 'function') {
    return Object.freeze(obj);
  }
  return obj;
}

/**
  @module @ember-data/store
*/

interface KeyOptions {
  lid: IdentifierMap;
  id: IdentifierMap;
  _allIdentifiers: StableRecordIdentifier[];
}

type IdentifierMap = ConfidentDict<StableRecordIdentifier>;
type TypeMap = ConfidentDict<KeyOptions>;
export type MergeMethod = (
  targetIdentifier: StableRecordIdentifier,
  matchedIdentifier: StableRecordIdentifier,
  resourceData: ResourceIdentifierObject | ExistingResourceObject
) => StableRecordIdentifier;

let configuredForgetMethod: ForgetMethod | null;
let configuredGenerationMethod: GenerationMethod | null;
let configuredResetMethod: ResetMethod | null;
let configuredUpdateMethod: UpdateMethod | null;

export function setIdentifierGenerationMethod(method: GenerationMethod | null): void {
  configuredGenerationMethod = method;
}

export function setIdentifierUpdateMethod(method: UpdateMethod | null): void {
  configuredUpdateMethod = method;
}

export function setIdentifierForgetMethod(method: ForgetMethod | null): void {
  configuredForgetMethod = method;
}

export function setIdentifierResetMethod(method: ResetMethod | null): void {
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

const IdentifierCaches = new WeakMap<CoreStore, IdentifierCache>();

export function identifierCacheFor(store: CoreStore): IdentifierCache {
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
  // currently we leak this for test purposes
  _cache = {
    lids: Object.create(null) as IdentifierMap,
    types: Object.create(null) as TypeMap,
  };
  private _generate: GenerationMethod;
  private _update: UpdateMethod;
  private _forget: ForgetMethod;
  private _reset: ResetMethod;
  private _merge: MergeMethod;

  constructor() {
    // we cache the user configuredGenerationMethod at init because it must
    // be configured prior and is not allowed to be changed
    this._generate = configuredGenerationMethod || defaultGenerationMethod;
    this._update = configuredUpdateMethod || defaultEmptyCallback;
    this._forget = configuredForgetMethod || defaultEmptyCallback;
    this._reset = configuredResetMethod || defaultEmptyCallback;
    this._merge = defaultEmptyCallback;
  }

  /**
   * hook to allow management of merge conflicts with identifiers.
   *
   * we allow late binding of this private internal merge so that `internalModelFactory`
   * can insert itself here to handle elimination of duplicates
   *
   * @internal
   */
  __configureMerge(method: MergeMethod | null) {
    this._merge = method || defaultEmptyCallback;
  }

  /**
   * @internal
   */
  private _getRecordIdentifier(
    resource: ResourceIdentifierObject | Identifier,
    shouldGenerate: true
  ): StableRecordIdentifier;
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

    let lid = coerceId(resource.lid);
    let identifier: StableRecordIdentifier | undefined = lid !== null ? this._cache.lids[lid] : undefined;

    if (identifier !== undefined) {
      return identifier;
    }

    let type = normalizeModelName(resource.type);
    let id = coerceId(resource.id);

    if (shouldGenerate === false) {
      if (!type || !id) {
        return;
      }
    }

    // `type` must always be present
    if (DEBUG) {
      if (!isNonEmptyString(resource.type)) {
        throw new Error('resource.type needs to be a string');
      }
    }

    let keyOptions = getTypeIndex(this._cache.types, type);

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
        // we use identifier.id instead of id here
        // because they may not match and we prefer
        // what we've set via resource data
        if (identifier.id !== null) {
          keyOptions.id[identifier.id] = identifier;

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
  getOrCreateRecordIdentifier(
    resource: ResourceIdentifierObject | ExistingResourceObject | Identifier
  ): StableRecordIdentifier {
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

    If a merge occurs, it is possible the returned identifier does not match the originally
    provided identifier. In this case the abandoned identifier will go through the usual
    `forgetRecordIdentifier` codepaths.
  */
  updateRecordIdentifier(
    identifierObject: RecordIdentifier,
    data: ResourceIdentifierObject | ExistingResourceObject
  ): StableRecordIdentifier {
    let identifier = this.getOrCreateRecordIdentifier(identifierObject);

    let id = identifier.id;
    let newId = coerceId(data.id);

    const keyOptions = getTypeIndex(this._cache.types, identifier.type);
    let existingIdentifier = detectMerge(this._cache.types, identifier, data, newId, this._cache.lids);

    if (existingIdentifier) {
      identifier = this._mergeRecordIdentifiers(keyOptions, identifier, existingIdentifier, data, newId as string);
    }

    id = identifier.id;
    performRecordIdentifierUpdate(identifier, data, this._update);
    newId = identifier.id;

    // add to our own secondary lookup table
    if (id !== newId && newId !== null) {
      let keyOptions = getTypeIndex(this._cache.types, identifier.type);
      keyOptions.id[newId] = identifier;

      if (id !== null) {
        delete keyOptions.id[id];
      }
    }

    return identifier;
  }

  _mergeRecordIdentifiers(
    keyOptions: KeyOptions,
    identifier: StableRecordIdentifier,
    existingIdentifier: StableRecordIdentifier,
    data: ResourceIdentifierObject | ExistingResourceObject,
    newId: string
  ): StableRecordIdentifier {
    // delegate determining which identifier to keep to the configured MergeMethod
    let kept = this._merge(identifier, existingIdentifier, data);
    let abandoned = kept === identifier ? existingIdentifier : identifier;

    // cleanup the identifier we no longer need
    this.forgetRecordIdentifier(abandoned);

    // ensure a secondary cache entry for this id for the identifier we do keep
    keyOptions.id[newId] = kept;
    // ensure a secondary cache entry for this id for the abandoned identifier's type we do keep
    let baseKeyOptions = getTypeIndex(this._cache.types, existingIdentifier.type);
    baseKeyOptions.id[newId] = kept;

    // make sure that the `lid` on the data we are processing matches the lid we kept
    data.lid = kept.lid;

    return kept;
  }

  /*
   Provides the opportunity to eliminate an identifier from secondary lookup tables
   as well as eliminates it from ember-data's own lookup tables and book keeping.

   Useful when a record has been deleted and the deletion has been persisted and
   we do not care about the record anymore. Especially useful when an `id` of a
   deleted record might be reused later for a new record.
  */
  forgetRecordIdentifier(identifierObject: RecordIdentifier): void {
    let identifier = this.getOrCreateRecordIdentifier(identifierObject);
    let keyOptions = getTypeIndex(this._cache.types, identifier.type);
    if (identifier.id !== null) {
      delete keyOptions.id[identifier.id];
    }
    delete this._cache.lids[identifier.lid];
    delete keyOptions.lid[identifier.lid];

    let index = keyOptions._allIdentifiers.indexOf(identifier);
    keyOptions._allIdentifiers.splice(index, 1);

    unmarkStableIdentifier(identifierObject);
    this._forget(identifier, 'record');
  }

  destroy() {
    this._reset();
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
    lid,
    id,
    type,
  };
  markStableIdentifier(recordIdentifier);

  if (DEBUG) {
    // we enforce immutability in dev
    //  but preserve our ability to do controlled updates to the reference
    let wrapper = {
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
    };
    addSymbol(wrapper, DEBUG_CLIENT_ORIGINATED, clientOriginated);
    addSymbol(wrapper, DEBUG_IDENTIFIER_BUCKET, bucket);
    wrapper = freeze(wrapper);
    markStableIdentifier(wrapper);
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
  let type = data.type && normalizeModelName(data.type);

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
        // here we warn and ignore, as this may be a mistake, but we allow the user
        // to have multiple cache-keys pointing at a single lid so we cannot error
        warn(
          `The 'id' for a RecordIdentifier should not be updated once it has been set. Attempted to set id for '${wrapper}' to '${newId}'.`,
          false,
          { id: 'ember-data:multiple-ids-for-identifier' }
        );
      }
    }

    // TODO consider just ignoring here to allow flexible polymorphic support
    if (type && type !== identifier.type) {
      throw new Error(
        `The 'type' for a RecordIdentifier cannot be updated once it has been set. Attempted to set type for '${wrapper}' to '${type}'.`
      );
    }

    updateFn(wrapper, data, 'record');
  } else {
    updateFn(identifier, data, 'record');
  }

  // upgrade the ID, this is a "one time only" ability
  // for the multiple-cache-key scenario we "could"
  // use a heuristic to guess the best id for display
  // (usually when `data.id` is available and `data.attributes` is not)
  if (id !== undefined) {
    identifier.id = coerceId(id);
  }
}

function detectMerge(
  typesCache: ConfidentDict<KeyOptions>,
  identifier: StableRecordIdentifier,
  data: ResourceIdentifierObject | ExistingResourceObject,
  newId: string | null,
  lids: IdentifierMap
): StableRecordIdentifier | false {
  const { id, type, lid } = identifier;
  if (id !== null && id !== newId && newId !== null) {
    let keyOptions = getTypeIndex(typesCache, identifier.type);
    let existingIdentifier = keyOptions.id[newId];

    return existingIdentifier !== undefined ? existingIdentifier : false;
  } else {
    let newType = data.type && normalizeModelName(data.type);

    // If the ids and type are the same but lid is not the same, we should trigger a merge of the identifiers
    if (id !== null && id === newId && newType === type && data.lid && data.lid !== lid) {
      let existingIdentifier = lids[data.lid];
      return existingIdentifier !== undefined ? existingIdentifier : false;
      // If the lids are the same, and ids are the same, but types are different we should trigger a merge of the identifiers
    } else if (id !== null && id === newId && newType && newType !== type && data.lid && data.lid === lid) {
      let keyOptions = getTypeIndex(typesCache, newType);
      let existingIdentifier = keyOptions.id[id];
      return existingIdentifier !== undefined ? existingIdentifier : false;
    }
  }

  return false;
}
