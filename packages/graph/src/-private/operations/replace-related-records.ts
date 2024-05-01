import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { ReplaceRelatedRecordsOperation } from '@warp-drive/core-types/graph';

import { _addLocal, _removeLocal, _removeRemote, diffCollection } from '../-diff';
import { isBelongsTo, isHasMany, isNew, notifyChange } from '../-utils';
import { assertPolymorphicType } from '../debug/assert-polymorphic-type';
import type { CollectionEdge } from '../edges/collection';
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
    replaceRelatedRecordsRemote(graph, op, isRemote);
  } else {
    replaceRelatedRecordsLocal(graph, op, isRemote);
  }
}

function replaceRelatedRecordsLocal(graph: Graph, op: ReplaceRelatedRecordsOperation, isRemote: boolean) {
  const identifiers = op.value;
  const relationship = graph.get(op.record, op.field);
  assert(`expected hasMany relationship`, isHasMany(relationship));

  // relationships for newly created records begin in the dirty state, so if updated
  // before flushed we would fail to notify. This check helps us avoid that.
  const isMaybeFirstUpdate =
    relationship.remoteState.length === 0 &&
    relationship.localState === null &&
    relationship.state.hasReceivedData === false;
  relationship.state.hasReceivedData = true;
  const { additions, removals } = relationship;
  const { inverseKey, type } = relationship.definition;
  const { record } = op;
  const wasDirty = relationship.isDirty;
  relationship.isDirty = false;

  const onAdd = (identifier: StableRecordIdentifier) => {
    // Since we are diffing against the remote state, we check
    // if our previous local state did not contain this identifier
    const removalsHas = removals?.has(identifier);
    if (removalsHas || !additions?.has(identifier)) {
      if (type !== identifier.type) {
        if (DEBUG) {
          assertPolymorphicType(relationship.identifier, relationship.definition, identifier, graph.store);
        }
        graph.registerPolymorphicType(type, identifier.type);
      }

      relationship.isDirty = true;
      addToInverse(graph, identifier, inverseKey, op.record, isRemote);

      if (removalsHas) {
        removals!.delete(identifier);
      }
    }
  };

  const onRemove = (identifier: StableRecordIdentifier) => {
    // Since we are diffing against the remote state, we check
    // if our previous local state had contained this identifier
    const additionsHas = additions?.has(identifier);
    if (additionsHas || !removals?.has(identifier)) {
      relationship.isDirty = true;
      removeFromInverse(graph, identifier, inverseKey, record, isRemote);

      if (additionsHas) {
        additions!.delete(identifier);
      }
    }
  };

  const diff = diffCollection(identifiers, relationship, onAdd, onRemove);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let becameDirty = relationship.isDirty || diff.changed;

  // any additions no longer in the local state
  // need to be removed from the inverse
  if (additions && additions.size > 0) {
    additions.forEach((identifier) => {
      if (!diff.add.has(identifier)) {
        becameDirty = true;
        onRemove(identifier);
      }
    });
  }

  // any removals no longer in the local state
  // need to be added back to the inverse
  if (removals && removals.size > 0) {
    removals.forEach((identifier) => {
      if (!diff.del.has(identifier)) {
        becameDirty = true;
        onAdd(identifier);
      }
    });
  }

  relationship.additions = diff.add;
  relationship.removals = diff.del;
  relationship.localState = diff.finalState;
  relationship.isDirty = wasDirty;

  if (
    isMaybeFirstUpdate ||
    !wasDirty /*&& becameDirty // TODO to guard like this we need to detect reorder when diffing local */
  ) {
    notifyChange(graph, op.record, op.field);
  }
}

function replaceRelatedRecordsRemote(graph: Graph, op: ReplaceRelatedRecordsOperation, isRemote: boolean) {
  const identifiers = op.value;
  const relationship = graph.get(op.record, op.field);

  assert(
    `You can only '${op.op}' on a hasMany relationship. ${op.record.type}.${op.field} is a ${relationship.definition.kind}`,
    isHasMany(relationship)
  );
  if (isRemote) {
    graph._addToTransaction(relationship);
  }
  relationship.state.hasReceivedData = true;

  // cache existing state
  const { definition } = relationship;

  const { type } = relationship.definition;

  const diff = diffCollection(
    identifiers,
    relationship,
    (identifier) => {
      if (type !== identifier.type) {
        if (DEBUG) {
          assertPolymorphicType(relationship.identifier, relationship.definition, identifier, graph.store);
        }
        graph.registerPolymorphicType(type, identifier.type);
      }
      // commit additions
      // TODO build this into the diff?
      // because we are not dirty if this was a committed local addition
      if (relationship.additions?.has(identifier)) {
        relationship.additions.delete(identifier);
      } else {
        relationship.isDirty = true;
      }
      addToInverse(graph, identifier, definition.inverseKey, op.record, isRemote);
    },
    (identifier) => {
      // commit removals
      // TODO build this into the diff?
      // because we are not dirty if this was a committed local addition
      if (relationship.removals?.has(identifier)) {
        relationship.removals.delete(identifier);
      } else {
        relationship.isDirty = true;
      }
      removeFromInverse(graph, identifier, definition.inverseKey, op.record, isRemote);
    }
  );

  // replace existing state
  relationship.remoteMembers = diff.finalSet;
  relationship.remoteState = diff.finalState;

  // changed also indicates a change in order
  if (diff.changed) {
    relationship.isDirty = true;
  }

  // TODO unsure if we need this but it
  // may allow us to more efficiently patch
  // the associated ManyArray
  relationship._diff = diff;

  if (DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
    // only do this for legacy hasMany, not collection
    // and provide a way to incrementally migrate
    if (relationship.definition.kind === 'hasMany' && relationship.definition.resetOnRemoteUpdate !== false) {
      const deprecationInfo: {
        removals: StableRecordIdentifier[];
        additions: StableRecordIdentifier[];
        triggered: boolean;
      } = {
        removals: [],
        additions: [],
        triggered: false,
      };
      if (relationship.removals) {
        relationship.isDirty = true;
        relationship.removals.forEach((identifier) => {
          deprecationInfo.triggered = true;
          deprecationInfo.removals.push(identifier);
          // reverse the removal
          // if we are still in removals at this point then
          // we were not "committed" which means we are present
          // in the remoteMembers. So we "add back" on the inverse.
          addToInverse(graph, identifier, definition.inverseKey, op.record, isRemote);
        });
        relationship.removals = null;
      }
      if (relationship.additions) {
        relationship.additions.forEach((identifier) => {
          // reverse the addition
          // if we are still in additions at this point then
          // we were not "committed" which means we are not present
          // in the remoteMembers. So we "remove" from the inverse.
          // however we only do this if we are not a "new" record.
          if (!isNew(identifier)) {
            deprecationInfo.triggered = true;
            deprecationInfo.additions.push(identifier);
            relationship.isDirty = true;
            relationship.additions!.delete(identifier);
            removeFromInverse(graph, identifier, definition.inverseKey, op.record, isRemote);
          }
        });
        if (relationship.additions.size === 0) {
          relationship.additions = null;
        }
      }

      if (deprecationInfo.triggered) {
        deprecate(
          `EmberData is changing the default semantics of updates to the remote state of relationships.\n\nThe following local state was cleared from the <${
            relationship.identifier.type
          }>.${
            relationship.definition.key
          } hasMany relationship but will not be once this deprecation is resolved by opting into the new behavior:\n\n\tAdded: [${deprecationInfo.additions
            .map((i) => i.lid)
            .join(', ')}]\n\tRemoved: [${deprecationInfo.removals.map((i) => i.lid).join(', ')}]`,
          false,
          {
            id: 'ember-data:deprecate-relationship-remote-update-clearing-local-state',
            for: 'ember-data',
            since: { enabled: '5.3', available: '5.3' },
            until: '6.0',
            url: 'https://deprecations.emberjs.com/v5.x#ember-data-deprecate-relationship-remote-update-clearing-local-state',
          }
        );
      }
    }
  }

  if (relationship.isDirty) {
    flushCanonical(graph, relationship);
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
    if (DEBUG) {
      assertPolymorphicType(relationship.identifier, relationship.definition, value, graph.store);
    }
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
      notifyChange(graph, identifier, key);
    }
  } else if (isHasMany(relationship)) {
    if (isRemote) {
      // TODO this needs to alert stuffs
      // And patch state better
      // This is almost definitely wrong
      // WARNING WARNING WARNING

      if (!relationship.remoteMembers.has(value)) {
        graph._addToTransaction(relationship);
        relationship.remoteState.push(value);
        relationship.remoteMembers.add(value);
        if (relationship.additions?.has(value)) {
          relationship.additions.delete(value);
        } else {
          relationship.isDirty = true;
          relationship.state.hasReceivedData = true;
          flushCanonical(graph, relationship);
        }
      }
    } else {
      if (_addLocal(graph, identifier, relationship, value, null)) {
        notifyChange(graph, identifier, key);
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
    notifyChange(graph, identifier, key);
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
      if (_removeRemote(relationship, value)) {
        notifyChange(graph, identifier, key);
      }
    } else {
      if (_removeLocal(relationship, value)) {
        notifyChange(graph, identifier, key);
      }
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

function flushCanonical(graph: Graph, rel: CollectionEdge) {
  graph._scheduleLocalSync(rel);
}
