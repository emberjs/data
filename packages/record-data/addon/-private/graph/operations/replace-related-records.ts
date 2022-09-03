import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_NON_UNIQUE_PAYLOADS } from '@ember-data/private-build-infra/deprecations';
import { assertPolymorphicType } from '@ember-data/store/-debug';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { ReplaceRelatedRecordsOperation } from '../-operations';
import { isBelongsTo, isHasMany, isNew, notifyChange } from '../-utils';
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
  const identifiers = op.value;
  const relationship = graph.get(op.record, op.field);
  assert(`expected hasMany relationship`, isHasMany(relationship));
  relationship.state.hasReceivedData = true;

  // cache existing state
  const { localState, localMembers, definition } = relationship;
  const newValues = new Set(identifiers);
  const identifiersLength = identifiers.length;
  const newState = new Array(newValues.size);
  const newMembership = new Set<StableRecordIdentifier>();

  // wipe existing state
  relationship.localMembers = newMembership;
  relationship.localState = newState;

  const { type } = relationship.definition;

  let changed = false;

  const currentLength = localState.length;
  const iterationLength = currentLength > identifiersLength ? currentLength : identifiersLength;
  const equalLength = currentLength === identifiersLength;

  for (let i = 0, j = 0; i < iterationLength; i++) {
    let adv = false;
    if (i < identifiersLength) {
      const identifier = identifiers[i];
      // skip processing if we encounter a duplicate identifier in the array
      if (!newMembership.has(identifier)) {
        if (type !== identifier.type) {
          assertPolymorphicType(relationship.identifier, relationship.definition, identifier, graph.store);
          graph.registerPolymorphicType(type, identifier.type);
        }
        newState[j] = identifier;
        adv = true;
        newMembership.add(identifier);

        if (!localMembers.has(identifier)) {
          changed = true;
          addToInverse(graph, identifier, definition.inverseKey, op.record, isRemote);
        }
      }
    }
    if (i < currentLength) {
      const identifier = localState[i];

      // detect reordering
      if (!newMembership.has(identifier)) {
        if (equalLength && newState[i] !== identifier) {
          changed = true;
        }

        if (!newValues.has(identifier)) {
          changed = true;
          removeFromInverse(graph, identifier, definition.inverseKey, op.record, isRemote);
        }
      }
    }
    if (adv) {
      j++;
    }
  }

  if (changed) {
    notifyChange(graph, relationship.identifier, relationship.definition.key);
  }
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
  const { remoteState, remoteMembers, definition } = relationship;
  const newMembership = new Set<StableRecordIdentifier>();

  // wipe existing state
  relationship.remoteMembers = newMembership;
  relationship.remoteState = identifiers;

  const { type } = relationship.definition;

  let changed = false;
  for (let i = 0; i < identifiers.length; i++) {
    const identifier = identifiers[i];
    if (DEPRECATE_NON_UNIQUE_PAYLOADS) {
      if (!newMembership.has(identifier)) {
        if (type !== identifier.type) {
          assertPolymorphicType(relationship.identifier, relationship.definition, identifier, graph.store);
          graph.registerPolymorphicType(type, identifier.type);
        }
        newMembership.add(identifier);

        if (!remoteMembers.has(identifier)) {
          changed = true;
          addToInverse(graph, identifier, definition.inverseKey, record, isRemote);
        } else if (!changed) {
          // detect reordering
          if (i < remoteState.length && identifier !== remoteState[i]) {
            changed = true;
          }
        }
      } else {
        deprecate(`Expected all entries in the relationship to be unique, found duplicates`, false, {
          id: 'ember-data:deprecate-non-unique-relationship-entries',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.8', enabled: '4.8' },
        });
        // we have encountered a duplicate
        // TODO consider deprecating
        identifiers.splice(i, 1); // remove the duplicate
        i -= 1;
      }
    } else {
      assert(`Expected all entries in the relationship to be unique, found duplicates`, !newMembership.has(identifier));
      if (type !== identifier.type) {
        assertPolymorphicType(relationship.identifier, relationship.definition, identifier, graph.store);
        graph.registerPolymorphicType(type, identifier.type);
      }
      newMembership.add(identifier);

      if (!remoteMembers.has(identifier)) {
        changed = true;
        addToInverse(graph, identifier, definition.inverseKey, record, isRemote);
      } else if (!changed) {
        // detect reordering
        if (i < remoteState.length && identifier !== remoteState[i]) {
          changed = true;
        }
      }
    }
  }
  for (let i = 0; i < remoteState.length; i++) {
    const identifier = remoteState[i];

    if (!newMembership.has(identifier)) {
      changed = true;
      removeFromInverse(graph, identifier, definition.inverseKey, record, isRemote);
    }
  }

  if (changed) {
    graph._scheduleLocalSync(relationship);
  } else {
    // TODO in theory if we have not changed we should not flush here
    // but historically we did. Can we change this now?
    graph._scheduleLocalSync(relationship);
  }
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
        graph._scheduleLocalSync(relationship);
      }
    } else {
      if (!relationship.localMembers.has(value)) {
        relationship.localState.push(value);
        relationship.localMembers.add(value);
        relationship.state.hasReceivedData = true;
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
    if (isRemote) {
      graph._addToTransaction(relationship);
      let index = relationship.remoteState.indexOf(value);
      if (index !== -1) {
        relationship.remoteMembers.delete(value);
        relationship.remoteState.splice(index, 1);
      }
    }
    let index = relationship.localState.indexOf(value);
    if (index !== -1) {
      relationship.localMembers.delete(value);
      relationship.localState.splice(index, 1);
    }
    notifyChange(graph, relationship.identifier, relationship.definition.key);
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
  let toSet = rel.remoteState;
  let newRecordDatas = rel.localState.filter((recordData) => isNew(recordData) && toSet.indexOf(recordData) === -1);
  let existingState = rel.localState;
  rel.localState = toSet.concat(newRecordDatas);

  let localMembers = (rel.localMembers = new Set<StableRecordIdentifier>());
  rel.remoteMembers.forEach((v) => localMembers.add(v));
  for (let i = 0; i < newRecordDatas.length; i++) {
    localMembers.add(newRecordDatas[i]);
  }

  // TODO always notifying fails only one test and we should probably do away with it
  if (existingState.length !== rel.localState.length) {
    notifyChange(graph, rel.identifier, rel.definition.key);
  } else {
    for (let i = 0; i < existingState.length; i++) {
      if (existingState[i] !== rel.localState[i]) {
        notifyChange(graph, rel.identifier, rel.definition.key);
        break;
      }
    }
  }
}
