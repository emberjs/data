import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_NON_UNIQUE_PAYLOADS } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { isBelongsTo } from './-utils';
import { assertPolymorphicType } from './debug/assert-polymorphic-type';
import type { CollectionEdge } from './edges/collection';
import type { ResourceEdge } from './edges/resource';
import type { Graph } from './graph';
import replaceRelatedRecord from './operations/replace-related-record';
import replaceRelatedRecords from './operations/replace-related-records';

function _deprecatedCompare<T>(
  newState: T[],
  newMembers: Set<T>,
  prevState: T[],
  prevSet: Set<T>,
  onAdd: (v: T) => void,
  onDel: (v: T) => void
): { duplicates: Map<T, number[]>; diff: Diff<T> } {
  const newLength = newState.length;
  const prevLength = prevState.length;
  const iterationLength = Math.max(newLength, prevLength);
  let changed: boolean = newMembers.size !== prevSet.size;
  const added = new Set<T>();
  const removed = new Set<T>();
  const duplicates = new Map<T, number[]>();
  const finalSet = new Set<T>();
  const finalState: T[] = [];

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
        changed = true;
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
  };

  return {
    diff,
    duplicates,
  };
}

function _compare<T>(
  finalState: T[],
  finalSet: Set<T>,
  prevState: T[],
  prevSet: Set<T>,
  onAdd: (v: T) => void,
  onDel: (v: T) => void
): Diff<T> {
  const finalLength = finalState.length;
  const prevLength = prevState.length;
  const iterationLength = Math.max(finalLength, prevLength);
  const equalLength = finalLength === prevLength;
  let changed: boolean = finalSet.size !== prevSet.size;
  const added = new Set<T>();
  const removed = new Set<T>();

  for (let i = 0; i < iterationLength; i++) {
    let member: T | undefined;

    // accumulate anything added
    if (i < finalLength) {
      member = finalState[i];
      if (!prevSet.has(member)) {
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
        changed = true;
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
  };
}

type Diff<T> = {
  add: Set<T>;
  del: Set<T>;
  finalState: T[];
  finalSet: Set<T>;
  changed: boolean;
};

export function diffCollection(
  finalState: StableRecordIdentifier[],
  relationship: CollectionEdge,
  onAdd: (v: StableRecordIdentifier) => void,
  onDel: (v: StableRecordIdentifier) => void
): Diff<StableRecordIdentifier> {
  const finalSet = new Set(finalState);
  const { remoteState, remoteMembers } = relationship;

  if (DEPRECATE_NON_UNIQUE_PAYLOADS) {
    if (finalState.length !== finalSet.size) {
      const { diff, duplicates } = _deprecatedCompare(finalState, finalSet, remoteState, remoteMembers, onAdd, onDel);

      if (DEBUG) {
        deprecate(
          `Expected all entries in the relationship ${relationship.definition.type}:${relationship.definition.key} to be unique, see log for a list of duplicate entry indeces`,
          false,
          {
            id: 'ember-data:deprecate-non-unique-relationship-entries',
            for: 'ember-data',
            until: '6.0',
            since: { available: '5.3', enabled: '5.3' },
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

  return _compare(finalState, finalSet, remoteState, remoteMembers, onAdd, onDel);
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
  assert(
    `Expected relationship to be dirty when adding a local mutation`,
    relationship.localState || relationship.isDirty
  );

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
  }
}
