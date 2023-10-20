import type { MergeOperation } from '@ember-data/store/-types/q/cache';

import { forAllRelatedIdentifiers, isBelongsTo, isHasMany, notifyChange } from '../-utils';
import type { CollectionEdge } from '../edges/collection';
import type { ImplicitEdge } from '../edges/implicit';
import type { ResourceEdge } from '../edges/resource';
import type { Graph, GraphEdge } from '../graph';

export function mergeIdentifier(graph: Graph, op: MergeOperation, relationships: Record<string, GraphEdge>) {
  Object.keys(relationships).forEach((key) => {
    const rel = relationships[key];
    if (!rel) {
      return;
    }
    mergeIdentifierForRelationship(graph, op, rel);
  });
}

function mergeIdentifierForRelationship(graph: Graph, op: MergeOperation, rel: GraphEdge): void {
  rel.identifier = op.value;
  forAllRelatedIdentifiers(rel, (identifier) => {
    const inverse = graph.get(identifier, rel.definition.inverseKey);
    mergeInRelationship(graph, inverse, op);
  });
}

function mergeInRelationship(graph: Graph, rel: GraphEdge, op: MergeOperation): void {
  if (isBelongsTo(rel)) {
    mergeBelongsTo(graph, rel, op);
  } else if (isHasMany(rel)) {
    mergeHasMany(graph, rel, op);
  } else {
    mergeImplicit(graph, rel, op);
  }
}

function mergeBelongsTo(graph: Graph, rel: ResourceEdge, op: MergeOperation): void {
  if (rel.remoteState === op.record) {
    rel.remoteState = op.value;
  }
  if (rel.localState === op.record) {
    rel.localState = op.record;
    notifyChange(graph, rel.identifier, rel.definition.key);
  }
}

function mergeHasMany(graph: Graph, rel: CollectionEdge, op: MergeOperation): void {
  if (rel.remoteMembers.has(op.record)) {
    rel.remoteMembers.delete(op.record);
    rel.remoteMembers.add(op.value);
    const index = rel.remoteState.indexOf(op.record);
    rel.remoteState.splice(index, 1, op.value);
    rel.isDirty = true;
  }
  if (rel.additions?.has(op.record)) {
    rel.additions.delete(op.record);
    rel.additions.add(op.value);
    rel.isDirty = true;
  }
  if (rel.removals?.has(op.record)) {
    rel.removals.delete(op.record);
    rel.removals.add(op.value);
    rel.isDirty = true;
  }
  if (rel.isDirty) {
    notifyChange(graph, rel.identifier, rel.definition.key);
  }
}

function mergeImplicit(graph: Graph, rel: ImplicitEdge, op: MergeOperation): void {
  if (rel.remoteMembers.has(op.record)) {
    rel.remoteMembers.delete(op.record);
    rel.remoteMembers.add(op.value);
  }
  if (rel.localMembers.has(op.record)) {
    rel.localMembers.delete(op.record);
    rel.localMembers.add(op.value);
  }
}
