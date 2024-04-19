/**
  @module @ember-data/store
*/
import { assert, warn } from '@ember/debug';

import { getOwnConfig, macroCondition } from '@embroider/macros';

import { LOG_IDENTIFIERS } from '@warp-drive/build-config/debugging';
import { DEBUG } from '@warp-drive/build-config/env';
import {
  CACHE_OWNER,
  DEBUG_CLIENT_ORIGINATED,
  DEBUG_IDENTIFIER_BUCKET,
  DEBUG_STALE_CACHE_OWNER,
  type Identifier,
  type IdentifierBucket,
  type RecordIdentifier,
  type StableDocumentIdentifier,
  type StableIdentifier,
  type StableRecordIdentifier,
} from '@warp-drive/core-types/identifier';
import type { ImmutableRequestInfo } from '@warp-drive/core-types/request';
import type { ExistingResourceObject, ResourceIdentifierObject } from '@warp-drive/core-types/spec/raw';

import type {
  ForgetMethod,
  GenerationMethod,
  KeyInfo,
  KeyInfoMethod,
  ResetMethod,
  ResourceData,
  UpdateMethod,
} from '../../-types/q/identifier';
import coerceId from '../utils/coerce-id';
import normalizeModelName from '../utils/normalize-model-name';
import installPolyfill from '../utils/uuid-polyfill';
import { hasId, hasLid, hasType } from './resource-utils';

const IDENTIFIERS = new Set();
const DOCUMENTS = new Set();

export function isStableIdentifier(identifier: unknown): identifier is StableRecordIdentifier {
  return (identifier as StableRecordIdentifier)[CACHE_OWNER] !== undefined || IDENTIFIERS.has(identifier);
}

export function isDocumentIdentifier(identifier: unknown): identifier is StableDocumentIdentifier {
  return DOCUMENTS.has(identifier);
}

const isFastBoot = typeof FastBoot !== 'undefined';
const _crypto: Crypto = isFastBoot ? (FastBoot.require('crypto') as Crypto) : window.crypto;

if (macroCondition(getOwnConfig<{ polyfillUUID: boolean }>().polyfillUUID)) {
  installPolyfill();
}

function uuidv4(): string {
  assert(
    'crypto.randomUUID needs to be avaliable. Some browsers incorrectly disallow it in insecure contexts. You maybe want to enable the polyfill: https://github.com/emberjs/data#randomuuid-polyfill',
    typeof _crypto.randomUUID === 'function'
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
type TypeMap = { [key: string]: KeyOptions };

// type IdentifierTypeLookup = { all: Set<StableRecordIdentifier>; id: Map<string, StableRecordIdentifier> };
// type IdentifiersByType = Map<string, IdentifierTypeLookup>;
type IdentifierMap = Map<string, StableRecordIdentifier>;

type StableCache = {
  resources: IdentifierMap;
  documents: Map<string, StableDocumentIdentifier>;
  resourcesByType: TypeMap;
  polymorphicLidBackMap: Map<string, string[]>;
};

export type MergeMethod = (
  targetIdentifier: StableRecordIdentifier,
  matchedIdentifier: StableRecordIdentifier,
  resourceData: unknown
) => StableRecordIdentifier;

let configuredForgetMethod: ForgetMethod | null;
let configuredGenerationMethod: GenerationMethod | null;
let configuredResetMethod: ResetMethod | null;
let configuredUpdateMethod: UpdateMethod | null;
let configuredKeyInfoMethod: KeyInfoMethod | null;

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

export function setKeyInfoForResource(method: KeyInfoMethod | null): void {
  configuredKeyInfoMethod = method;
}

function assertIsRequest(request: unknown): asserts request is ImmutableRequestInfo {
  return;
}

// Map<type, Map<id, lid>>
type TypeIdMap = Map<string, Map<string, string>>;
const NEW_IDENTIFIERS: TypeIdMap = new Map();
let IDENTIFIER_CACHE_ID = 0;

function updateTypeIdMapping(typeMap: TypeIdMap, identifier: StableRecordIdentifier, id: string): void {
  let idMap = typeMap.get(identifier.type);
  if (!idMap) {
    idMap = new Map();
    typeMap.set(identifier.type, idMap);
  }
  idMap.set(id, identifier.lid);
}

function defaultUpdateMethod(identifier: StableRecordIdentifier, data: unknown, bucket: 'record'): void;
function defaultUpdateMethod(identifier: StableIdentifier, newData: unknown, bucket: never): void;
function defaultUpdateMethod(
  identifier: StableIdentifier | StableRecordIdentifier,
  data: unknown,
  bucket: 'record'
): void {
  if (bucket === 'record') {
    assert(`Expected identifier to be a StableRecordIdentifier`, isStableIdentifier(identifier));
    if (!identifier.id && hasId(data)) {
      updateTypeIdMapping(NEW_IDENTIFIERS, identifier, data.id);
    }
  }
}

function defaultKeyInfoMethod(resource: unknown, known: StableRecordIdentifier | null): KeyInfo {
  // TODO RFC something to make this configurable
  const id = hasId(resource) ? coerceId(resource.id) : null;
  const type = hasType(resource) ? normalizeModelName(resource.type) : known ? known.type : null;

  assert(`Expected keyInfoForResource to provide a type for the resource`, type);

  return { type, id };
}

function defaultGenerationMethod(data: ImmutableRequestInfo, bucket: 'document'): string | null;
function defaultGenerationMethod(data: ResourceData | { type: string }, bucket: 'record'): string;
function defaultGenerationMethod(
  data: ImmutableRequestInfo | ResourceData | { type: string },
  bucket: IdentifierBucket
): string | null {
  if (bucket === 'record') {
    if (hasLid(data)) {
      return data.lid;
    }

    assert(`Cannot generate an identifier for a resource without a type`, hasType(data));

    if (hasId(data)) {
      const type = normalizeModelName(data.type);
      const lid = NEW_IDENTIFIERS.get(type)?.get(data.id);

      return lid || `@lid:${type}-${data.id}`;
    }

    return uuidv4();
  } else if (bucket === 'document') {
    assertIsRequest(data);
    if (!data.url) {
      return null;
    }
    if (!data.method || data.method.toUpperCase() === 'GET') {
      return data.url;
    }
    return null;
  }
  assert(`Unknown bucket ${bucket as string}`, false);
}

function defaultEmptyCallback(...args: unknown[]): void {}
function defaultMergeMethod(
  a: StableRecordIdentifier,
  _b: StableRecordIdentifier,
  _c: unknown
): StableRecordIdentifier {
  return a;
}

let DEBUG_MAP: WeakMap<StableRecordIdentifier, StableRecordIdentifier>;
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
  declare _cache: StableCache;
  declare _generate: GenerationMethod;
  declare _update: UpdateMethod;
  declare _forget: ForgetMethod;
  declare _reset: ResetMethod;
  declare _merge: MergeMethod;
  declare _keyInfoForResource: KeyInfoMethod;
  declare _isDefaultConfig: boolean;
  declare _id: number;

  constructor() {
    // we cache the user configuredGenerationMethod at init because it must
    // be configured prior and is not allowed to be changed
    this._generate = configuredGenerationMethod || (defaultGenerationMethod as GenerationMethod);
    this._update = configuredUpdateMethod || defaultUpdateMethod;
    this._forget = configuredForgetMethod || defaultEmptyCallback;
    this._reset = configuredResetMethod || defaultEmptyCallback;
    this._merge = defaultMergeMethod;
    this._keyInfoForResource = configuredKeyInfoMethod || defaultKeyInfoMethod;
    this._isDefaultConfig = !configuredGenerationMethod;
    this._id = IDENTIFIER_CACHE_ID++;

    this._cache = {
      resources: new Map<string, StableRecordIdentifier>(),
      resourcesByType: Object.create(null) as TypeMap,
      documents: new Map<string, StableDocumentIdentifier>(),
      polymorphicLidBackMap: new Map<string, string[]>(),
    };
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
    this._merge = method || defaultMergeMethod;
  }

  upgradeIdentifier(resource: { type: string; id: string | null; lid?: string }): StableRecordIdentifier {
    return this._getRecordIdentifier(resource, 2);
  }

  /**
   * @method _getRecordIdentifier
   * @private
   */
  _getRecordIdentifier(
    resource: { type: string; id: string | null; lid?: string },
    shouldGenerate: 2
  ): StableRecordIdentifier;
  _getRecordIdentifier(resource: unknown, shouldGenerate: 1): StableRecordIdentifier;
  _getRecordIdentifier(resource: unknown, shouldGenerate: 0): StableRecordIdentifier | undefined;
  _getRecordIdentifier(resource: unknown, shouldGenerate: 0 | 1 | 2): StableRecordIdentifier | undefined {
    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(`Identifiers: ${shouldGenerate ? 'Generating' : 'Peeking'} Identifier`, resource);
    }
    // short circuit if we're already the stable version
    if (isStableIdentifier(resource)) {
      if (DEBUG) {
        // TODO should we instead just treat this case as a new generation skipping the short circuit?
        if (!this._cache.resources.has(resource.lid) || this._cache.resources.get(resource.lid) !== resource) {
          throw new Error(`The supplied identifier ${JSON.stringify(resource)} does not belong to this store instance`);
        }
      }
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.log(`Identifiers: cache HIT - Stable ${resource.lid}`);
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
      return resource;
    }

    // the resource is unknown, ask the application to identify this data for us
    const lid = this._generate(resource, 'record');
    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: ${lid ? 'no ' : ''}lid ${lid ? lid + ' ' : ''}determined for resource`, resource);
    }

    let identifier: StableRecordIdentifier | null = /*#__NOINLINE__*/ getIdentifierFromLid(this._cache, lid, resource);
    if (identifier !== null) {
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
      return identifier;
    }

    if (shouldGenerate === 0) {
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
      return;
    }

    // if we still don't have an identifier, time to generate one
    if (shouldGenerate === 2) {
      (resource as StableRecordIdentifier).lid = lid;
      (resource as StableRecordIdentifier)[CACHE_OWNER] = this._id;
      identifier = /*#__NOINLINE__*/ makeStableRecordIdentifier(resource as StableRecordIdentifier, 'record', false);
    } else {
      // we lie a bit here as a memory optimization
      const keyInfo = this._keyInfoForResource(resource, null) as StableRecordIdentifier;
      keyInfo.lid = lid;
      keyInfo[CACHE_OWNER] = this._id;
      identifier = /*#__NOINLINE__*/ makeStableRecordIdentifier(keyInfo, 'record', false);
    }

    addResourceToCache(this._cache, identifier);

    if (LOG_IDENTIFIERS) {
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
   * @return {StableRecordIdentifier | undefined}
   * @private
   */
  peekRecordIdentifier(resource: ResourceIdentifierObject | Identifier): StableRecordIdentifier | undefined {
    return this._getRecordIdentifier(resource, 0);
  }

  /**
    Returns the DocumentIdentifier for the given Request, creates one if it does not yet exist.
    Returns `null` if the request does not have a `cacheKey` or `url`.

    @method getOrCreateDocumentIdentifier
    @param request
    @return {StableDocumentIdentifier | null}
    @public
  */
  getOrCreateDocumentIdentifier(request: ImmutableRequestInfo): StableDocumentIdentifier | null {
    let cacheKey: string | null | undefined = request.cacheOptions?.key;

    if (!cacheKey) {
      cacheKey = this._generate(request, 'document');
    }

    if (!cacheKey) {
      return null;
    }

    let identifier = this._cache.documents.get(cacheKey);

    if (identifier === undefined) {
      identifier = { lid: cacheKey };
      if (DEBUG) {
        Object.freeze(identifier);
      }
      DOCUMENTS.add(identifier);
      this._cache.documents.set(cacheKey, identifier);
    }

    return identifier;
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
    @return {StableRecordIdentifier}
    @public
  */
  getOrCreateRecordIdentifier(resource: unknown): StableRecordIdentifier {
    return this._getRecordIdentifier(resource, 1);
  }

  /**
   Returns a new Identifier for the supplied data. Call this method to generate
   an identifier when a new resource is being created local to the client and
   potentially does not have an `id`.

   Delegates generation to the user supplied `GenerateMethod` if one has been provided
   with the signature `generateMethod({ type }, 'record')`.

   @method createIdentifierForNewRecord
   @param data
   @return {StableRecordIdentifier}
   @public
  */
  createIdentifierForNewRecord(data: { type: string; id?: string | null }): StableRecordIdentifier {
    const newLid = this._generate(data, 'record');
    const identifier = /*#__NOINLINE__*/ makeStableRecordIdentifier(
      { id: data.id || null, type: data.type, lid: newLid, [CACHE_OWNER]: this._id },
      'record',
      true
    );

    // populate our unique table
    if (DEBUG) {
      if (this._cache.resources.has(identifier.lid)) {
        throw new Error(`The lid generated for the new record is not unique as it matches an existing identifier`);
      }
    }

    /*#__NOINLINE__*/ addResourceToCache(this._cache, identifier);

    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: created identifier ${String(identifier)} for newly generated resource`, data);
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
    @return {StableRecordIdentifier}
    @public
  */
  updateRecordIdentifier(identifierObject: RecordIdentifier, data: unknown): StableRecordIdentifier {
    let identifier = this.getOrCreateRecordIdentifier(identifierObject);

    const keyInfo = this._keyInfoForResource(data, identifier);
    let existingIdentifier = /*#__NOINLINE__*/ detectMerge(this._cache, keyInfo, identifier, data);
    const hadLid = hasLid(data);

    if (!existingIdentifier) {
      // If the incoming type does not match the identifier type, we need to create an identifier for the incoming
      // data so we can merge the incoming data with the existing identifier, see #7325 and #7363
      if (identifier.type !== keyInfo.type) {
        if (hadLid) {
          // Strip the lid to ensure we force a new identifier creation
          delete (data as { lid?: string }).lid;
        }
        existingIdentifier = this.getOrCreateRecordIdentifier(data);
      }
    }

    if (existingIdentifier) {
      const generatedIdentifier = identifier;
      identifier = this._mergeRecordIdentifiers(keyInfo, generatedIdentifier, existingIdentifier, data);

      // make sure that the `lid` on the data we are processing matches the lid we kept
      if (hadLid) {
        data.lid = identifier.lid;
      }

      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.log(
          `Identifiers: merged identifiers ${generatedIdentifier.lid} and ${existingIdentifier.lid} for resource into ${identifier.lid}`,
          data
        );
      }
    }

    const id = identifier.id;
    /*#__NOINLINE__*/ performRecordIdentifierUpdate(identifier, keyInfo, data, this._update);
    const newId = identifier.id;

    // add to our own secondary lookup table
    if (id !== newId && newId !== null) {
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.log(
          `Identifiers: updated id for identifier ${identifier.lid} from '${String(id)}' to '${String(
            newId
          )}' for resource`,
          data
        );
      }

      const typeSet = this._cache.resourcesByType[identifier.type];
      assert(`Expected to find a typeSet for ${identifier.type}`, typeSet);
      typeSet.id.set(newId, identifier);

      if (id !== null) {
        typeSet.id.delete(id);
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
    keyInfo: KeyInfo,
    identifier: StableRecordIdentifier,
    existingIdentifier: StableRecordIdentifier,
    data: unknown
  ): StableRecordIdentifier {
    assert(`Expected keyInfo to contain an id`, hasId(keyInfo));
    // delegate determining which identifier to keep to the configured MergeMethod
    const kept = this._merge(identifier, existingIdentifier, data);
    const abandoned = kept === identifier ? existingIdentifier : identifier;

    // get any backreferences before forgetting this identifier, as it will be removed from the cache
    // and we will no longer be able to find them
    const abandonedBackReferences = this._cache.polymorphicLidBackMap.get(abandoned.lid);
    // delete the backreferences for the abandoned identifier so that forgetRecordIdentifier
    // does not try to remove them.
    if (abandonedBackReferences) this._cache.polymorphicLidBackMap.delete(abandoned.lid);

    // cleanup the identifier we no longer need
    this.forgetRecordIdentifier(abandoned);

    // ensure a secondary cache entry for the original lid for the abandoned identifier
    this._cache.resources.set(abandoned.lid, kept);

    // backReferences let us know which other identifiers are pointing at this identifier
    // so we can delete them later if we forget this identifier
    const keptBackReferences = this._cache.polymorphicLidBackMap.get(kept.lid) ?? [];
    keptBackReferences.push(abandoned.lid);

    // update the backreferences from the abandoned identifier to be for the kept identifier
    if (abandonedBackReferences) {
      abandonedBackReferences.forEach((lid) => {
        keptBackReferences.push(lid);
        this._cache.resources.set(lid, kept);
      });
    }

    this._cache.polymorphicLidBackMap.set(kept.lid, keptBackReferences);
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
    const identifier = this.getOrCreateRecordIdentifier(identifierObject);
    const typeSet = this._cache.resourcesByType[identifier.type];
    assert(`Expected to find a typeSet for ${identifier.type}`, typeSet);

    if (identifier.id !== null) {
      typeSet.id.delete(identifier.id);
    }
    this._cache.resources.delete(identifier.lid);
    typeSet.lid.delete(identifier.lid);

    const backReferences = this._cache.polymorphicLidBackMap.get(identifier.lid);
    if (backReferences) {
      backReferences.forEach((lid) => {
        this._cache.resources.delete(lid);
      });
      this._cache.polymorphicLidBackMap.delete(identifier.lid);
    }

    if (DEBUG) {
      identifier[DEBUG_STALE_CACHE_OWNER] = identifier[CACHE_OWNER];
    }
    identifier[CACHE_OWNER] = undefined;
    IDENTIFIERS.delete(identifier);
    this._forget(identifier, 'record');
    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: released identifier ${identifierObject.lid}`);
    }
  }

  destroy() {
    NEW_IDENTIFIERS.clear();
    this._cache.documents.forEach((identifier) => {
      DOCUMENTS.delete(identifier);
    });
    this._reset();
  }
}

function makeStableRecordIdentifier(
  recordIdentifier: {
    type: string;
    id: string | null;
    lid: string;
    [CACHE_OWNER]: number | undefined;
  },
  bucket: IdentifierBucket,
  clientOriginated: boolean
): StableRecordIdentifier {
  IDENTIFIERS.add(recordIdentifier);

  if (DEBUG) {
    // we enforce immutability in dev
    //  but preserve our ability to do controlled updates to the reference
    let wrapper: StableRecordIdentifier = {
      get lid() {
        return recordIdentifier.lid;
      },
      get id() {
        return recordIdentifier.id;
      },
      get type() {
        return recordIdentifier.type;
      },
      get [CACHE_OWNER](): number | undefined {
        return recordIdentifier[CACHE_OWNER];
      },
      set [CACHE_OWNER](value: number) {
        recordIdentifier[CACHE_OWNER] = value;
      },
      get [DEBUG_STALE_CACHE_OWNER](): number | undefined {
        return (recordIdentifier as StableRecordIdentifier)[DEBUG_STALE_CACHE_OWNER];
      },
      set [DEBUG_STALE_CACHE_OWNER](value: number | undefined) {
        (recordIdentifier as StableRecordIdentifier)[DEBUG_STALE_CACHE_OWNER] = value;
      },
    };
    Object.defineProperty(wrapper, 'toString', {
      enumerable: false,
      value: () => {
        const { type, id, lid } = recordIdentifier;
        return `${clientOriginated ? '[CLIENT_ORIGINATED] ' : ''}${String(type)}:${String(id)} (${lid})`;
      },
    });
    Object.defineProperty(wrapper, 'toJSON', {
      enumerable: false,
      value: () => {
        const { type, id, lid } = recordIdentifier;
        return { type, id, lid };
      },
    });
    wrapper[DEBUG_CLIENT_ORIGINATED] = clientOriginated;
    wrapper[DEBUG_IDENTIFIER_BUCKET] = bucket;
    IDENTIFIERS.add(wrapper);
    DEBUG_MAP.set(wrapper, recordIdentifier);
    wrapper = freeze(wrapper);
    return wrapper;
  }

  return recordIdentifier;
}

function performRecordIdentifierUpdate(
  identifier: StableRecordIdentifier,
  keyInfo: KeyInfo,
  data: unknown,
  updateFn: UpdateMethod
) {
  if (DEBUG) {
    const { id, type } = keyInfo;

    // get the mutable instance behind our proxy wrapper
    const wrapper = identifier;
    identifier = DEBUG_MAP.get(wrapper)!;

    if (hasLid(data)) {
      const lid = data.lid;
      if (lid !== identifier.lid) {
        throw new Error(
          `The 'lid' for a RecordIdentifier cannot be updated once it has been created. Attempted to set lid for '${wrapper.lid}' to '${lid}'.`
        );
      }
    }

    if (id && identifier.id !== null && identifier.id !== id) {
      // here we warn and ignore, as this may be a mistake, but we allow the user
      // to have multiple cache-keys pointing at a single lid so we cannot error
      warn(
        `The 'id' for a RecordIdentifier should not be updated once it has been set. Attempted to set id for '${wrapper.lid}' to '${id}'.`,
        false,
        { id: 'ember-data:multiple-ids-for-identifier' }
      );
    }

    // TODO consider just ignoring here to allow flexible polymorphic support
    if (type && type !== identifier.type) {
      throw new Error(
        `The 'type' for a RecordIdentifier cannot be updated once it has been set. Attempted to set type for '${wrapper.lid}' to '${type}'.`
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
  cache: StableCache,
  keyInfo: KeyInfo,
  identifier: StableRecordIdentifier,
  data: unknown
): StableRecordIdentifier | false {
  const newId = keyInfo.id;
  const { id, type, lid } = identifier;
  const typeSet = cache.resourcesByType[identifier.type];

  // if the IDs are present but do not match
  // then check if we have an existing identifier
  // for the newer ID.
  if (id !== null && id !== newId && newId !== null) {
    const existingIdentifier = typeSet && typeSet.id.get(newId);

    return existingIdentifier !== undefined ? existingIdentifier : false;
  } else {
    const newType = keyInfo.type;

    // If the ids and type are the same but lid is not the same, we should trigger a merge of the identifiers
    // we trigger a merge of the identifiers
    // though probably we should just throw an error here
    if (id !== null && id === newId && newType === type && hasLid(data) && data.lid !== lid) {
      return getIdentifierFromLid(cache, data.lid, data) || false;

      // If the lids are the same, and ids are the same, but types are different we should trigger a merge of the identifiers
    } else if (id !== null && id === newId && newType && newType !== type && hasLid(data) && data.lid === lid) {
      const newTypeSet = cache.resourcesByType[newType];
      const existingIdentifier = newTypeSet && newTypeSet.id.get(newId);

      return existingIdentifier !== undefined ? existingIdentifier : false;
    }
  }

  return false;
}

function getIdentifierFromLid(cache: StableCache, lid: string, resource: unknown): StableRecordIdentifier | null {
  const identifier = cache.resources.get(lid);
  if (LOG_IDENTIFIERS) {
    // eslint-disable-next-line no-console
    console.log(`Identifiers: cache ${identifier ? 'HIT' : 'MISS'} - Non-Stable ${lid}`, resource);
  }
  return identifier || null;
}

function addResourceToCache(cache: StableCache, identifier: StableRecordIdentifier): void {
  cache.resources.set(identifier.lid, identifier);
  let typeSet = cache.resourcesByType[identifier.type];

  if (!typeSet) {
    typeSet = { lid: new Map(), id: new Map() };
    cache.resourcesByType[identifier.type] = typeSet;
  }

  typeSet.lid.set(identifier.lid, identifier);
  if (identifier.id) {
    typeSet.id.set(identifier.id, identifier);
  }
}
