import { deprecate } from '@ember/debug';

import { DEBUG_RELATIONSHIP_NOTIFICATIONS, LOG_METRIC_COUNTS } from '@warp-drive/core/build-config/debugging';
import { DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE } from '@warp-drive/core/build-config/deprecations';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { ResourceKey } from '../../../types.ts';
import type { ReplaceRelatedRecordsOperation } from '../../../types/graph.ts';
import { _add, _removeLocal, _removeRemote, diffCollection } from '../-diff.ts';
import { checkIfNew, isBelongsTo, isHasMany, notifyChange } from '../-utils.ts';
import { assertPolymorphicType } from '../debug/assert-polymorphic-type.ts';
import type { CollectionEdge } from '../edges/collection.ts';
import type { Graph } from '../graph.ts';

function count(label: string) {
  // @ts-expect-error
  // eslint-disable-next-line
  globalThis.__WarpDriveMetricCountData[label] = (globalThis.__WarpDriveMetricCountData[label] || 0) + 1;
}

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
    In a uni-directional graph with Many:? edges (modeled in WarpDrive with `inverse:null`) with
    artificial (implicit) inverses, replacing a value results in 2 discrete value transitions.
    This is because a Many:? relationship is effectively Many:Many.
  */
export default function replaceRelatedRecords(
  graph: Graph,
  op: ReplaceRelatedRecordsOperation,
  isRemote: boolean
): void {
  if (isRemote) {
    replaceRelatedRecordsRemote(graph, op, isRemote);
  } else {
    replaceRelatedRecordsLocal(graph, op, isRemote);
  }
}

function replaceRelatedRecordsLocal(graph: Graph, op: ReplaceRelatedRecordsOperation, isRemote: boolean) {
  const resourceKeys = op.value;
  const relationship = graph.get(op.record, op.field);
  assert(`expected hasMany relationship`, isHasMany(relationship));

  relationship.state.hasReceivedData = true;
  const { additions, removals } = relationship;
  const { inverseKey, type } = relationship.definition;
  const { record } = op;
  const wasDirty = relationship.isDirty;
  let localBecameDirty = false;

  if (LOG_METRIC_COUNTS) {
    count(`replaceRelatedRecordsLocal ${'type' in record ? record.type : '<document>'} ${op.field}`);
  }

  const onAdd = (resourceKey: ResourceKey) => {
    // Since we are diffing against the remote state, we check
    // if our previous local state did not contain this ResourceKey
    const removalsHas = removals?.has(resourceKey);
    if (removalsHas || !additions?.has(resourceKey)) {
      if (type !== resourceKey.type) {
        if (DEBUG) {
          assertPolymorphicType(relationship.identifier, relationship.definition, resourceKey, graph.store);
        }
        graph.registerPolymorphicType(type, resourceKey.type);
      }

      // we've added a record locally that wasn't in the local state before
      localBecameDirty = true;
      addToInverse(graph, resourceKey, inverseKey, op.record, isRemote);

      if (removalsHas) {
        removals!.delete(resourceKey);
      }
    }
  };

  const onRemove = (resourceKey: ResourceKey) => {
    // Since we are diffing against the remote state, we check
    // if our previous local state had contained this ResourceKey
    const additionsHas = additions?.has(resourceKey);
    if (additionsHas || !removals?.has(resourceKey)) {
      // we've removed a record locally that was in the local state before
      localBecameDirty = true;
      removeFromInverse(graph, resourceKey, inverseKey, record, isRemote);

      if (additionsHas) {
        additions!.delete(resourceKey);
      }
    }
  };

  const diff = diffCollection(resourceKeys, relationship, onAdd, onRemove);

  // any additions no longer in the local state
  // also need to be removed from the inverse
  if (additions && additions.size > 0) {
    additions.forEach((resourceKey) => {
      if (!diff.add.has(resourceKey)) {
        localBecameDirty = true;
        onRemove(resourceKey);
      }
    });
  }

  // any removals no longer in the local state
  // also need to be added back to the inverse
  if (removals && removals.size > 0) {
    removals.forEach((resourceKey) => {
      if (!diff.del.has(resourceKey)) {
        localBecameDirty = true;
        onAdd(resourceKey);
      }
    });
  }

  const becameDirty = diff.changed || localBecameDirty;
  relationship.additions = diff.add;
  relationship.removals = diff.del;
  relationship.localState = diff.finalState;

  // we only notify if the localState changed and were not already dirty before
  // because if we were already dirty then we have already notified
  if (becameDirty && !wasDirty) {
    notifyChange(graph, relationship);
  }
}

function replaceRelatedRecordsRemote(graph: Graph, op: ReplaceRelatedRecordsOperation, isRemote: boolean) {
  const resourceKeys = op.value;
  const relationship = graph.get(op.record, op.field);

  if (LOG_METRIC_COUNTS) {
    count(`replaceRelatedRecordsRemote ${'type' in op.record ? op.record.type : '<document>'}  ${op.field}`);
  }

  assert(
    `You can only '${op.op}' on a hasMany relationship. ${op.record.type}.${op.field} is a ${relationship.definition.kind}`,
    isHasMany(relationship)
  );
  if (isRemote) {
    graph._addToTransaction(relationship);
  }

  const wasDirty = relationship.isDirty;
  // if this is our first time receiving data
  // we need to mark the relationship as dirty
  // so that non-materializing APIs like `hasManyReference.value()`
  // will get notified and updated.
  if (!relationship.state.hasReceivedData) {
    relationship.isDirty = true;
  }
  relationship.state.hasReceivedData = true;

  // cache existing state
  const { definition } = relationship;

  const { type } = relationship.definition;

  const diff = diffCollection(
    resourceKeys,
    relationship,
    (resourceKey) => {
      if (type !== resourceKey.type) {
        if (DEBUG) {
          assertPolymorphicType(relationship.identifier, relationship.definition, resourceKey, graph.store);
        }
        graph.registerPolymorphicType(type, resourceKey.type);
      }
      // commit additions
      // TODO build this into the diff?
      // because we are not dirty if this was a committed local addition
      if (relationship.additions?.has(resourceKey)) {
        relationship.additions.delete(resourceKey);
      } else {
        if (DEBUG_RELATIONSHIP_NOTIFICATIONS) {
          if (!relationship.isDirty) {
            // eslint-disable-next-line no-console
            console.log(
              `setting relationship to dirty because the remote addition was not in our previous list of local additions`
            );
          }
        }
      }
      addToInverse(graph, resourceKey, definition.inverseKey, op.record, isRemote);
    },
    (resourceKey) => {
      // commit removals
      // TODO build this into the diff?
      // because we are not dirty if this was a committed local addition
      if (relationship.removals?.has(resourceKey)) {
        relationship.removals.delete(resourceKey);
      } else {
        if (DEBUG_RELATIONSHIP_NOTIFICATIONS) {
          if (!relationship.isDirty) {
            // eslint-disable-next-line no-console
            console.log(
              `setting relationship to dirty because the remote removal was not in our previous list of local removals`
            );
          }
        }
      }
      removeFromInverse(graph, resourceKey, definition.inverseKey, op.record, isRemote);
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
    if (
      // we do not guard by diff.changed here
      // because we want to clear local changes even if
      // no change has occurred to preserve the legacy behavior
      relationship.definition.kind === 'hasMany' &&
      relationship.definition.resetOnRemoteUpdate !== false &&
      (diff.changed || wasDirty)
    ) {
      const deprecationInfo: {
        removals: ResourceKey[];
        additions: ResourceKey[];
        triggered: boolean;
      } = {
        removals: [],
        additions: [],
        triggered: false,
      };
      if (relationship.removals) {
        relationship.isDirty = true;
        relationship.removals.forEach((resourceKey) => {
          deprecationInfo.triggered = true;
          deprecationInfo.removals.push(resourceKey);
          // reverse the removal
          // if we are still in removals at this point then
          // we were not "committed" which means we are present
          // in the remoteMembers. So we "add back" on the inverse.
          addToInverse(graph, resourceKey, definition.inverseKey, op.record, false);
        });
        relationship.removals = null;
      }
      if (relationship.additions) {
        relationship.additions.forEach((resourceKey) => {
          // reverse the addition
          // if we are still in additions at this point then
          // we were not "committed" which means we are not present
          // in the remoteMembers. So we "remove" from the inverse.
          // however we only do this if we are not a "new" record.
          if (!checkIfNew(graph._realStore, resourceKey)) {
            deprecationInfo.triggered = true;
            deprecationInfo.additions.push(resourceKey);
            relationship.isDirty = true;
            relationship.additions!.delete(resourceKey);
            removeFromInverse(graph, resourceKey, definition.inverseKey, op.record, false);
          }
        });
        if (relationship.additions.size === 0) {
          relationship.additions = null;
        }
      }

      if (deprecationInfo.triggered) {
        deprecate(
          `WarpDrive is changing the default semantics of updates to the remote state of relationships.\n\nThe following local state was cleared from the <${
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
            since: { enabled: '5.3', available: '4.13' },
            until: '6.0',
            url: 'https://deprecations.emberjs.com/v5.x#ember-data-deprecate-relationship-remote-update-clearing-local-state',
          }
        );
      }
    }
  }

  if (relationship.isDirty && !wasDirty) {
    flushCanonical(graph, relationship);
  }
}

export function addToInverse(
  graph: Graph,
  resourceKey: ResourceKey,
  key: string,
  value: ResourceKey,
  isRemote: boolean
): void {
  const relationship = graph.get(resourceKey, key);
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
        removeFromInverse(graph, relationship.remoteState, relationship.definition.inverseKey, resourceKey, isRemote);
      }
      relationship.remoteState = value;
    }

    if (relationship.localState !== value) {
      if (!isRemote && relationship.localState) {
        removeFromInverse(graph, relationship.localState, relationship.definition.inverseKey, resourceKey, isRemote);
      }
      relationship.localState = value;

      notifyChange(graph, relationship);
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
      // if we are not dirty but have a null localState then we
      // are mutating a relationship that has never been fetched
      // so we initialize localState to an empty array
      if (!relationship.isDirty && !relationship.localState) {
        relationship.localState = [];
      }

      if (_add(graph, resourceKey, relationship, value, null, isRemote)) {
        notifyChange(graph, relationship);
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
  resourceKey: ResourceKey,
  key: string,
  value: ResourceKey,
  isRemote: boolean
): void {
  const relationship = graph.get(resourceKey, key);
  if (isHasMany(relationship) && isRemote && relationship.remoteMembers.has(value)) {
    notifyChange(graph, relationship);
  }
}

export function removeFromInverse(
  graph: Graph,
  resourceKey: ResourceKey,
  key: string,
  value: ResourceKey,
  isRemote: boolean
): void {
  const relationship = graph.get(resourceKey, key);

  if (isBelongsTo(relationship)) {
    relationship.state.isEmpty = true;
    if (isRemote) {
      graph._addToTransaction(relationship);
      relationship.remoteState = null;
    }
    if (relationship.localState === value) {
      relationship.localState = null;

      notifyChange(graph, relationship);
    }
  } else if (isHasMany(relationship)) {
    if (isRemote) {
      graph._addToTransaction(relationship);
      if (_removeRemote(relationship, value)) {
        notifyChange(graph, relationship);
      }
    } else {
      if (_removeLocal(relationship, value)) {
        notifyChange(graph, relationship);
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
  if (rel.accessed) {
    graph._scheduleLocalSync(rel);
  }
}
