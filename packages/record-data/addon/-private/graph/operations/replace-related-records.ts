import { assert } from '@ember/debug';

import { assertPolymorphicType } from '@ember-data/store/-debug';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { diffCollection } from '../-diff';
import type { ReplaceRelatedRecordsOperation } from '../-operations';
import { isBelongsTo, isHasMany, notifyChange } from '../-utils';
import type { CollectionRelationship } from '../edges/collection';
import type { Graph } from '../graph';

/*
    case many:1
    ========
    In a bi-directional graph with Many:1 edges, adding a value
    results in up-to 3 discrete value transitions, while removing
    a value is only 2 transitions.

    For adding C to A
    If: A <<-> B, C <->> D is the initial state,
    and: B <->> A <<-> C, D is the final state

    then we would undergo the following transitions.

    add C to A
    remove C from D
    add A to C

    For removing B from A
    If: A <<-> B, C <->> D is the initial state,
    and: A, B, C <->> D is the final state

    then we would undergo the following transitions.

    remove B from A
    remove A from B

    case many:many
    ===========
    In a bi-directional graph with Many:Many edges, adding or
    removing a value requires only 2 value transitions.

    For Adding
    If: A<<->>B, C<<->>D is the initial state (double arrows representing the many side)
    And: D<<->>C<<->>A<<->>B is the final state

    Then we would undergo two transitions.

    add C to A.
    add A to C

    For Removing
    If: A<<->>B, C<<->>D is the initial state (double arrows representing the many side)
    And: A, B, C<<->>D is the final state

    Then we would undergo two transitions.

    remove B from A
    remove A from B

    case many:?
    ========
    In a uni-directional graph with Many:? edges (modeled in EmberData with `inverse:null`) with
    artificial (implicit) inverses, replacing a value results in 2 discrete value transitions.
    This is because a Many:? relationship is effectively Many:Many.
  */
export default function replaceRelatedRecords(graph: Graph, op: ReplaceRelatedRecordsOperation, isRemote: boolean) {
  if (isRemote) {
    _replaceRelatedRecordsRemote(graph, op.record, op.field, op.value, isRemote);
  } else {
    replaceRelatedRecordsLocal(graph, op, isRemote);
  }
}

function replaceRelatedRecordsLocal(graph: Graph, op: ReplaceRelatedRecordsOperation, isRemote: false) {
  const relationship = graph.get(op.record, op.field);
  assert(`expected hasMany relationship`, isHasMany(relationship));
  relationship.state.hasReceivedData = true;
  const { additions, removals } = relationship;
  const { inverseKey, type } = relationship.definition;
  const { record } = op;

  const diff = diffCollection(
    op.value,
    relationship,
    (v) => {
      if (removals?.has(v) || !additions?.has(v)) {
        if (type !== v.type) {
          assertPolymorphicType(relationship.identifier, relationship.definition, v, graph.store);
          graph.registerPolymorphicType(type, v.type);
        }
        addToInverse(graph, v, inverseKey, record, isRemote);
      }
    },
    (v) => {
      if (additions?.has(v) || !removals?.has(v)) {
        removeFromInverse(graph, v, inverseKey, record, isRemote);
      }
    }
  );

  relationship.additions = diff.add;
  relationship.removals = diff.del;
  relationship.localState = diff.finalState;
  relationship.isDirty = false;

  notifyChange(graph, relationship.identifier, relationship.definition.key);
}

export function _replaceRelatedRecordsRemote(
  graph: Graph,
  record: StableRecordIdentifier,
  field: string,
  identifiers: StableRecordIdentifier[],
  isRemote: true
) {
  const relationship = graph.get(record, field);

  assert(
    `You can only 'replaceRelatedRecords' on a hasMany relationship. ${record.type}.${field} is a ${relationship.definition.kind}`,
    isHasMany(relationship)
  );
  graph._addToTransaction(relationship);
  relationship.state.hasReceivedData = true;

  // cache existing state
  const { type, inverseKey } = relationship.definition;

  const diff = diffCollection(
    identifiers,
    relationship,
    (v) => {
      if (type !== v.type) {
        assertPolymorphicType(relationship.identifier, relationship.definition, v, graph.store);
        graph.registerPolymorphicType(type, v.type);
      }
      addToInverse(graph, v, inverseKey, record, isRemote);
    },
    (v) => {
      removeFromInverse(graph, v, inverseKey, record, isRemote);
    }
  );

  relationship.remoteState = diff.finalState;
  relationship.remoteMembers = diff.finalSet;
  relationship._diff = diff;
  relationship.isDirty = true;

  // TODO in theory if we have not changed we should not flush here
  // but historically we did. Can we change this now?
  graph._scheduleLocalSync(relationship);
}

export function addToInverse(
  graph: Graph,
  identifier: StableRecordIdentifier,
  key: string,
  value: StableRecordIdentifier,
  isRemote: boolean
) {
  const relationship = graph.get(identifier, key);
  const { type } = relationship.definition;

  if (type !== value.type) {
    assertPolymorphicType(relationship.identifier, relationship.definition, value, graph.store);
    graph.registerPolymorphicType(type, value.type);
  }

  if (isBelongsTo(relationship)) {
    relationship.state.hasReceivedData = true;
    relationship.state.isEmpty = false;

    if (isRemote) {
      graph._addToTransaction(relationship);
      if (relationship.remoteState !== null) {
        removeFromInverse(graph, relationship.remoteState, relationship.definition.inverseKey, identifier, isRemote);
      }
      relationship.remoteState = value;
    }

    if (relationship.localState !== value) {
      if (!isRemote && relationship.localState) {
        removeFromInverse(graph, relationship.localState, relationship.definition.inverseKey, identifier, isRemote);
      }
      relationship.localState = value;
      notifyChange(graph, relationship.identifier, relationship.definition.key);
    }
  } else if (isHasMany(relationship)) {
    if (isRemote) {
      if (!relationship.remoteMembers.has(value)) {
        graph._addToTransaction(relationship);
        relationship.remoteState.push(value);
        relationship.remoteMembers.add(value);
        relationship.state.hasReceivedData = true;
        relationship.isDirty = true;
        graph._scheduleLocalSync(relationship);
      }
    } else {
      if (_add(graph, identifier, relationship, value)) {
        notifyChange(graph, relationship.identifier, relationship.definition.key);
      }
    }
  } else {
    if (isRemote) {
      if (!relationship.remoteMembers.has(value)) {
        relationship.remoteMembers.add(value);
        relationship.localMembers.add(value);
      }
    } else {
      if (!relationship.localMembers.has(value)) {
        relationship.localMembers.add(value);
      }
    }
  }
}

export function _add(
  graph: Graph,
  record: StableRecordIdentifier,
  relationship: CollectionRelationship,
  value: StableRecordIdentifier
): boolean {
  let { remoteMembers, additions, removals } = relationship;

  if (additions?.has(value)) {
    return false;
  }
  if (removals?.has(value)) {
    removals.delete(value);
    relationship.isDirty = true;
  } else if (remoteMembers.has(value)) {
    return false;
  } else {
    additions = additions || new Set();
    additions.add(value);
    relationship.additions = additions;
    relationship.isDirty = true;
  }

  const { type } = relationship.definition;
  if (type !== value.type) {
    assertPolymorphicType(record, relationship.definition, value, graph.store);
    graph.registerPolymorphicType(value.type, type);
  }
  return true;
}
export function _remove(relationship: CollectionRelationship, value: StableRecordIdentifier): boolean {
  let { remoteMembers, additions, removals } = relationship;

  if (removals?.has(value)) {
    return false;
  }
  if (additions?.has(value)) {
    additions.delete(value);
    relationship.isDirty = true;
  } else if (!remoteMembers.has(value)) {
    return false;
  } else {
    removals = removals || new Set();
    removals.add(value);
    relationship.removals = removals;
    relationship.isDirty = true;
  }
  return true;
}

export function notifyInverseOfPotentialMaterialization(
  graph: Graph,
  identifier: StableRecordIdentifier,
  key: string,
  value: StableRecordIdentifier,
  isRemote: boolean
) {
  const relationship = graph.get(identifier, key);
  if (isHasMany(relationship) && isRemote && relationship.remoteMembers.has(value)) {
    notifyChange(graph, relationship.identifier, relationship.definition.key);
  }
}

export function removeFromInverse(
  graph: Graph,
  identifier: StableRecordIdentifier,
  key: string,
  value: StableRecordIdentifier,
  isRemote: boolean
) {
  const relationship = graph.get(identifier, key);

  if (isBelongsTo(relationship)) {
    relationship.state.isEmpty = true;
    if (isRemote) {
      graph._addToTransaction(relationship);
      relationship.remoteState = null;
    }
    if (relationship.localState === value) {
      relationship.localState = null;

      notifyChange(graph, identifier, key);
    }
  } else if (isHasMany(relationship)) {
    if (_remove(relationship, value)) {
      notifyChange(graph, relationship.identifier, relationship.definition.key);
    }
  } else {
    if (isRemote) {
      relationship.remoteMembers.delete(value);
      relationship.localMembers.delete(value);
    } else {
      if (value && relationship.localMembers.has(value)) {
        relationship.localMembers.delete(value);
      }
    }
  }
}

export function syncRemoteToLocal(graph: Graph, rel: CollectionRelationship) {
  notifyChange(graph, rel.identifier, rel.definition.key);
}
