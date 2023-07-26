/**
  @module @ember-data/store
*/
import { assert, warn } from '@ember/debug';

import { getOwnConfig, macroCondition } from '@embroider/macros';

import { LOG_IDENTIFIERS } from '@ember-data/debugging';
import { DEBUG } from '@ember-data/env';
import { ImmutableRequestInfo } from '@ember-data/request/-private/types';
import { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import type { ExistingResourceObject, ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import type {
  ForgetMethod,
  GenerationMethod,
  Identifier,
  IdentifierBucket,
  RecordIdentifier,
  ResetMethod,
  ResourceData,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
  UpdateMethod,
} from '@ember-data/types/q/identifier';

import coerceId, { ensureStringId } from '../utils/coerce-id';
import { DEBUG_CLIENT_ORIGINATED, DEBUG_IDENTIFIER_BUCKET } from '../utils/identifier-debug-consts';
import normalizeModelName from '../utils/normalize-model-name';
import installPolyfill from '../utils/uuid-polyfill';

const IDENTIFIERS = new Set();
const DOCUMENTS = new Set();

export function isStableIdentifier(identifier: unknown): identifier is StableRecordIdentifier {
  return IDENTIFIERS.has(identifier);
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

type IdentifierTypeLookup = { all: Set<StableRecordIdentifier>; id: Map<string, StableRecordIdentifier> };
type IdentifiersByType = Map<string, IdentifierTypeLookup>;
type IdentifierMap = Map<string, StableRecordIdentifier>;
type KeyInfo = {
  id: string | null;
  type: string;
};
type StableCache = {
  resources: IdentifierMap;
  documents: Map<string, StableDocumentIdentifier>;
  resourcesByType: IdentifiersByType;
};

type KeyInfoMethod = (resource: unknown, known: StableRecordIdentifier) => KeyInfo;

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

export function setKeyInfoForResource(method: KeyInfoMethod | null): void {
  configuredKeyInfoMethod = method;
}

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

function assertIsRequest(request: unknown): asserts request is ImmutableRequestInfo {
  return;
}

function defaultKeyInfoMethod(resource: unknown, known: StableRecordIdentifier | null): KeyInfo {
  // TODO RFC something to make this configurable
  const id = hasId(resource) ? coerceId(resource.id) : null;
  const type = hasType(resource) ? normalizeModelName(resource.type) : known ? known.type : null;

  assert(`Expected keyInfoForResource to provide a type for the resource`, type);

  return { type, id };
}

// Map<type, Map<id, lid>>
type TypeIdMap = Map<string, Map<string, string>>;
const NEW_IDENTIFIERS: TypeIdMap = new Map();

function updateTypeIdMapping(typeMap: TypeIdMap, identifier: StableRecordIdentifier, id: string): void {
  let idMap = typeMap.get(identifier.type);
  if (!idMap) {
    idMap = new Map();
    typeMap.set(identifier.type, idMap);
  }
  idMap.set(id, identifier.lid);
}

function defaultUpdateMethod(identifier: StableRecordIdentifier, data: ResourceData, bucket: IdentifierBucket): void {
  if (bucket === 'record') {
    if (!identifier.id && hasId(data)) {
      updateTypeIdMapping(NEW_IDENTIFIERS, identifier, data.id);
    }
  }
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

  constructor() {
    this._cache = {
      resources: new Map(),
      documents: new Map(),
      resourcesByType: new Map(),
    };

    // we cache the user configuredGenerationMethod at init because it must
    // be configured prior and is not allowed to be changed
    this._generate = configuredGenerationMethod || (defaultGenerationMethod as GenerationMethod);
    this._update = configuredUpdateMethod || defaultUpdateMethod;
    this._forget = configuredForgetMethod || defaultEmptyCallback;
    this._reset = configuredResetMethod || defaultEmptyCallback;
    this._merge = defaultEmptyCallback;
    this._keyInfoForResource = configuredKeyInfoMethod || defaultKeyInfoMethod;
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
  _getRecordIdentifier(resource: unknown, shouldGenerate: true): StableRecordIdentifier;
  _getRecordIdentifier(resource: unknown, shouldGenerate: false): StableRecordIdentifier | undefined;
  _getRecordIdentifier(resource: unknown, shouldGenerate: boolean = false): StableRecordIdentifier | undefined {
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
      }
      return resource;
    }

    let identifier: StableRecordIdentifier | undefined;

    // the resource exposes the unique identifier directly (non stable identifier)
    if (hasLid(resource)) {
      identifier = getIdentifierFromLid(this._cache, resource.lid, resource);

      if (identifier !== undefined) {
        return identifier;
      }
    }

    // the resource is unknown, ask the application to identify this data for us
    const lid = this._generate(resource, 'record');
    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: ${lid ? 'no ' : ''}lid ${lid ? lid + ' ' : ''}determined for resource`, resource);
    }

    identifier = getIdentifierFromLid(this._cache, lid, resource);
    if (identifier !== undefined) {
      if (LOG_IDENTIFIERS) {
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
      return identifier;
    }

    if (shouldGenerate === false) {
      return;
    }

    // if we still don't have an identifier, time to generate one
    const keyInfo = this._keyInfoForResource(resource, null);
    identifier = makeStableRecordIdentifier(keyInfo.id, keyInfo.type, lid, 'record', false);

    addResourceToCache(this._cache, identifier);

    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: generated ${identifier.lid} for resource type ${identifier.type}`, resource);

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
    Returns the DocumentIdentifier for the given Request, creates one if it does not yet exist.
    Returns `null` if the request does not have a `cacheKey` or `url`.

    @method getOrCreateDocumentIdentifier
    @param request
    @returns {StableDocumentIdentifier | null}
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
    @returns {StableRecordIdentifier}
    @public
  */
  getOrCreateRecordIdentifier(resource: ExistingResourceObject): StableExistingRecordIdentifier;
  getOrCreateRecordIdentifier(
    resource: ResourceIdentifierObject | Identifier | StableRecordIdentifier
  ): StableRecordIdentifier;
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

    // populate our unique table
    if (DEBUG) {
      if (this._cache.resources.has(identifier.lid)) {
        throw new Error(`The lid generated for the new record is not unique as it matches an existing identifier`);
      }
    }

    addResourceToCache(this._cache, identifier);

    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: created identifier ${identifier.lid} for newly generated resource`, data);
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
  updateRecordIdentifier(identifierObject: RecordIdentifier, data: unknown): StableRecordIdentifier {
    let identifier = this.getOrCreateRecordIdentifier(identifierObject);

    const keyInfo = this._keyInfoForResource(data, identifier);
    let existingIdentifier = detectMerge(this._cache, keyInfo, identifier, data);

    if (!existingIdentifier) {
      // If the incoming type does not match the identifier type, we need to create an identifier for the incoming
      // data so we can merge the incoming data with the existing identifier, see #7325 and #7363
      if (identifier.type !== keyInfo.type) {
        if (hasLid(data)) {
          // Strip the lid to ensure we force a new identifier creation
          delete data.lid;
        }
        existingIdentifier = this.getOrCreateRecordIdentifier(data);
      }
    }

    if (existingIdentifier) {
      let generatedIdentifier = identifier;
      identifier = this._mergeRecordIdentifiers(keyInfo, generatedIdentifier, existingIdentifier, data);
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

      const typeSet = this._cache.resourcesByType.get(identifier.type);
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

    // cleanup the identifier we no longer need
    this.forgetRecordIdentifier(abandoned);

    // ensure a secondary cache entry for this id for the identifier we do keep
    // keyOptions.id.set(newId, kept);

    // ensure a secondary cache entry for this id for the abandoned identifier's type we do keep
    // let baseKeyOptions = getTypeIndex(this._cache.types, existingIdentifier.type);
    // baseKeyOptions.id.set(newId, kept);

    // make sure that the `lid` on the data we are processing matches the lid we kept
    // @ts-expect-error TODO this needs to be fixed
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
    const identifier = this.getOrCreateRecordIdentifier(identifierObject);
    const typeSet = this._cache.resourcesByType.get(identifier.type);

    if (identifier.id !== null) {
      typeSet?.id.delete(identifier.id);
    }
    this._cache.resources.delete(identifier.lid);
    typeSet?.all.delete(identifier);

    IDENTIFIERS.delete(identifier);
    this._forget(identifier, 'record');

    if (LOG_IDENTIFIERS) {
      // eslint-disable-next-line no-console
      console.log(`Identifiers: released identifier ${identifier.lid}`);
    }
  }

  destroy() {
    this._cache.documents.forEach((identifier) => {
      DOCUMENTS.delete(identifier);
    });
    this._reset();
  }
}

function makeStableRecordIdentifier(
  _id: string | null,
  _type: string | null,
  _lid: string,
  bucket: IdentifierBucket,
  clientOriginated: boolean
): Readonly<StableRecordIdentifier> {
  let recordIdentifier = {
    lid: _lid,
    id: _id,
    type: _type,
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
        const { type, id, lid } = recordIdentifier;
        return `${clientOriginated ? '[CLIENT_ORIGINATED] ' : ''}${String(type)}:${String(id)} (${lid})`;
      },
      toJSON() {
        const { type, id, lid } = recordIdentifier;
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

function performRecordIdentifierUpdate(identifier: StableRecordIdentifier, data: unknown, updateFn: UpdateMethod) {
  if (DEBUG) {
    // @ts-expect-error TODO this needs to be fixed
    let { lid } = data;
    // @ts-expect-error TODO this needs to be fixed
    let id = 'id' in data ? data.id : undefined;
    // @ts-expect-error TODO this needs to be fixed
    let type = 'type' in data && data.type && normalizeModelName(data.type);

    // get the mutable instance behind our proxy wrapper
    let wrapper = identifier;
    identifier = DEBUG_MAP.get(wrapper);

    if (lid !== undefined) {
      let newLid = ensureStringId(lid);
      if (newLid !== identifier.lid) {
        throw new Error(
          `The 'lid' for a RecordIdentifier cannot be updated once it has been created. Attempted to set lid for '${wrapper.lid}' to '${lid}'.`
        );
      }
    }

    if (id !== undefined) {
      // @ts-expect-error TODO this needs to be fixed
      let newId = coerceId(id);

      if (identifier.id !== null && identifier.id !== newId) {
        // here we warn and ignore, as this may be a mistake, but we allow the user
        // to have multiple cache-keys pointing at a single lid so we cannot error
        warn(
          `The 'id' for a RecordIdentifier should not be updated once it has been set. Attempted to set id for '${
            wrapper.lid
          }' to '${String(newId)}'.`,
          false,
          { id: 'ember-data:multiple-ids-for-identifier' }
        );
      }
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
  const typeSet = cache.resourcesByType.get(identifier.type);

  // if the IDs are present but do not match
  // then check if we have an existing identifier
  // for the newer ID.
  if (id !== null && id !== newId && newId !== null) {
    const existingIdentifier = typeSet && typeSet.id.get(newId);

    return existingIdentifier !== undefined ? existingIdentifier : false;
  } else {
    const newType = keyInfo.type;

    // If the ids and type are the same but lid is not the same,
    // we throw an error
    // though maybe we should trigger a merge of the identifiers
    if (id !== null && id === newId && newType === type && data.lid && data.lid !== lid) {
      throw new Error(`WAT`);
      // let existingIdentifier = lids.get(data.lid);
      // return existingIdentifier !== undefined ? existingIdentifier : false;

      // If the lids are the same, and ids are the same
      // but types are different we should trigger a merge of the identifiers
    } else if (id !== null && id === newId && newType && newType !== type && data.lid && data.lid === lid) {
      const existingIdentifier = typeSet && typeSet.id.get(newId);

      return existingIdentifier !== undefined ? existingIdentifier : false;
    }
  }

  return false;
}

function hasProp(resource: unknown, prop: string): resource is { [prop]: string } {
  return Boolean(
    resource && prop in resource && typeof resource[prop] === 'string' && (resource[prop] as string).length
  );
}

function hasLid(resource: unknown): resource is { lid: string } {
  return hasProp(resource, 'lid');
}

function hasId(resource: unknown): resource is { id: string } {
  return hasProp(resource, 'id') || (resource && 'id' in resource && typeof resource.id === 'number');
}

function hasType(resource: unknown): resource is { type: string } {
  return hasProp(resource, 'type');
}

function getIdentifierFromLid(cache: StableCache, lid: string, resource: unknown): StableRecordIdentifier | undefined {
  const identifier = cache.resources.get(lid);
  if (LOG_IDENTIFIERS) {
    // eslint-disable-next-line no-console
    console.log(`Identifiers: cache ${identifier ? 'HIT' : 'MISS'} - Non-Stable ${lid}`, resource);
  }
  return identifier;
}

function addResourceToCache(cache: StableCache, identifier: StableRecordIdentifier): void {
  cache.resources.set(identifier.lid, identifier);
  let typeSet = cache.resourcesByType.get(identifier.type);

  if (!typeSet) {
    typeSet = { all: new Set(), id: new Map() };
    cache.resourcesByType.set(identifier.type, typeSet);
  }

  typeSet.all.add(identifier);
  if (identifier.id) {
    typeSet.id.set(identifier.id, identifier);
  }
}
