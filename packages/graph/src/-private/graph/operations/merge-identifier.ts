import type { MergeOperation } from '@ember-data/types/q/cache';
import type { Dict } from '@ember-data/types/q/utils';

import type BelongsToRelationship from '../../relationships/state/belongs-to';
import type ManyRelationship from '../../relationships/state/has-many';
import { forAllRelatedIdentifiers, isBelongsTo, isHasMany, notifyChange } from '../-utils';
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

function mergeBelongsTo(graph: Graph, rel: BelongsToRelationship, op: MergeOperation): void {
  if (rel.remoteState === op.record) {
    rel.remoteState = op.value;
  }
  if (rel.localState === op.record) {
    rel.localState = op.record;
    notifyChange(graph, rel.identifier, rel.definition.key);
  }
}

function mergeHasMany(graph: Graph, rel: ManyRelationship, op: MergeOperation): void {
  if (rel.remoteMembers.has(op.record)) {
    rel.remoteMembers.delete(op.record);
    rel.remoteMembers.add(op.value);
    const index = rel.remoteState.indexOf(op.record);
    rel.remoteState.splice(index, 1, op.value);
  }
  if (rel.localMembers.has(op.record)) {
    rel.localMembers.delete(op.record);
    rel.localMembers.add(op.value);
    const index = rel.localState.indexOf(op.record);
    rel.localState.splice(index, 1, op.value);
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
