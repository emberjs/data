/**
 * @module @ember-data/json-api/request
 */
import { assert } from '@ember/debug';

import type { AttributesHash, JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { Relationship } from '@warp-drive/core-types/cache/relationship';
import type { Value } from '@warp-drive/core-types/json/raw';

type ChangedRelationshipData = {
  data: Relationship['data'];
};

export type JsonApiResourcePatch = {
  type: string;
  id: string | null;
  lid: string;
  attributes?: Record<string, Value>;
  relationships?: Record<string, ChangedRelationshipData>;
};

/**
 * Serializes the current state of a resource or array of resources for use with POST or PUT requests.
 *
 * @method serializeResources
 * @static
 * @public
 * @for @ember-data/json-api/request
 * @param {Cache} cache}
 * @param {StableRecordIdentifier} identifier
 * @returns {object} An object with a `data` property containing the serialized resource patch
 */
export function serializeResources(cache: Cache, identifiers: StableRecordIdentifier): { data: JsonApiResource };
export function serializeResources(cache: Cache, identifiers: StableRecordIdentifier[]): { data: JsonApiResource[] };
export function serializeResources(
  cache: Cache,
  identifiers: StableRecordIdentifier | StableRecordIdentifier[]
): { data: JsonApiResource | JsonApiResource[] } {
  return {
    data: Array.isArray(identifiers)
      ? identifiers.map((identifier) => _serializeResource(cache, identifier))
      : _serializeResource(cache, identifiers),
  };
}

function _serializeResource(cache: Cache, identifier: StableRecordIdentifier): JsonApiResource {
  const { id, lid, type } = identifier;
  // yup! this method actually does nothing. It's just here for the dev assertion
  // and to assist in providing a little sugar to the consuming app via the `serializeResources` utility
  const record = cache.peek(identifier) as JsonApiResource;
  assert(
    `A record with id ${String(id)} and type ${type} for lid ${lid} was not found not in the supplied Cache.`,
    record
  );

  return record;
}

/**
 * Serializes changes to a resource for use with PATCH requests.
 *
 * Only attributes which are changed are serialized.
 * Only relationships which are changed are serialized.
 *
 * Collection relationships serialize the collection as a whole.
 *
 * If you would like to serialize updates to a collection more granularly
 * (for instance, as operations) request the diff from the store and
 * serialize as desired:
 *
 * ```ts
 * const relationshipDiffMap = cache.changedRelationships(identifier);
 * ```
 *
 * @method serializePatch
 * @static
 * @public
 * @for @ember-data/json-api/request
 * @param {Cache} cache}
 * @param {StableRecordIdentifier} identifier
 * @returns {object} An object with a `data` property containing the serialized resource patch
 */
export function serializePatch(
  cache: Cache,
  identifier: StableRecordIdentifier
  // options: { include?: string[] } = {}
): { data: JsonApiResourcePatch } {
  const { id, lid, type } = identifier;
  const record = cache.peek(identifier) as JsonApiResource;
  assert(
    `A record with id ${String(id)} and type ${type} for lid ${lid} was not found not in the supplied Cache.`,
    record
  );

  const data: JsonApiResourcePatch = {
    type,
    lid,
    id,
  };

  if (cache.hasChangedAttrs(identifier)) {
    const attrsChanges = cache.changedAttrs(identifier);
    const attributes: AttributesHash = {};

    Object.keys(attrsChanges).forEach((key) => {
      const change = attrsChanges[key];
      const newVal = change[1] as Value | undefined;
      attributes[key] = newVal === undefined ? null : newVal;
    });

    data.attributes = attributes;
  }

  const changedRelationships = cache.changedRelationships(identifier);
  if (changedRelationships.size) {
    const relationships: Record<string, ChangedRelationshipData> = {};
    changedRelationships.forEach((diff, key) => {
      relationships[key] = { data: diff.localState };
    });

    data.relationships = relationships;
  }

  return { data };
}
