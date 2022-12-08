/**
  @module @ember-data/store
*/
import { assert, warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { getOwnConfig, macroCondition } from '@embroider/macros';

import { LOG_IDENTIFIERS } from '@ember-data/private-build-infra/debugging';
import type { ExistingResourceObject, ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import type {
  ForgetMethod,
  GenerationMethod,
  Identifier,
  IdentifierBucket,
  RecordIdentifier,
  ResetMethod,
  ResourceData,
  StableRecordIdentifier,
  UpdateMethod,
} from '@ember-data/types/q/identifier';
import type { ConfidentDict } from '@ember-data/types/q/utils';

import coerceId from '../utils/coerce-id';
import { DEBUG_CLIENT_ORIGINATED, DEBUG_IDENTIFIER_BUCKET } from '../utils/identifier-debug-consts';
import isNonEmptyString from '../utils/is-non-empty-string';
import normalizeModelName from '../utils/normalize-model-name';
import installPolyfill from '../utils/uuid-polyfill';

const IDENTIFIERS = new Set();

export function isStableIdentifier(identifier: Object): identifier is StableRecordIdentifier {
  return IDENTIFIERS.has(identifier);
}

const isFastBoot = typeof FastBoot !== 'undefined';
const _crypto: Crypto = isFastBoot ? (FastBoot.require('crypto') as Crypto) : window.crypto;

if (macroCondition(getOwnConfig<{ polyfillUUID: boolean }>().polyfillUUID)) {
  installPolyfill();
}

function uuidv4(): string {
  assert(
    'crypto.randomUUID needs to be avaliable. Some browsers incorrectly disallow it in insecure contexts. You maybe want to enable the polyfill: https://github.com/emberjs/data#randomuuid-polyfill',
    _crypto.randomUUID
  );
  return _crypto.randomUUID();
}

function freeze<T>(obj: T): T {
  if (typeof Object.freeze === 'function') {
    return Object.freeze(obj);
  }
  return obj;
}

interface KeyOptions {
  lid: IdentifierMap;
  id: IdentifierMap;
}

type IdentifierMap = Map<string, StableRecordIdentifier>;
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

type WithLid = { lid: string };
type WithId = { id: string | null; type: string };

function defaultGenerationMethod(data: ResourceData | { type: string }, bucket: IdentifierBucket): string {
  if (isNonEmptyString((data as WithLid).lid)) {
    return (data as WithLid).lid;
  }
  if ((data as WithId).id !== undefined) {
    let { type, id } = data as WithId;
    // TODO: add test for id not a string
    if (isNonEmptyString(coerceId(id))) {
      return `@lid:${normalizeModelName(type)}-${id}`;
    }
  }
  return uuidv4();
}

function defaultEmptyCallback(...args: any[]): any {}

let DEBUG_MAP;
if (DEBUG) {
  DEBUG_MAP = new WeakMap<StableRecordIdentifier, StableRecordIdentifier>();
}

/**
 * Each instance of {Store} receives a unique instance of a IdentifierCache.
 *
 * This cache is responsible for assigning or retrieving the unique identify
 * for arbitrary resource data encountered by the store. Data representing
 * a unique resource or record should always be represented by the same
 * identifier.
 *
 * It can be configured by consuming applications.
 *
 * @class IdentifierCache
   @public
 */
export class IdentifierCache {
  _cache = {
    lids: new Map<string, StableRecordIdentifier>(),
    types: Object.create(null) as TypeMap,
  };
  declare _generate: GenerationMethod;
  declare _update: UpdateMethod;
  declare _forget: ForgetMethod;
  declare _reset: ResetMethod;
  declare _merge: MergeMethod;
  declare _isDefaultConfig: boolean;

  constructor() {
    // we cache the user configuredGenerationMethod at init because it must
    // be configured prior and is not allowed to be changed
    this._generate = configuredGenerationMethod || defaultGenerationMethod;
    this._update = configuredUpdateMethod || defaultEmptyCallback;
    this._forget = configuredForgetMethod || defaultEmptyCallback;
    this._reset = configuredResetMethod || defaultEmptyCallback;
    this._merge = defaultEmptyCallback;
    this._isDefaultConfig = !configuredGenerationMethod;
  }

  /**
   * Internal hook to allow management of merge conflicts with identifiers.
   *
   * we allow late binding of this private internal merge so that
   * the cache can insert itself here to handle elimination of duplicates
   *
   * @method __configureMerge
   * @private
   */
  __configureMerge(method: MergeMethod | null) {
    this._merge = method || defaultEmptyCallback;
  }

  /**
   * @method _getRecordIdentifier
   * @private
   */
  _getRecordIdentifier(resource: ResourceIdentifierObject, shouldGenerate: true): StableRecordIdentifier;
  _getRecordIdentifier(resource: ResourceIdentifierObject, shouldGenerate: false): StableRecordIdentifier | undefined;
  _getRecordIdentifier(
    resource: ResourceIdentifierObject,
    shouldGenerate: boolean = false
  ): StableRecordIdentifier | undefined {
    // short circuit if we're already the stable version
    if (isStableIdentifier(resource)) {
      if (DEBUG) {
        // TODO should we instead just treat this case as a new generation skipping the short circuit?
        if (!this._cache.lids.has(resource.lid) || this._cache.lids.get(resource.lid) !== resource) {
          throw new Error(`The supplied identifier ${resource} does not belong to this store instance`);
        }
      }
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.log(`Identifiers: Peeked Identifier was already Stable ${String(resource)}`);
      }
      return resource;
    }

    let lid = coerceId(resource.lid);
    let identifier: StableRecordIdentifier | undefined = lid !== null ? this._cache.lids.get(lid) : undefined;

    if (identifier !== undefined) {
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.log(`Identifiers: cache HIT ${identifier}`, resource);
      }
      return identifier;
    }

    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(`Identifiers: ${shouldGenerate ? 'Generating' : 'Peeking'} Identifier`, resource);
    }

    if (shouldGenerate === false) {
      if (!(resource as ExistingResourceObject).type || !(resource as ExistingResourceObject).id) {
        return;
      }
    }

    // `type` must always be present
    assert('resource.type needs to be a string', 'type' in resource && isNonEmptyString(resource.type));

    let type = resource.type && normalizeModelName(resource.type);
    let id = coerceId(resource.id);

    let keyOptions = getTypeIndex(this._cache.types, type);

    // go straight for the stable RecordIdentifier key'd to `lid`
    if (lid !== null) {
      identifier = keyOptions.lid.get(lid);
    }

    // we may have not seen this resource before
    // but just in case we check our own secondary lookup (`id`)
    if (identifier === undefined && id !== null) {
      identifier = keyOptions.id.get(id);
    }

    if (identifier === undefined) {
      // we have definitely not seen this resource before
      // so we allow the user configured `GenerationMethod` to tell us
      let newLid = this._generate(resource, 'record');
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.log(`Identifiers: lid ${newLid} determined for resource`, resource);
      }

      // we do this _even_ when `lid` is present because secondary lookups
      // may need to be populated, but we enforce not giving us something
      // different than expected
      if (lid !== null && newLid !== lid) {
        throw new Error(`You should not change the <lid> of a RecordIdentifier`);
      } else if (lid === null && !this._isDefaultConfig) {
        // allow configuration to tell us that we have
        // seen this `lid` before. E.g. a secondary lookup
        // connects this resource to a previously seen
        // resource.
        identifier = keyOptions.lid.get(newLid);
      }

      if (shouldGenerate === true) {
        if (identifier === undefined) {
          // if we still don't have an identifier, time to generate one
          identifier = makeStableRecordIdentifier(id, type, newLid, 'record', false);

          // populate our unique table
          if (DEBUG) {
            // realistically if you hit this it means you changed `type` :/
            // TODO consider how to handle type change assertions more gracefully
            if (this._cache.lids.has(identifier.lid)) {
              throw new Error(`You should not change the <type> of a RecordIdentifier`);
            }
          }
          this._cache.lids.set(identifier.lid, identifier);

          // populate our primary lookup table
          // TODO consider having the `lid` cache be
          // one level up
          keyOptions.lid.set(identifier.lid, identifier);

          if (LOG_IDENTIFIERS) {
            if (shouldGenerate) {
              // eslint-disable-next-line no-console
              console.log(`Identifiers: generated ${String(identifier)} for`, resource);
              if (resource[DEBUG_IDENTIFIER_BUCKET]) {
                // eslint-disable-next-line no-console
                console.trace(
                  `[WARNING] Identifiers: generated a new identifier from a previously used identifier. This is likely a bug.`
                );
              }
            }
          }
        }

        // populate our own secondary lookup table
        // even for the "successful" secondary lookup
        // by `_generate()`, since we missed the cache
        // previously
        // we use identifier.id instead of id here
        // because they may not match and we prefer
        // what we've set via resource data
        if (identifier.id !== null) {
          keyOptions.id.set(identifier.id, identifier);

          // TODO allow filling out of `id` here
          // for the `username` non-client created
          // case.
        }
      }
    }

    if (LOG_IDENTIFIERS) {
      if (!identifier && !shouldGenerate) {
        // eslint-disable-next-line no-console
        console.log(`Identifiers: cache MISS`, resource);
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    }

    return identifier;
  }

  /**
   * allows us to peek without generating when needed
   * useful for the "create" case when we need to see if
   * we are accidentally overwritting something
   *
   * @method peekRecordIdentifier
   * @param resource
   * @returns {StableRecordIdentifier | undefined}
   * @private
   */
  peekRecordIdentifier(resource: ResourceIdentifierObject | Identifier): StableRecordIdentifier | undefined {
    return this._getRecordIdentifier(resource, false);
  }

  /**
    Returns the Identifier for the given Resource, creates one if it does not yet exist.

    Specifically this means that we:

    - validate the `id` `type` and `lid` combo against known identifiers
    - return an object with an `lid` that is stable (repeated calls with the same
      `id` + `type` or `lid` will return the same `lid` value)
    - this referential stability of the object itself is guaranteed

    @method getOrCreateRecordIdentifier
    @param resource
    @returns {StableRecordIdentifier}
    @public
  */
  getOrCreateRecordIdentifier(resource: ResourceData | Identifier): StableRecordIdentifier {
    return this._getRecordIdentifier(resource, true);
  }

  /**
   Returns a new Identifier for the supplied data. Call this method to generate
   an identifier when a new resource is being created local to the client and
   potentially does not have an `id`.

   Delegates generation to the user supplied `GenerateMethod` if one has been provided
   with the signature `generateMethod({ type }, 'record')`.

   @method createIdentifierForNewRecord
   @param data
   @returns {StableRecordIdentifier}
   @public
  */
  createIdentifierForNewRecord(data: { type: string; id?: string | null }): StableRecordIdentifier {
    let newLid = this._generate(data, 'record');
    let identifier = makeStableRecordIdentifier(data.id || null, data.type, newLid, 'record', true);
    let keyOptions = getTypeIndex(this._cache.types, data.type);

    // populate our unique table
    if (DEBUG) {
      if (this._cache.lids.has(identifier.lid)) {
        throw new Error(`The lid generated for the new record is not unique as it matches an existing identifier`);
      }
    }
    this._cache.lids.set(identifier.lid, identifier);

    // populate the type+lid cache
    keyOptions.lid.set(newLid, identifier);
    if (data.id) {
      keyOptions.id.set(data.id, identifier);
    }

    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: createded identifier ${String(identifier)} for newly generated resource`, data);
    }

    return identifier;
  }

  /**
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

    @method updateRecordIdentifier
    @param identifierObject
    @param data
    @returns {StableRecordIdentifier}
    @public
  */
  updateRecordIdentifier(identifierObject: RecordIdentifier, data: ResourceData): StableRecordIdentifier {
    let identifier = this.getOrCreateRecordIdentifier(identifierObject);

    let newId =
      (data as ExistingResourceObject).id !== undefined ? coerceId((data as ExistingResourceObject).id) : null;
    let existingIdentifier = detectMerge(this._cache.types, identifier, data, newId, this._cache.lids);

    if (!existingIdentifier) {
      // If the incoming type does not match the identifier type, we need to create an identifier for the incoming
      // data so we can merge the incoming data with the existing identifier, see #7325 and #7363
      if (
        (data as ExistingResourceObject).type &&
        identifier.type !== normalizeModelName((data as ExistingResourceObject).type)
      ) {
        let incomingDataResource = { ...data };
        // Need to strip the lid from the incomingData in order force a new identifier creation
        delete incomingDataResource.lid;
        existingIdentifier = this.getOrCreateRecordIdentifier(incomingDataResource);
      }
    }

    if (existingIdentifier) {
      let keyOptions = getTypeIndex(this._cache.types, identifier.type);
      let generatedIdentifier = identifier;
      identifier = this._mergeRecordIdentifiers(
        keyOptions,
        generatedIdentifier,
        existingIdentifier,
        data,
        newId as string
      );
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.log(
          `Identifiers: merged identifiers ${generatedIdentifier.lid} and ${existingIdentifier.lid} for resource into ${identifier.lid}`,
          data
        );
      }
    }

    let id = identifier.id;
    performRecordIdentifierUpdate(identifier, data, this._update);
    newId = identifier.id;

    // add to our own secondary lookup table
    if (id !== newId && newId !== null) {
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.log(
          `Identifiers: updated id for identifier ${identifier.lid} from '${id}' to '${newId}' for resource`,
          data
        );
      }
      let keyOptions = getTypeIndex(this._cache.types, identifier.type);
      keyOptions.id.set(newId, identifier);

      if (id !== null) {
        keyOptions.id.delete(id);
      }
    } else if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: updated identifier ${identifier.lid} resource`, data);
    }

    return identifier;
  }

  /**
   * @method _mergeRecordIdentifiers
   * @private
   */
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
    keyOptions.id.set(newId, kept);
    // ensure a secondary cache entry for this id for the abandoned identifier's type we do keep
    let baseKeyOptions = getTypeIndex(this._cache.types, existingIdentifier.type);
    baseKeyOptions.id.set(newId, kept);

    // make sure that the `lid` on the data we are processing matches the lid we kept
    data.lid = kept.lid;

    return kept;
  }

  /**
   Provides the opportunity to eliminate an identifier from secondary lookup tables
   as well as eliminates it from ember-data's own lookup tables and book keeping.

   Useful when a record has been deleted and the deletion has been persisted and
   we do not care about the record anymore. Especially useful when an `id` of a
   deleted record might be reused later for a new record.

   @method forgetRecordIdentifier
   @param identifierObject
   @public
  */
  forgetRecordIdentifier(identifierObject: RecordIdentifier): void {
    let identifier = this.getOrCreateRecordIdentifier(identifierObject);
    let keyOptions = getTypeIndex(this._cache.types, identifier.type);
    if (identifier.id !== null) {
      keyOptions.id.delete(identifier.id);
    }
    this._cache.lids.delete(identifier.lid);
    keyOptions.lid.delete(identifier.lid);

    IDENTIFIERS.delete(identifierObject);
    this._forget(identifier, 'record');
    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: released identifier ${identifierObject.lid}`);
    }
  }

  destroy() {
    this._reset();
  }
}

function getTypeIndex(typeMap: TypeMap, type: string): KeyOptions {
  let typeIndex: KeyOptions = typeMap[type];

  if (typeIndex === undefined) {
    typeIndex = {
      lid: new Map(),
      id: new Map(),
    };
    typeMap[type] = typeIndex;
  }

  return typeIndex;
}

function makeStableRecordIdentifier(
  id: string | null,
  type: string,
  lid: string,
  bucket: IdentifierBucket,
  clientOriginated: boolean = false
): Readonly<StableRecordIdentifier> {
  let recordIdentifier = {
    lid,
    id,
    type,
  };
  IDENTIFIERS.add(recordIdentifier);

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
      toJSON() {
        let { type, id, lid } = recordIdentifier;
        return { type, id, lid };
      },
    };
    wrapper[DEBUG_CLIENT_ORIGINATED] = clientOriginated;
    wrapper[DEBUG_IDENTIFIER_BUCKET] = bucket;
    IDENTIFIERS.add(wrapper);
    DEBUG_MAP.set(wrapper, recordIdentifier);
    wrapper = freeze(wrapper);
    return wrapper;
  }

  return recordIdentifier;
}

function performRecordIdentifierUpdate(identifier: StableRecordIdentifier, data: ResourceData, updateFn: UpdateMethod) {
  if (DEBUG) {
    let { lid } = data;
    let id = 'id' in data ? data.id : undefined;
    let type = 'type' in data && data.type && normalizeModelName(data.type);

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
  if ((data as ExistingResourceObject).id !== undefined) {
    identifier.id = coerceId((data as ExistingResourceObject).id);
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
    let existingIdentifier = keyOptions.id.get(newId);

    return existingIdentifier !== undefined ? existingIdentifier : false;
  } else {
    let newType = (data as ExistingResourceObject).type && normalizeModelName((data as ExistingResourceObject).type);

    // If the ids and type are the same but lid is not the same, we should trigger a merge of the identifiers
    if (id !== null && id === newId && newType === type && data.lid && data.lid !== lid) {
      let existingIdentifier = lids.get(data.lid);
      return existingIdentifier !== undefined ? existingIdentifier : false;
      // If the lids are the same, and ids are the same, but types are different we should trigger a merge of the identifiers
    } else if (id !== null && id === newId && newType && newType !== type && data.lid && data.lid === lid) {
      let keyOptions = getTypeIndex(typesCache, newType);
      let existingIdentifier = keyOptions.id.get(id);
      return existingIdentifier !== undefined ? existingIdentifier : false;
    }
  }

  return false;
}
