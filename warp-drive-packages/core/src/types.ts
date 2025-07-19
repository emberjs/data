/**
 * This package provides core types, type-utilities, symbols
 * and constants used across the WarpDrive ecosystem.
 *
 * @module
 */
export type { ResourceKey as StableRecordIdentifier, ResourceKey } from './types/identifier.ts';

export type { CacheCapabilitiesManager } from './store/-types/q/cache-capabilities-manager.ts';
// FIXME this should come from somewhere more intelligent
export type { ModelSchema } from './store/deprecated/-private.ts';
export type { SchemaService } from './store/-types/q/schema-service.ts';
export type {
  BaseFinderOptions,
  FindRecordOptions,
  LegacyResourceQuery,
  QueryOptions,
  FindAllOptions,
} from './store/-types/q/store.ts';
