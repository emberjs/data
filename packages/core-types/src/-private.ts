// in testing mode, we utilize globals to ensure only one copy exists of
// these maps, due to bugs in ember-auto-import
import { DEBUG, TESTING } from '@warp-drive/build-config/env';

import { name, version } from '../package.json';

type UniversalTransientKey =
  // @ember-data/request
  'REQ_ID';

type UniversalKey =
  | `(transient) ${UniversalTransientKey}`
  // @ember-data/request
  | 'RequestMap'
  | 'PromiseCache'
  | 'RequestCache'
  // @warp-drive/core-types/request
  | 'SkipCache'
  | 'EnableHydration'
  // @warp-drive/core-types/runtime
  | 'WarpDriveRuntimeConfig';

type TransientKey =
  // @ember-data/tracking
  | 'TRANSACTION'
  // @ember-data/graph
  | 'transactionRef'
  // @ember-data/store
  | 'configuredGenerationMethod'
  | 'configuredUpdateMethod'
  | 'configuredForgetMethod'
  | 'configuredResetMethod'
  | 'configuredKeyInfoMethod';

type GlobalKey =
  | `(transient) ${TransientKey}`
  // @ember-data/adapter
  | 'AdapterError'
  | 'InvalidError'
  | 'TimeoutError'
  | 'AbortError'
  | 'UnauthorizedError'
  | 'ForbiddenError'
  | 'NotFoundError'
  | 'ConflictError'
  | 'ServerError'
  // @ember-data/tracking
  | 'Signals'
  // @ember-data/store LegacySupport
  | 'AvailableShims'
  // @ember-data/store RecordArrayManager
  | 'FAKE_ARR'
  // @ember-data/store IdentifierArray
  | '#signal'
  | '#source'
  | '#update'
  | '#notify'
  | 'IS_COLLECTION'
  // @ember-data/store RequestCache
  | 'Touching'
  | 'RequestPromise'
  // @ember-data/legacy-compat FetchManager
  | 'SaveOp'
  // @ember-data/model
  | 'LEGACY_SUPPORT'
  | 'LegacySupport'
  // @ember-data/graph
  | 'Graphs'
  // @ember-data/request
  | 'IS_FROZEN'
  | 'IS_CACHE_HANDLER'
  // @ember-data/request-utils
  | 'CONFIG'
  // @ember-data/store IdentityCache
  | 'DEBUG_MAP'
  | 'IDENTIFIERS'
  | 'DOCUMENTS'
  // @ember-data/store InstanceCache
  | 'CacheForIdentifierCache'
  | 'RecordCache'
  | 'StoreMap'
  // @warp-drive/core-types/symbols
  | 'Store'
  | '$type'
  | 'TransformName'
  | 'RequestSignature'
  // @warp-drive/core-types/request
  | 'IS_FUTURE'
  | 'DOC'
  // @warp-drive/schema-record
  | 'ManagedArrayMap'
  | 'ManagedObjectMap'
  | 'Support'
  | 'SOURCE'
  | 'MUTATE'
  | 'ARRAY_SIGNAL'
  | 'OBJECT_SIGNAL'
  | 'Destroy'
  | 'Identifier'
  | 'Editable'
  | 'EmbeddedPath'
  | 'EmbeddedType'
  | 'Parent'
  | 'Checkout'
  | 'Legacy';

type ModuleScopedCaches = Record<GlobalKey, unknown>;

const GlobalRef = globalThis as unknown as Record<
  string,
  {
    __warpDrive_ModuleScopedCaches?: ModuleScopedCaches;
    __warpDrive_hasOtherCopy?: boolean;
    __version: string;
  }
> & {
  __warpDrive_universalCache: Record<UniversalKey, unknown>;
};
const UniversalCache = (GlobalRef.__warpDrive_universalCache =
  GlobalRef.__warpDrive_universalCache ?? ({} as Record<UniversalKey, unknown>));

// in order to support mirror packages, we ensure that each
// unique package name has its own global cache
GlobalRef[name] = GlobalRef[name] ?? { __version: version };
const GlobalSink = GlobalRef[name];

if (DEBUG) {
  if (GlobalSink.__version !== version) {
    throw new Error('Multiple versions of WarpDrive detected, the application will malfunction.');
  }
}

const ModuleScopedCaches = GlobalSink.__warpDrive_ModuleScopedCaches ?? ({} as ModuleScopedCaches);
if (TESTING) {
  if (!GlobalSink.__warpDrive_ModuleScopedCaches) {
    GlobalSink.__warpDrive_ModuleScopedCaches = ModuleScopedCaches;
  } else {
    // eslint-disable-next-line no-console
    console.warn(`
Multiple copies of EmberData have been detected. This may be due to a bug in ember-auto-import
  in which test assets get their own copy of some v2-addons. This can cause the application to
  malfunction as each copy will maintain its own separate state.`);
  }
} else {
  if (GlobalSink.__warpDrive_hasOtherCopy) {
    throw new Error('Multiple copies of EmberData detected, the application will malfunction.');
  }
  GlobalSink.__warpDrive_hasOtherCopy = true;
}

type UniqueSymbol<T extends string> = `___(unique) Symbol(${T})`;
type UniqueSymbolOr<T, K extends string> = T extends symbol ? UniqueSymbol<K> : T;

export function getOrSetGlobal<T, K extends GlobalKey>(key: K, value: T): UniqueSymbolOr<T, K> {
  if (TESTING) {
    const existing = ModuleScopedCaches[key];
    if (existing === undefined) {
      return (ModuleScopedCaches[key] = value) as UniqueSymbolOr<T, K>;
    } else {
      return existing as UniqueSymbolOr<T, K>;
    }
  } else {
    return value as UniqueSymbolOr<T, K>;
  }
}

export function peekTransient<T>(key: TransientKey): T | null {
  const globalKey: `(transient) ${TransientKey}` = `(transient) ${key}`;
  return (ModuleScopedCaches[globalKey] as T) ?? null;
}

export function setTransient<T>(key: TransientKey, value: T): T {
  const globalKey: `(transient) ${TransientKey}` = `(transient) ${key}`;
  return (ModuleScopedCaches[globalKey] = value);
}

export function getOrSetUniversal<T, K extends UniversalKey>(key: K, value: T): UniqueSymbolOr<T, K> {
  if (TESTING) {
    const existing = UniversalCache[key];
    if (existing === undefined) {
      return (UniversalCache[key] = value) as UniqueSymbolOr<T, K>;
    } else {
      return existing as UniqueSymbolOr<T, K>;
    }
  } else {
    return value as UniqueSymbolOr<T, K>;
  }
}

export function peekUniversalTransient<T>(key: UniversalTransientKey): T | null {
  const globalKey: `(transient) ${UniversalTransientKey}` = `(transient) ${key}`;
  return (UniversalCache[globalKey] as T) ?? null;
}

export function setUniversalTransient<T>(key: UniversalTransientKey, value: T): T {
  const globalKey: `(transient) ${UniversalTransientKey}` = `(transient) ${key}`;
  return (UniversalCache[globalKey] = value);
}
