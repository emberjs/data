import { DEBUG } from '@glimmer/env';

import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordDataStoreWrapper } from '@ember-data/types/q/record-data-store-wrapper';

import type { UpgradedMeta } from './-edge-definition';
import { getStore } from './-utils';
import { Graph, Graphs } from './graph';

export interface ImplicitRelationship {
  definition: UpgradedMeta;
  identifier: StableRecordIdentifier;
  localMembers: Set<StableRecordIdentifier>;
  remoteMembers: Set<StableRecordIdentifier>;
}

function isStore(maybeStore: unknown): maybeStore is Store {
  return (maybeStore as Store)._instanceCache !== undefined;
}

function getWrapper(store: RecordDataStoreWrapper | Store): RecordDataStoreWrapper {
  return isStore(store) ? store._instanceCache._storeWrapper : store;
}

export function peekGraph(store: RecordDataStoreWrapper | Store): Graph | undefined {
  return Graphs.get(getWrapper(store));
}
export type peekGraph = typeof peekGraph;

export function graphFor(store: RecordDataStoreWrapper | Store): Graph {
  const wrapper = getWrapper(store);
  let graph = Graphs.get(wrapper);

  if (!graph) {
    graph = new Graph(wrapper);
    Graphs.set(wrapper, graph);

    // in DEBUG we attach the graph to the main store for improved debuggability
    if (DEBUG) {
      Graphs.set(getStore(wrapper) as unknown as RecordDataStoreWrapper, graph);
    }
  }
  return graph;
}
