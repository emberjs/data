import { assert, inspect, warn } from '@ember/debug';

import { LOG_GRAPH } from '@ember-data/debugging';
import type { Store } from '@ember-data/store/-private';
import { peekCache } from '@ember-data/store/-private';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';
import { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { UpgradedMeta } from './-edge-definition';
import type { UpdateRelationshipOperation } from './-operations';
import { coerceId } from './coerce-id';
import type { Graph, GraphEdge, ImplicitRelationship } from './graph';
import type ManyRelationship from './state/has-many';
import { ResourceEdge } from './edges/resource';

export function getStore(wrapper: CacheCapabilitiesManager | { _store: Store }): Store {
  assert(`expected a private _store property`, '_store' in wrapper);
  return wrapper._store;
}

export function expandingGet<T>(cache: Record<string, Record<string, T>>, key1: string, key2: string): T | undefined {
  let mainCache = (cache[key1] = cache[key1] || Object.create(null));
  return mainCache[key2];
}

export function expandingSet<T>(cache: Record<string, Record<string, T>>, key1: string, key2: string, value: T): void {
  let mainCache = (cache[key1] = cache[key1] || Object.create(null));
  mainCache[key2] = value;
}

export function assertValidRelationshipPayload(graph: Graph, op: UpdateRelationshipOperation) {
  const relationship = graph.get(op.record, op.field);
  assert(`Cannot update an implicit relationship`, isHasMany(relationship) || isBelongsTo(relationship));
  const payload = op.value;
  const { definition, identifier, state } = relationship;
  const { type } = identifier;
  const { field } = op;
  const { isAsync, kind } = definition;

  if (payload.links) {
    warn(
      `You pushed a record of type '${type}' with a relationship '${field}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty.`,
      isAsync || !!payload.data || state.hasReceivedData,
      {
        id: 'ds.store.push-link-for-sync-relationship',
      }
    );
  } else if (payload.data) {
    if (kind === 'belongsTo') {
      assert(
        `A ${type} record was pushed into the store with the value of ${field} being ${inspect(
          payload.data
        )}, but ${field} is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`,
        !Array.isArray(payload.data)
      );
      assertRelationshipData(getStore(graph.store), identifier, payload.data, definition);
    } else if (kind === 'hasMany') {
      assert(
        `A ${type} record was pushed into the store with the value of ${field} being '${inspect(
          payload.data
        )}', but ${field} is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.`,
        Array.isArray(payload.data)
      );
      if (Array.isArray(payload.data)) {
        for (let i = 0; i < payload.data.length; i++) {
          assertRelationshipData(getStore(graph.store), identifier, payload.data[i], definition);
        }
      }
    }
  }
}

export function isNew(identifier: StableRecordIdentifier): boolean {
  if (!identifier.id) {
    return true;
  }
  const cache = peekCache(identifier);
  return Boolean(cache?.isNew(identifier));
}

export function isBelongsTo(
  relationship: GraphEdge
): relationship is ResourceEdge {
  return relationship.definition.kind === 'belongsTo';
}

export function isImplicit(
  relationship: GraphEdge
): relationship is ImplicitRelationship {
  return relationship.definition.isImplicit;
}

export function isHasMany(
  relationship: GraphEdge
): relationship is ManyRelationship {
  return relationship.definition.kind === 'hasMany';
}

export function forAllRelatedIdentifiers(
  rel: GraphEdge,
  cb: (identifier: StableRecordIdentifier) => void
): void {
  if (isBelongsTo(rel)) {
    if (rel.remoteState) {
      cb(rel.remoteState);
    }
    if (rel.localState && rel.localState !== rel.remoteState) {
      cb(rel.localState);
    }
  } else if (isHasMany(rel)) {
    // ensure we don't walk anything twice if an entry is
    // in both localMembers and remoteMembers
    let seen = new Set();

    for (let i = 0; i < rel.localState.length; i++) {
      const inverseIdentifier = rel.localState[i];
      if (!seen.has(inverseIdentifier)) {
        seen.add(inverseIdentifier);
        cb(inverseIdentifier);
      }
    }

    for (let i = 0; i < rel.remoteState.length; i++) {
      const inverseIdentifier = rel.remoteState[i];
      if (!seen.has(inverseIdentifier)) {
        seen.add(inverseIdentifier);
        cb(inverseIdentifier);
      }
    }
  } else {
    let seen = new Set();
    rel.localMembers.forEach((inverseIdentifier) => {
      if (!seen.has(inverseIdentifier)) {
        seen.add(inverseIdentifier);
        cb(inverseIdentifier);
      }
    });
    rel.remoteMembers.forEach((inverseIdentifier) => {
      if (!seen.has(inverseIdentifier)) {
        seen.add(inverseIdentifier);
        cb(inverseIdentifier);
      }
    });
  }
}

/*
  Removes the given identifier from BOTH remote AND local state.

  This method is useful when either a deletion or a rollback on a new record
  needs to entirely purge itself from an inverse relationship.
  */
export function removeIdentifierCompletelyFromRelationship(
  graph: Graph,
  relationship: GraphEdge,
  value: StableRecordIdentifier,
  silenceNotifications?: boolean
): void {
  if (isBelongsTo(relationship)) {
    if (relationship.remoteState === value) {
      relationship.remoteState = null;
    }

    if (relationship.localState === value) {
      relationship.localState = null;
      // This allows dematerialized inverses to be rematerialized
      // we shouldn't be notifying here though, figure out where
      // a notification was missed elsewhere.
      if (!silenceNotifications) {
        notifyChange(graph, relationship.identifier, relationship.definition.key);
      }
    }
  } else if (isHasMany(relationship)) {
    relationship.remoteMembers.delete(value);
    relationship.localMembers.delete(value);

    const canonicalIndex = relationship.remoteState.indexOf(value);
    if (canonicalIndex !== -1) {
      relationship.remoteState.splice(canonicalIndex, 1);
    }

    const currentIndex = relationship.localState.indexOf(value);
    if (currentIndex !== -1) {
      relationship.localState.splice(currentIndex, 1);
      // This allows dematerialized inverses to be rematerialized
      // we shouldn't be notifying here though, figure out where
      // a notification was missed elsewhere.
      if (!silenceNotifications) {
        notifyChange(graph, relationship.identifier, relationship.definition.key);
      }
    }
  } else {
    relationship.remoteMembers.delete(value);
    relationship.localMembers.delete(value);
  }
}

// TODO add silencing at the graph level
export function notifyChange(graph: Graph, identifier: StableRecordIdentifier, key: string) {
  if (identifier === graph._removing) {
    if (LOG_GRAPH) {
      // eslint-disable-next-line no-console
      console.log(`Graph: ignoring relationship change for removed identifier ${String(identifier)} ${key}`);
    }
    return;
  }
  if (LOG_GRAPH) {
    // eslint-disable-next-line no-console
    console.log(`Graph: notifying relationship change for ${String(identifier)} ${key}`);
  }

  graph.store.notifyChange(identifier, 'relationships', key);
}

export function assertRelationshipData(
  store: Store,
  identifier: StableRecordIdentifier,
  data: ResourceIdentifierObject,
  meta: UpgradedMeta
) {
  assert(
    `A ${identifier.type} record was pushed into the store with the value of ${meta.key} being '${JSON.stringify(
      data
    )}', but ${
      meta.key
    } is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`,
    !Array.isArray(data)
  );
  assert(
    `Encountered a relationship identifier without a type for the ${meta.kind} relationship '${meta.key}' on <${
      identifier.type
    }:${String(identifier.id)}>, expected an identifier with type '${meta.type}' but found\n\n'${JSON.stringify(
      data,
      null,
      2
    )}'\n\nPlease check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || ('type' in data && typeof data.type === 'string' && data.type.length)
  );
  assert(
    `Encountered a relationship identifier without an id for the ${meta.kind} relationship '${meta.key}' on <${
      identifier.type
    }:${String(identifier.id)}>, expected an identifier but found\n\n'${JSON.stringify(
      data,
      null,
      2
    )}'\n\nPlease check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || !!coerceId(data.id)
  );
  if (data?.type === meta.type) {
    assert(
      `Missing Schema: Encountered a relationship identifier { type: '${data.type}', id: '${String(
        data.id
      )}' } for the '${identifier.type}.${meta.key}' ${meta.kind} relationship on <${identifier.type}:${String(
        identifier.id
      )}>, but no schema exists for that type.`,
      store.getSchemaDefinitionService().doesTypeExist(data.type)
    );
  } else {
    assert(
      `Missing Schema: Encountered a relationship identifier with type '${data.type}' for the ${
        meta.kind
      } relationship '${meta.key}' on <${identifier.type}:${String(
        identifier.id
      )}>, Expected an identifier with type '${meta.type}'. No schema was found for '${data.type}'.`,
      data === null || !data.type || store.getSchemaDefinitionService().doesTypeExist(data.type)
    );
  }
}
