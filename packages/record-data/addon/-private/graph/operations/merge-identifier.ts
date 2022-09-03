import type { MergeOperation } from '@ember-data/types/q/record-data';
import type { Dict } from '@ember-data/types/q/utils';

import { forAllRelatedIdentifiers, isBelongsTo, isHasMany, notifyChange } from '../-utils';
import { CollectionRelationship } from '../edges/collection';
import type { ResourceRelationship } from '../edges/resource';
import type { Graph, ImplicitRelationship, RelationshipEdge } from '../graph';

export function mergeIdentifier(graph: Graph, op: MergeOperation, relationships: Dict<RelationshipEdge>) {
  Object.keys(relationships).forEach((key) => {
    const rel = relationships[key];
    if (!rel) {
      return;
    }
    mergeIdentifierForRelationship(graph, op, rel);
  });
}

function mergeIdentifierForRelationship(graph: Graph, op: MergeOperation, rel: RelationshipEdge): void {
  rel.identifier = op.value;
  forAllRelatedIdentifiers(rel, (identifier) => {
    const inverse = graph.get(identifier, rel.definition.inverseKey);
    mergeInRelationship(graph, inverse, op);
  });
}

function mergeInRelationship(graph: Graph, rel: RelationshipEdge, op: MergeOperation): void {
  if (isBelongsTo(rel)) {
    mergeBelongsTo(graph, rel, op);
  } else if (isHasMany(rel)) {
    mergeHasMany(graph, rel, op);
  } else {
    mergeImplicit(graph, rel, op);
  }
}

function mergeBelongsTo(graph: Graph, rel: ResourceRelationship, op: MergeOperation): void {
  if (rel.remoteState === op.record) {
    rel.remoteState = op.value;
  }
  if (rel.localState === op.record) {
    rel.localState = op.record;
    notifyChange(graph, rel.identifier, rel.definition.key);
  }
}

function mergeHasMany(graph: Graph, rel: CollectionRelationship, op: MergeOperation): void {
  let found = false;
  if (rel.remoteMembers.has(op.record)) {
    found = true;
    rel.remoteMembers.delete(op.record);
    rel.remoteMembers.add(op.value);
    const index = rel.remoteState.indexOf(op.record);
    rel.remoteState.splice(index, 1, op.value);
  } else if (rel.additions?.has(op.record)) {
    found = true;
    rel.additions.delete(op.record);
    rel.additions.add(op.value);
  }

  if (rel.removals?.has(op.record)) {
    rel.removals.delete(op.record);
    rel.removals.add(op.value);
  } else if (found) {
    rel.isDirty = true;
    notifyChange(graph, rel.identifier, rel.definition.key);
  }
}

function mergeImplicit(graph: Graph, rel: ImplicitRelationship, op: MergeOperation): void {
  if (rel.remoteMembers.has(op.record)) {
    rel.remoteMembers.delete(op.record);
    rel.remoteMembers.add(op.value);
  }
  if (rel.localMembers.has(op.record)) {
    rel.localMembers.delete(op.record);
    rel.localMembers.add(op.value);
  }
}
