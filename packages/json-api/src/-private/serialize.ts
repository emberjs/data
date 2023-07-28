import { assert } from '@ember/debug';

import type { Cache } from '@ember-data/types/cache/cache';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource } from '@ember-data/types/q/record-data-json-api';

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

export function serializePatch(
  cache: Cache,
  identifier: StableRecordIdentifier
  // options: { include?: string[] } = {}
): { data: JsonApiResource } {
  const { id, lid, type } = identifier;
  const record = cache.peek(identifier) as JsonApiResource;
  assert(
    `A record with id ${String(id)} and type ${type} for lid ${lid} was not found not in the supplied Cache.`,
    record
  );

  const attrsChanges = cache.changedAttrs(identifier);
  const attributes = {};

  Object.keys(attrsChanges).forEach((key) => {
    const newVal = attrsChanges[key][1];
    attributes[key] = newVal === undefined ? null : newVal;
  });

  const data: JsonApiResource = {
    type,
    lid,
    id,
    attributes,
    // TODO we don't patch relationships yet ...
    // ... but we will as soon as we land the diff PR
  };

  return { data };
}
