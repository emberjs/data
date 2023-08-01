import { assert, deprecate } from '@ember/debug';

import { DEBUG } from '@ember-data/debug';
import { DEPRECATE_NON_UNIQUE_PAYLOADS } from '@ember-data/deprecations';
import { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { CollectionEdge } from './edges/collection';

function _deprecatedCompare<T>(
  final: T[],
  initialSet: Set<T>,
  cb: (v: T) => void
): { duplicates: Map<T, number[]>; missing: Set<T> } {
  let missing: Set<T> = new Set();
  let seen = new Set();
  let duplicates = new Map<T, number[]>();

  for (let i = 0; i < final.length; i++) {
    let v = final[i];
    if (seen.has(v)) {
      if (DEBUG) {
        let loc = duplicates.get(v);
        if (!loc) {
          loc = [];
          duplicates.set(v, loc);
        }
        loc.push(i);
      }

      final.splice(i, 1);
      i -= 1;
      continue;
    }

    if (!initialSet.has(v)) {
      cb(v);
      missing.add(v);
    }
    seen.add(v);
  }
  return { duplicates, missing };
}

function _compare<T>(final: T[], initialSet: Set<T>, cb: (v: T) => void): Set<T> {
  let missing: Set<T> = new Set();

  for (let i = 0; i < final.length; i++) {
    let v = final[i];

    if (!initialSet.has(v)) {
      cb(v);
      missing.add(v);
    }
  }
  return missing;
}

type Diff<T> = {
  add: Set<T>;
  del: Set<T>;
  finalState: T[];
  finalSet: Set<T>;
};

export function diffCollection(
  finalState: StableRecordIdentifier[],
  relationship: CollectionEdge,
  onAdd: (v: StableRecordIdentifier) => void,
  onDel: (v: StableRecordIdentifier) => void
): Diff<StableRecordIdentifier> {
  const finalSet = new Set(finalState);
  const { remoteState, remoteMembers } = relationship;

  if (finalState.length !== finalSet.size) {
    if (DEPRECATE_NON_UNIQUE_PAYLOADS) {
      const added = _deprecatedCompare(finalState, remoteMembers, onAdd);
      const removed = _compare(remoteState, finalSet, onDel);

      if (DEBUG) {
        deprecate(
          `Expected all entries in the relationship ${relationship.definition.type}:${relationship.definition.key} to be unique, see log for a list of duplicate entry indeces`,
          false,
          {
            id: 'ember-data:deprecate-non-unique-relationship-entries',
            for: 'ember-data',
            until: '5.0',
            since: { available: '4.8', enabled: '4.8' },
          }
        );
        // eslint-disable-next-line no-console
        console.log(added.duplicates);
      }

      return {
        add: added.missing,
        del: removed,
        finalState,
        finalSet,
      };
    }
    assert(`Expected all entries in the relationship to be unique, found duplicates`);
  }

  const added = _compare(finalState, remoteMembers, onAdd);
  const removed = _compare(remoteState, finalSet, onDel);

  return {
    add: added,
    del: removed,
    finalState,
    finalSet,
  };
}

export function computeLocalState(storage: CollectionEdge): StableRecordIdentifier[] {
  if (!storage.isDirty) {
    assert(`Expected localState to be present`, Array.isArray(storage.localState));
    return storage.localState;
  }

  let state = storage.remoteState.slice();

  storage.removals?.forEach((v) => {
    let index = state.indexOf(v);
    state.splice(index, 1);
  });

  storage.additions?.forEach((v) => {
    state.push(v);
  });
  storage.localState = state;
  storage.isDirty = false;

  return state;
}
