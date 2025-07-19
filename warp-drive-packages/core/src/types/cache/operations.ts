/**
 * {@link Cache} Operations perform updates to the
 * Cache's "remote" (or clean) state to reflect external
 * changes.
 *
 * Usually operations represent the result of a {@link WebSocket} or
 * {@link EventSource | ServerEvent} message, though they can also be used to carefully
 * patch the state of the cache with information known by the
 * application or developer.
 *
 * Operations are applied via {@link Cache.patch}.
 *
 * @module
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Cache } from '../cache.ts';
import type { StableDocumentIdentifier, StableExistingRecordIdentifier, ResourceKey } from '../identifier.ts';
import type { Value } from '../json/raw.ts';
import type { ExistingResourceObject } from '../spec/json-api-raw.ts';
import type { Relationship } from './relationship.ts';

/**
 * All operations are objects with at least one property,
 * `op` which contains a string with the name of the operation
 * to perform.
 */
export interface Op {
  /**
   * The name of the {@link Op | operation}
   */
  op: string;
}

/**
 * Occasionally the Store discovers that two previously
 * thought to be distinct resources refer to the same resource.
 *
 * This operation will be performed, giving the Cache the chance
 * to cleanup and merge internal state as desired when this discovery
 * is made.
 */
export interface MergeOperation extends Op {
  op: 'mergeIdentifiers';
  /**
   * The stale {@link ResourceKey | ResourceKey} that
   * the cache should eliminate in favor of {@link MergeOperation.value | value}
   */
  record: ResourceKey;
  /**
   * The kept {@link ResourceKey | ResourceKey} that
   * the cache should also keep and merge {@link MergeOperation.record | record} into.
   */
  value: ResourceKey;
}

/**
 * Removes a document and its associated request from
 * the cache.
 */
export interface RemoveDocumentOperation extends Op {
  op: 'remove';
  /**
   * The cache key for the request
   */
  record: StableDocumentIdentifier;
}

/**
 * Removes a resource from the cache. This is treated
 * as if a remote deletion has occurred, and all references
 * to the resource should be eliminated.
 */
export interface RemoveResourceOperation extends Op {
  op: 'remove';
  /**
   * The cache key for the resource
   */
  record: StableExistingRecordIdentifier;
}

/**
 * Adds a resource to the cache.
 */
export interface AddResourceOperation extends Op {
  op: 'add';
  /**
   * The cache key for the resource
   */
  record: StableExistingRecordIdentifier;
  /**
   * The data for the resource
   */
  value: ExistingResourceObject;
}
/**
 * Upserts (merges) new state for a resource
 */
export interface UpdateResourceOperation extends Op {
  op: 'update';
  record: StableExistingRecordIdentifier;
  value: ExistingResourceObject;
}
/**
 * Replaces the state of a field with a new state
 */
export interface UpdateResourceFieldOperation extends Op {
  op: 'update';
  record: StableExistingRecordIdentifier;
  field: string;
  value: Value;
}
/**
 * Replaces the state of a relationship with a new state
 */
export interface UpdateResourceRelationshipOperation extends Op {
  op: 'update';
  record: StableExistingRecordIdentifier;
  field: string;
  value: Relationship<StableExistingRecordIdentifier>;
}

/**
 * Adds a resource to a request document, optionally
 * at a specific index. This can be used to update the
 * result of a request.
 */
export interface AddToDocumentOperation extends Op {
  op: 'add';
  record: StableDocumentIdentifier;
  field: 'data' | 'included';
  value: StableExistingRecordIdentifier | StableExistingRecordIdentifier[];
  index?: number;
}
/**
 * Adds the specified ResourceKeys to a relationship
 */
export interface AddToResourceRelationshipOperation extends Op {
  op: 'add';
  record: StableExistingRecordIdentifier;
  field: string;
  value: StableExistingRecordIdentifier | StableExistingRecordIdentifier[];
  index?: number;
}
/**
 * Removes the specified ResourceKeys from a relationship
 */
export interface RemoveFromResourceRelationshipOperation extends Op {
  op: 'remove';
  record: StableExistingRecordIdentifier;
  field: string;
  value: StableExistingRecordIdentifier | StableExistingRecordIdentifier[];
  index?: number;
}
/**
 * Removes a resource from a request document, optionally
 * at a specific index. This can be used to update the
 * result of a request.
 */
export interface RemoveFromDocumentOperation extends Op {
  op: 'remove';
  record: StableDocumentIdentifier;
  field: 'data' | 'included';
  value: StableExistingRecordIdentifier | StableExistingRecordIdentifier[];
  index?: number;
}

/**
 * {@link Cache} Operations perform updates to the
 * Cache's "remote" (or clean) state to reflect external
 * changes.
 *
 * Usually operations represent the result of a {@link WebSocket} or
 * {@link EventSource | ServerEvent} message, though they can also be used to carefully
 * patch the state of the cache with information known by the
 * application or developer.
 *
 * Operations are applied via {@link Cache.patch}.
 *
 * See also:
 * - {@link MergeOperation}
 * - {@link RemoveResourceOperation}
 * - {@link RemoveDocumentOperation}
 * - {@link AddResourceOperation}
 * - {@link UpdateResourceOperation}
 * - {@link UpdateResourceFieldOperation}
 * - {@link AddToResourceRelationshipOperation}
 * - {@link RemoveFromResourceRelationshipOperation}
 * - {@link AddToDocumentOperation}
 * - {@link RemoveFromDocumentOperation}
 */
export type Operation =
  | MergeOperation
  | RemoveResourceOperation
  | RemoveDocumentOperation
  | AddResourceOperation
  | UpdateResourceOperation
  | UpdateResourceFieldOperation
  | AddToResourceRelationshipOperation
  | RemoveFromResourceRelationshipOperation
  | AddToDocumentOperation
  | RemoveFromDocumentOperation;
