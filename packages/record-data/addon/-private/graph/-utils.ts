import { assert, inspect, warn } from '@ember/debug';

import { LOG_GRAPH } from '@ember-data/private-build-infra/debugging';
import type { Store } from '@ember-data/store/-private';
import { recordDataFor as peekRecordData } from '@ember-data/store/-private';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordDataStoreWrapper } from '@ember-data/types/q/record-data-store-wrapper';
import type { Dict } from '@ember-data/types/q/utils';

import { coerceId } from '../coerce-id';
import type { UpdateRelationshipOperation } from './-operations';
import type { CollectionRelationship } from './edges/collection';
import type { ResourceRelationship } from './edges/resource';
import type { Graph, RelationshipEdge } from './graph';
import type { ImplicitRelationship } from './index';

export function getStore(wrapper: RecordDataStoreWrapper | { _store: Store }): Store {
  assert(`expected a private _store property`, '_store' in wrapper);
  return wrapper._store;
}

export function expandingGet<T>(cache: Dict<Dict<T>>, key1: string, key2: string): T | undefined {
  let mainCache = (cache[key1] = cache[key1] || Object.create(null));
  return mainCache[key2];
}

export function expandingSet<T>(cache: Dict<Dict<T>>, key1: string, key2: string, value: T): void {
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
  const recordData = peekRecordData(identifier);
  return Boolean(recordData?.isNew(identifier));
}

export function isBelongsTo(relationship: RelationshipEdge): relationship is ResourceRelationship {
  return relationship.definition.kind === 'belongsTo';
}

export function isImplicit(relationship: RelationshipEdge): relationship is ImplicitRelationship {
  return relationship.definition.isImplicit;
}

export function isHasMany(relationship: RelationshipEdge): relationship is CollectionRelationship {
  return relationship.definition.kind === 'hasMany';
}

export function forAllRelatedIdentifiers(
  rel: RelationshipEdge,
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
  relationship: RelationshipEdge,
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

export function assertRelationshipData(store, identifier, data, meta) {
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
    }:${identifier.id}>, expected a json-api identifier with type '${meta.type}' but found '${JSON.stringify(
      data
    )}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || (typeof data.type === 'string' && data.type.length)
  );
  assert(
    `Encountered a relationship identifier without an id for the ${meta.kind} relationship '${meta.key}' on <${
      identifier.type
    }:${identifier.id}>, expected a json-api identifier but found '${JSON.stringify(
      data
    )}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || !!coerceId(data.id)
  );
  assert(
    `Encountered a relationship identifier with type '${data.type}' for the ${meta.kind} relationship '${meta.key}' on <${identifier.type}:${identifier.id}>, Expected a json-api identifier with type '${meta.type}'. No model was found for '${data.type}'.`,
    data === null || !data.type || store.getSchemaDefinitionService().doesTypeExist(data.type)
  );
}

// Handle dematerialization for relationship `rel`.  In all cases, notify the
// relationship of the dematerialization: this is done so the relationship can
// notify its inverse which needs to update state
//
// If the inverse is sync, unloading this record is treated as a client-side
// delete, so we remove the inverse records from this relationship to
// disconnect the graph.  Because it's not async, we don't need to keep around
// the identifier as an id-wrapper for references
export function destroyRelationship(graph: Graph, rel: RelationshipEdge, silenceNotifications?: boolean) {
  if (isImplicit(rel)) {
    if (graph.isReleasable(rel.identifier)) {
      removeCompletelyFromInverse(graph, rel);
    }
    return;
  }

  const { identifier } = rel;
  const { inverseKey } = rel.definition;

  if (!rel.definition.inverseIsImplicit) {
    forAllRelatedIdentifiers(rel, (inverseIdentifer: StableRecordIdentifier) =>
      notifyInverseOfDematerialization(graph, inverseIdentifer, inverseKey, identifier, silenceNotifications)
    );
  }

  if (!rel.definition.inverseIsImplicit && !rel.definition.inverseIsAsync) {
    rel.state.isStale = true;
    clearRelationship(rel);

    // necessary to clear relationships in the ui from dematerialized records
    // hasMany is managed by Model which calls `retreiveLatest` after
    // dematerializing the recordData instance.
    // but sync belongsTo requires this since they don't have a proxy to update.
    // so we have to notify so it will "update" to null.
    // we should discuss whether we still care about this, probably fine to just
    // leave the ui relationship populated since the record is destroyed and
    // internally we've fully cleaned up.
    if (!rel.definition.isAsync && !silenceNotifications) {
      notifyChange(graph, rel.identifier, rel.definition.key);
    }
  }
}

function notifyInverseOfDematerialization(
  graph: Graph,
  inverseIdentifier: StableRecordIdentifier,
  inverseKey: string,
  identifier: StableRecordIdentifier,
  silenceNotifications?: boolean
) {
  if (!graph.has(inverseIdentifier, inverseKey)) {
    return;
  }

  let relationship = graph.get(inverseIdentifier, inverseKey);
  assert(`expected no implicit`, !isImplicit(relationship));

  // For remote members, it is possible that inverseRecordData has already been associated to
  // to another record. For such cases, do not dematerialize the inverseRecordData
  if (!isBelongsTo(relationship) || !relationship.localState || identifier === relationship.localState) {
    removeDematerializedInverse(
      graph,
      relationship as ResourceRelationship | CollectionRelationship,
      identifier,
      silenceNotifications
    );
  }
}

function clearRelationship(relationship: ResourceRelationship | CollectionRelationship) {
  if (isBelongsTo(relationship)) {
    relationship.localState = null;
    relationship.remoteState = null;
    relationship.state.hasReceivedData = false;
    relationship.state.isEmpty = true;
  } else {
    relationship.localMembers.clear();
    relationship.remoteMembers.clear();
    relationship.localState = [];
    relationship.remoteState = [];
  }
}

function removeDematerializedInverse(
  graph: Graph,
  relationship: CollectionRelationship | ResourceRelationship,
  inverseIdentifier: StableRecordIdentifier,
  silenceNotifications?: boolean
) {
  if (isBelongsTo(relationship)) {
    const inverseIdentifier = relationship.localState;
    if (!relationship.definition.isAsync || (inverseIdentifier && isNew(inverseIdentifier))) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      if (relationship.localState === inverseIdentifier && inverseIdentifier !== null) {
        relationship.localState = null;
      }

      if (relationship.remoteState === inverseIdentifier && inverseIdentifier !== null) {
        relationship.remoteState = null;
        relationship.state.hasReceivedData = true;
        relationship.state.isEmpty = true;
        if (relationship.localState && !isNew(relationship.localState)) {
          relationship.localState = null;
        }
      }
    } else {
      relationship.state.hasDematerializedInverse = true;
    }

    if (!silenceNotifications) {
      notifyChange(graph, relationship.identifier, relationship.definition.key);
    }
  } else {
    if (!relationship.definition.isAsync || (inverseIdentifier && isNew(inverseIdentifier))) {
      // unloading inverse of a sync relationship is treated as a client-side
      // delete, so actually remove the models don't merely invalidate the cp
      // cache.
      // if the record being unloaded only exists on the client, we similarly
      // treat it as a client side delete
      removeIdentifierCompletelyFromRelationship(graph, relationship, inverseIdentifier);
    } else {
      relationship.state.hasDematerializedInverse = true;
    }

    if (!silenceNotifications) {
      notifyChange(graph, relationship.identifier, relationship.definition.key);
    }
  }
}

export function removeCompletelyFromInverse(graph: Graph, relationship: RelationshipEdge) {
  const { identifier } = relationship;
  const { inverseKey } = relationship.definition;

  forAllRelatedIdentifiers(relationship, (inverseIdentifier: StableRecordIdentifier) => {
    if (graph.has(inverseIdentifier, inverseKey)) {
      removeIdentifierCompletelyFromRelationship(graph, graph.get(inverseIdentifier, inverseKey), identifier);
    }
  });

  if (isBelongsTo(relationship)) {
    if (!relationship.definition.isAsync) {
      clearRelationship(relationship);
    }

    relationship.localState = null;
  } else if (isHasMany(relationship)) {
    if (!relationship.definition.isAsync) {
      clearRelationship(relationship);

      notifyChange(graph, relationship.identifier, relationship.definition.key);
    }
  } else {
    relationship.remoteMembers.clear();
    relationship.localMembers.clear();
  }
}
