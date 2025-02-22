/**
 * @module @ember-data/json-api/request
 */
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { Relationship } from '@warp-drive/core-types/cache/relationship';
import type { Value } from '@warp-drive/core-types/json/raw';
import type { InnerRelationshipDocument, ResourceObject } from '@warp-drive/core-types/spec/json-api-raw';

type ChangedRelationshipData = InnerRelationshipDocument;

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
 * @return {object} An object with a `data` property containing the serialized resource patch
 */
export function serializeResources(cache: Cache, identifiers: StableRecordIdentifier): { data: ResourceObject };
export function serializeResources(cache: Cache, identifiers: StableRecordIdentifier[]): { data: ResourceObject[] };
export function serializeResources(
  cache: Cache,
  identifiers: StableRecordIdentifier | StableRecordIdentifier[]
): { data: ResourceObject | ResourceObject[] } {
  return {
    data: Array.isArray(identifiers)
      ? identifiers.map((identifier) => _serializeResource(cache, identifier))
      : _serializeResource(cache, identifiers),
  };
}

type SerializedRef =
  | {
      id: string;
      type: string;
    }
  | { id: null; lid: string; type: string };

function fixRef({
  id,
  lid,
  type,
}: { id: string; lid?: string; type: string } | { id: null; lid: string; type: string }): SerializedRef {
  if (id !== null) {
    return { id, type };
  }
  return { id, lid, type };
}

function fixRelData(
  rel: Relationship['data'] | InnerRelationshipDocument['data']
): SerializedRef | SerializedRef[] | null {
  if (Array.isArray(rel)) {
    return rel.map((ref) => fixRef(ref));
  } else if (typeof rel === 'object' && rel !== null) {
    return fixRef(rel);
  }
  return null;
}

function _serializeResource(cache: Cache, identifier: StableRecordIdentifier): ResourceObject {
  const { id, lid, type } = identifier;
  // peek gives us everything we want, but since its referentially the same data
  // as is in the cache we clone it to avoid any accidental mutations
  const record = structuredClone(cache.peek(identifier)) as ResourceObject;
  assert(
    `A record with id ${String(id)} and type ${type} for lid ${lid} was not found not in the supplied Cache.`,
    record
  );

  // remove lid from anything that has an ID and slice any relationship arrays
  if (record.id !== null) {
    delete record.lid;
  }

  if (record.relationships) {
    for (const key of Object.keys(record.relationships)) {
      const relationship = record.relationships[key];
      relationship.data = fixRelData(relationship.data);
      if (Array.isArray(relationship.data)) {
        relationship.data = relationship.data.map((ref) => fixRef(ref));
      } else if (typeof relationship.data === 'object' && relationship.data !== null) {
        relationship.data = fixRef(relationship.data);
      }
    }
  }

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
 * @return {object} An object with a `data` property containing the serialized resource patch
 */
export function serializePatch(
  cache: Cache,
  identifier: StableRecordIdentifier
  // options: { include?: string[] } = {}
): { data: JsonApiResourcePatch } {
  const { id, lid, type } = identifier;
  assert(
    `A record with id ${String(id)} and type ${type} for lid ${lid} was not found not in the supplied Cache.`,
    cache.peek(identifier)
  );

  const data: JsonApiResourcePatch = {
    type,
    lid,
    id,
  };

  if (cache.hasChangedAttrs(identifier)) {
    const attrsChanges = cache.changedAttrs(identifier);
    const attributes: ResourceObject['attributes'] = {};

    Object.keys(attrsChanges).forEach((key) => {
      const change = attrsChanges[key];
      const newVal = change[1];
      attributes[key] = newVal === undefined ? null : structuredClone(newVal);
    });

    data.attributes = attributes;
  }

  const changedRelationships = cache.changedRelationships(identifier);
  if (changedRelationships.size) {
    const relationships: Record<string, ChangedRelationshipData> = {};
    changedRelationships.forEach((diff, key) => {
      relationships[key] = { data: fixRelData(diff.localState) } as ChangedRelationshipData;
    });

    data.relationships = relationships;
  }

  return { data };
}
