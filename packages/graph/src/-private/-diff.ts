import { deprecate } from '@ember/debug';

import {
  DEPRECATE_NON_UNIQUE_PAYLOADS,
  DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE,
} from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { isBelongsTo, notifyChange } from './-utils';
import { assertPolymorphicType } from './debug/assert-polymorphic-type';
import type { CollectionEdge } from './edges/collection';
import type { ResourceEdge } from './edges/resource';
import type { Graph } from './graph';
import replaceRelatedRecord from './operations/replace-related-record';
import replaceRelatedRecords from './operations/replace-related-records';

function _deprecatedCompare<T>(
  priorLocalState: T[] | null,
  newState: T[],
  newMembers: Set<T>,
  prevState: T[],
  prevSet: Set<T>,
  onAdd: (v: T) => void,
  onDel: (v: T) => void,
  remoteClearsLocal: boolean
): { duplicates: Map<T, number[]>; diff: Diff<T> } {
  const newLength = newState.length;
  const prevLength = prevState.length;
  const iterationLength = Math.max(newLength, prevLength);
  let changed: boolean = newMembers.size !== prevSet.size;
  let remoteOrderChanged = false;
  const added = new Set<T>();
  const removed = new Set<T>();
  const duplicates = new Map<T, number[]>();
  const finalSet = new Set<T>();
  const finalState: T[] = [];
  const priorLocalLength = priorLocalState?.length ?? 0;

  for (let i = 0, j = 0; i < iterationLength; i++) {
    let adv = false;
    let member: T | undefined;

    // accumulate anything added
    if (i < newLength) {
      member = newState[i];

      if (!finalSet.has(member)) {
        finalState[j] = member;
        finalSet.add(member);
        adv = true;

        if (!prevSet.has(member)) {
          changed = true;
          added.add(member);
          onAdd(member);
        }
      } else {
        let list = duplicates.get(member);

        if (list === undefined) {
          list = [];
          duplicates.set(member, list);
        }

        list.push(i);
      }
    }

    // accumulate anything removed
    if (i < prevLength) {
      const prevMember = prevState[i];

      // detect reordering, adjusting index for duplicates
      // j is always less than i and so if i < prevLength, j < prevLength
      if (member !== prevState[j]) {
        // the new remote order does not match the current remote order
        // indicating a change in membership or reordering
        remoteOrderChanged = true;
        // however: if the new remote order matches the current local order
        // we can disregard the change notification generation so long as
        // we are not configured to reset on remote update (which is deprecated)
        if (DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
          if (!remoteClearsLocal && i < priorLocalLength) {
            const priorLocalMember = priorLocalState![j];
            if (priorLocalMember !== member) {
              changed = true;
            }
          } else {
            changed = true;
          }
        } else {
          if (i < priorLocalLength) {
            const priorLocalMember = priorLocalState![j];
            if (priorLocalMember !== member) {
              changed = true;
            }
          } else {
            changed = true;
          }
        }

        // if remote order hasn't changed but local order differs
        // and we are configured to reset on remote update (which is deprecated)
        // then we still need to mark the relationship as changed
      } else if (DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
        if (remoteClearsLocal) {
          if (!changed && j < priorLocalLength) {
            const priorLocalMember = priorLocalState![j];
            if (priorLocalMember !== member) {
              changed = true;
            }
          }
        }
      }

      if (!newMembers.has(prevMember)) {
        changed = true;
        removed.add(prevMember);
        onDel(prevMember);
      }
    } else if (adv && j < prevLength && member !== prevState[j]) {
      changed = true;
    }

    if (adv) {
      j++;
    }
  }

  const diff = {
    add: added,
    del: removed,
    finalState,
    finalSet,
    changed,
    remoteOrderChanged,
  };

  return {
    diff,
    duplicates,
  };
}

function _compare<T>(
  priorLocalState: T[] | null,
  finalState: T[],
  finalSet: Set<T>,
  prevState: T[],
  prevSet: Set<T>,
  onAdd: (v: T) => void,
  onDel: (v: T) => void,
  remoteClearsLocal: boolean
): Diff<T> {
  const finalLength = finalState.length;
  const prevLength = prevState.length;
  const iterationLength = Math.max(finalLength, prevLength);
  const equalLength = finalLength === prevLength;
  let changed: boolean = finalSet.size !== prevSet.size;
  let remoteOrderChanged = false;
  const added = new Set<T>();
  const removed = new Set<T>();
  const priorLocalLength = priorLocalState?.length ?? 0;

  for (let i = 0; i < iterationLength; i++) {
    let member: T | undefined;

    // accumulate anything added
    if (i < finalLength) {
      member = finalState[i];
      if (!prevSet.has(member)) {
        // TODO: in order to avoid unnecessarily notifying a change here
        // we would need to only notify "changed" if member is not in
        // relationship.additions OR if localState[i] !== member

        changed = true;
        added.add(member);
        onAdd(member);
      }
    }

    // accumulate anything removed
    if (i < prevLength) {
      const prevMember = prevState[i];

      // detect reordering
      if (equalLength && member !== prevMember) {
        // the new remote order does not match the current remote order
        // indicating a change in membership or reordering
        remoteOrderChanged = true;
        // however: if the new remote order matches the current local order
        // we can disregard the change notification generation so long as
        // we are not configured to reset on remote update (which is deprecated)
        if (DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
          if (!remoteClearsLocal && i < priorLocalLength) {
            const priorLocalMember = priorLocalState![i];
            if (priorLocalMember !== member) {
              changed = true;
            }
          } else {
            changed = true;
          }
        } else {
          if (i < priorLocalLength) {
            const priorLocalMember = priorLocalState![i];
            if (priorLocalMember !== member) {
              changed = true;
            }
          } else {
            changed = true;
          }
        }

        // if remote order hasn't changed but local order differs
        // and we are configured to reset on remote update (which is deprecated)
        // then we still need to mark the relationship as changed
      } else if (DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
        if (remoteClearsLocal) {
          if (equalLength && !changed && i < priorLocalLength) {
            const priorLocalMember = priorLocalState![i];
            if (priorLocalMember !== prevMember) {
              changed = true;
            }
          }
        }
      }

      if (!finalSet.has(prevMember)) {
        changed = true;
        removed.add(prevMember);
        onDel(prevMember);
      }
    }
  }

  return {
    add: added,
    del: removed,
    finalState,
    finalSet,
    changed,
    remoteOrderChanged,
  };
}

type Diff<T> = {
  add: Set<T>;
  del: Set<T>;
  finalState: T[];
  finalSet: Set<T>;
  changed: boolean;
  remoteOrderChanged: boolean;
};

export function diffCollection(
  finalState: StableRecordIdentifier[],
  relationship: CollectionEdge,
  onAdd: (v: StableRecordIdentifier) => void,
  onDel: (v: StableRecordIdentifier) => void
): Diff<StableRecordIdentifier> {
  const finalSet = new Set(finalState);
  const { localState: priorLocalState, remoteState, remoteMembers } = relationship;

  if (DEPRECATE_NON_UNIQUE_PAYLOADS) {
    if (finalState.length !== finalSet.size) {
      const { diff, duplicates } = _deprecatedCompare(
        priorLocalState,
        finalState,
        finalSet,
        remoteState,
        remoteMembers,
        onAdd,
        onDel,
        relationship.definition.resetOnRemoteUpdate
      );

      if (DEBUG) {
        deprecate(
          `Expected all entries in the relationship ${relationship.definition.type}:${relationship.definition.key} to be unique, see log for a list of duplicate entry indeces`,
          false,
          {
            id: 'ember-data:deprecate-non-unique-relationship-entries',
            for: 'ember-data',
            until: '6.0',
            since: { available: '4.13', enabled: '5.3' },
          }
        );
        // eslint-disable-next-line no-console
        console.log(duplicates);
      }

      return diff;
    }
  } else {
    assert(
      `Expected all entries in the relationship to be unique, found duplicates`,
      finalState.length === finalSet.size
    );
  }

  return _compare(
    priorLocalState,
    finalState,
    finalSet,
    remoteState,
    remoteMembers,
    onAdd,
    onDel,
    relationship.definition.resetOnRemoteUpdate
  );
}

export function computeLocalState(storage: CollectionEdge): StableRecordIdentifier[] {
  if (!storage.isDirty) {
    assert(`Expected localState to be present`, Array.isArray(storage.localState));
    return storage.localState;
  }

  const state = storage.remoteState.slice();

  storage.removals?.forEach((v) => {
    const index = state.indexOf(v);
    state.splice(index, 1);
  });

  storage.additions?.forEach((v) => {
    state.push(v);
  });
  storage.localState = state;
  storage.isDirty = false;

  return state;
}

export function _addLocal(
  graph: Graph,
  record: StableRecordIdentifier,
  relationship: CollectionEdge,
  value: StableRecordIdentifier,
  index: number | null
): boolean {
  const { remoteMembers, removals } = relationship;
  let additions = relationship.additions;
  const hasPresence = remoteMembers.has(value) || additions?.has(value);

  if (hasPresence && !removals?.has(value)) {
    assert(
      `Attempted to add the resource '${value.lid}' to the collection <${relationship.identifier.type}>.${relationship.definition.key} it was already in`,
      hasPresence && !removals?.has(value)
    );
    return false;
  }

  if (removals?.has(value)) {
    removals.delete(value);
  } else {
    if (!additions) {
      additions = relationship.additions = new Set();
    }

    relationship.state.hasReceivedData = true;
    additions.add(value);

    const { type } = relationship.definition;
    if (type !== value.type) {
      if (DEBUG) {
        assertPolymorphicType(record, relationship.definition, value, graph.store);
      }
      graph.registerPolymorphicType(value.type, type);
    }
  }

  // if we have existing localState
  // and we have an index
  // apply the change, as this is more efficient
  // than recomputing localState and
  // it allows us to preserve local ordering
  // to a small extend. Local ordering should not
  // be relied upon as any remote change will blow it away
  if (relationship.localState) {
    if (index !== null) {
      relationship.localState.splice(index, 0, value);
    } else {
      relationship.localState.push(value);
    }
  }

  return true;
}

export function _removeLocal(relationship: CollectionEdge, value: StableRecordIdentifier): boolean {
  assert(`expected an identifier to remove from the collection relationship`, value);
  const { remoteMembers, additions } = relationship;
  let removals = relationship.removals;
  const hasPresence = remoteMembers.has(value) || additions?.has(value);

  if (!hasPresence || removals?.has(value)) {
    assert(
      `Attempted to remove the resource '${value.lid}' from the collection <${relationship.identifier.type}>.${relationship.definition.key} but it was not present`,
      !hasPresence || removals?.has(value)
    );
    return false;
  }

  if (additions?.has(value)) {
    additions.delete(value);
  } else {
    if (!removals) {
      removals = relationship.removals = new Set();
    }

    removals.add(value);
  }

  // if we have existing localState
  // apply the change, as this is more efficient
  // than recomputing localState and
  // it allows us to preserve local ordering
  // to a small extend. Local ordering should not
  // be relied upon as any remote change will blow it away
  if (relationship.localState) {
    const index = relationship.localState.indexOf(value);
    assert(`Cannot remove a resource that is not present`, index !== -1);
    relationship.localState.splice(index, 1);
  }
  assert(
    `Expected relationship to be dirty when performing a local mutation`,
    relationship.localState || relationship.isDirty
  );

  return true;
}

export function _removeRemote(relationship: CollectionEdge, value: StableRecordIdentifier): boolean {
  assert(`expected an identifier to remove from the collection relationship`, value);
  const { remoteMembers, additions, removals, remoteState } = relationship;

  assert(`Cannot remove a resource that is not present`, remoteMembers.has(value));
  if (!remoteMembers.has(value)) {
    return false;
  }

  // remove from remote state
  remoteMembers.delete(value);
  let index = remoteState.indexOf(value);
  assert(`Cannot remove a resource that is not present`, index !== -1);
  remoteState.splice(index, 1);

  // remove from removals if present
  if (removals?.has(value)) {
    removals.delete(value);

    // nothing more to do this was our state already
    return false;
  }

  assert(
    `Remote state indicated removal of a resource that was present only as a local mutation`,
    !additions?.has(value)
  );

  // if we have existing localState
  // and we have an index
  // apply the change, as this is more efficient
  // than recomputing localState and
  // it allows us to preserve local ordering
  // to a small extend. Local ordering should not
  // be relied upon as any remote change will blow it away
  if (relationship.localState) {
    index = relationship.localState.indexOf(value);
    assert(`Cannot remove a resource that is not present`, index !== -1);
    relationship.localState.splice(index, 1);
  }
  assert(
    `Expected relationship to be dirty when performing a local mutation`,
    relationship.localState || relationship.isDirty
  );

  return true;
}

export function rollbackRelationship(
  graph: Graph,
  identifier: StableRecordIdentifier,
  field: string,
  relationship: CollectionEdge | ResourceEdge
): void {
  if (isBelongsTo(relationship)) {
    replaceRelatedRecord(
      graph,
      {
        op: 'replaceRelatedRecord',
        record: identifier,
        field,
        value: relationship.remoteState,
      },
      false
    );
  } else {
    replaceRelatedRecords(
      graph,
      {
        op: 'replaceRelatedRecords',
        record: identifier,
        field,
        value: relationship.remoteState.slice(),
      },
      false
    );

    // when the change was a "reorder" only we wont have generated
    // a notification yet.
    // if we give rollback a unique operation we can use the ability of
    // diff to report a separate `remoteOrderChanged` flag to trigger this
    // if needed to avoid the duplicate.
    notifyChange(graph, relationship);
  }
}
