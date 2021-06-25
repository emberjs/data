import { assert } from '@ember/debug';

import { assertPolymorphicType } from '@ember-data/store/-debug';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';

import type { ReplaceRelatedRecordOperation } from '../-operations';
import { isBelongsTo, isNew } from '../-utils';
import type { Graph } from '../index';
import { addToInverse, removeFromInverse } from './replace-related-records';

export default function replaceRelatedRecord(graph: Graph, op: ReplaceRelatedRecordOperation, isRemote = false) {
  const relationship = graph.get(op.record, op.field);
  assert(
    `You can only '${op.op}' on a belongsTo relationship. ${op.record.type}.${op.field} is a ${relationship.definition.kind}`,
    isBelongsTo(relationship)
  );
  if (isRemote) {
    graph._addToTransaction(relationship);
  }
  const { definition, state } = relationship;
  const prop = isRemote ? 'remoteState' : 'localState';
  const existingState: StableRecordIdentifier | null = relationship[prop];

  /*
    case 1:1
    ========
    In a bi-directional graph with 1:1 edges, replacing a value
    results in up-to 4 discrete value transitions.

    If: A <-> B, C <-> D is the initial state,
    and: A <-> C, B, D is the final state

    then we would undergo the following 4 transitions.

    remove A from B
    add C to A
    remove C from D
    add A to C

    case 1:many
    ===========
    In a bi-directional graph with 1:Many edges, replacing a value
    results in up-to 3 discrete value transitions.

    If: A<->>B<<->D, C<<->D is the initial state (double arrows representing the many side)
    And: A<->>C<<->D, B<<->D is the final state

    Then we would undergo three transitions.

    remove A from B
    add C to A.
    add A to C

    case 1:?
    ========
    In a uni-directional graph with 1:? edges (modeled in EmberData with `inverse:null`) with
    artificial (implicit) inverses, replacing a value results in up-to 3 discrete value transitions.
    This is because a 1:? relationship is effectively 1:many.

    If: A->B, C->B is the initial state
    And: A->C, C->B is the final state

    Then we would undergo three transitions.

    Remove A from B
    Add C to A
    Add A to C
  */

  // nothing for us to do
  if (op.value === existingState) {
    // if we were empty before but now know we are empty this needs to be true
    state.hasReceivedData = true;
    // if this is a remote update we still sync
    if (isRemote) {
      const { localState } = relationship;
      // don't sync if localState is a new record and our canonicalState is null
      if ((localState && isNew(localState) && !existingState) || localState === existingState) {
        return;
      }
      relationship.localState = existingState;
      relationship.notifyBelongsToChange();
    }
    return;
  }

  // remove this value from the inverse if required
  if (existingState) {
    removeFromInverse(graph, existingState, definition.inverseKey, op.record, isRemote);
  }

  // update value to the new value
  relationship[prop] = op.value;
  state.hasReceivedData = true;
  state.isEmpty = op.value === null;
  state.isStale = false;
  state.hasFailedLoadAttempt = false;

  if (op.value) {
    if (definition.type !== op.value.type) {
      assertPolymorphicType(relationship.identifier, definition, op.value, graph.store);
      graph.registerPolymorphicType(definition.type, op.value.type);
    }
    addToInverse(graph, op.value, definition.inverseKey, op.record, isRemote);
  }

  if (isRemote) {
    const { localState, remoteState } = relationship;
    if (localState && isNew(localState) && !remoteState) {
      return;
    }
    if (localState !== remoteState) {
      relationship.localState = remoteState;
      relationship.notifyBelongsToChange();
    }
  } else {
    relationship.notifyBelongsToChange();
  }
}
