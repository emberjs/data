import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { ReplaceRelatedRecordOperation } from '@warp-drive/core-types/graph';

import { isBelongsTo, isNew, notifyChange } from '../-utils';
import { assertPolymorphicType } from '../debug/assert-polymorphic-type';
import type { Graph } from '../graph';
import { addToInverse, notifyInverseOfPotentialMaterialization, removeFromInverse } from './replace-related-records';

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
      // don't sync if localState is a new record and our remoteState is null
      if (localState && isNew(localState) && !existingState) {
        return;
      }
      if (existingState && localState === existingState) {
        notifyInverseOfPotentialMaterialization(graph, existingState, definition.inverseKey, op.record, isRemote);
      } else if (DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
        // if localState does not match existingState then we know
        // we have a local mutation that has not been persisted yet
        if (localState !== op.value && relationship.definition.resetOnRemoteUpdate !== false) {
          relationship.localState = existingState;

          deprecate(
            `EmberData is changing the default semantics of updates to the remote state of relationships.\n\nThe following local state was cleared from the <${
              relationship.identifier.type
            }>.${
              relationship.definition.key
            } belongsTo relationship but will not be once this deprecation is resolved:\n\n\t${
              localState ? 'Added: ' + localState.lid + '\n\t' : ''
            }${existingState ? 'Removed: ' + existingState.lid : ''}`,
            false,
            {
              id: 'ember-data:deprecate-relationship-remote-update-clearing-local-state',
              for: 'ember-data',
              since: { enabled: '5.3', available: '5.3' },
              until: '6.0',
              url: 'https://deprecations.emberjs.com/v5.x#ember-data-deprecate-relationship-remote-update-clearing-local-state',
            }
          );

          notifyChange(graph, relationship.identifier, relationship.definition.key);
        }
      }
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
      // assert(
      //   `The '<${definition.inverseType}>.${op.field}' relationship expects only '${definition.type}' records since it is not polymorphic. Received a Record of type '${op.value.type}'`,
      //   definition.isPolymorphic
      // );

      // TODO this should now handle the deprecation warning if isPolymorphic is not set
      // but the record does turn out to be polymorphic
      // this should still assert if the user is relying on legacy inheritance/mixins to
      // provide polymorphic behavior and has not yet added the polymorphic flags
      if (DEBUG) {
        assertPolymorphicType(relationship.identifier, definition, op.value, graph.store);
      }

      graph.registerPolymorphicType(definition.type, op.value.type);
    }
    addToInverse(graph, op.value, definition.inverseKey, op.record, isRemote);
  }

  if (isRemote) {
    const { localState, remoteState } = relationship;
    if (localState && isNew(localState) && !remoteState) {
      return;
    }
    // when localState does not match the new remoteState and
    // localState === existingState then we had no local mutation
    // and we can safely sync the new remoteState to local
    if (localState !== remoteState && localState === existingState) {
      relationship.localState = remoteState;
      notifyChange(graph, relationship.identifier, relationship.definition.key);
      // But when localState does not match the new remoteState and
      // and localState !== existingState then we know we have a local mutation
      // that has not been persisted yet.
    } else if (DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
      if (
        localState !== remoteState &&
        localState !== existingState &&
        relationship.definition.resetOnRemoteUpdate !== false
      ) {
        relationship.localState = remoteState;

        deprecate(
          `EmberData is changing the default semantics of updates to the remote state of relationships.\n\nThe following local state was cleared from the <${
            relationship.identifier.type
          }>.${
            relationship.definition.key
          } belongsTo relationship but will not be once this deprecation is resolved:\n\n\t${
            localState ? 'Added: ' + localState.lid + '\n\t' : ''
          }${existingState ? 'Removed: ' + existingState.lid : ''}`,
          false,
          {
            id: 'ember-data:deprecate-relationship-remote-update-clearing-local-state',
            for: 'ember-data',
            since: { enabled: '5.3', available: '5.3' },
            until: '6.0',
            url: 'https://deprecations.emberjs.com/v5.x#ember-data-deprecate-relationship-remote-update-clearing-local-state',
          }
        );

        notifyChange(graph, relationship.identifier, relationship.definition.key);
      }
    }
  } else {
    notifyChange(graph, relationship.identifier, relationship.definition.key);
  }
}
