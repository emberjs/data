import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { assertPolymorphicType } from '../../debug/assert-polymorphic-type';
import type ManyRelationship from '../../relationships/state/has-many';
import type { AddToRelatedRecordsOperation } from '../-operations';
import { isHasMany, notifyChange } from '../-utils';
import type { Graph } from '../graph';
import { addToInverse } from './replace-related-records';

export default function addToRelatedRecords(graph: Graph, op: AddToRelatedRecordsOperation, isRemote: boolean) {
  const { record, value, index } = op;
  const relationship = graph.get(record, op.field);
  assert(
    `You can only '${op.op}' on a hasMany relationship. ${record.type}.${op.field} is a ${relationship.definition.kind}`,
    isHasMany(relationship)
  );
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      addRelatedRecord(graph, relationship, record, value[i], index !== undefined ? index + i : index, isRemote);
    }
  } else {
    addRelatedRecord(graph, relationship, record, value, index, isRemote);
  }

  notifyChange(graph, relationship.identifier, relationship.definition.key);
}

function addRelatedRecord(
  graph: Graph,
  relationship: ManyRelationship,
  record: StableRecordIdentifier,
  value: StableRecordIdentifier,
  index: number | undefined,
  isRemote: boolean
) {
  assert(`expected an identifier to add to the relationship`, value);
  const { localMembers, localState } = relationship;

  if (localMembers.has(value)) {
    return;
  }

  const { type } = relationship.definition;
  if (type !== value.type) {
    if (DEBUG) {
      assertPolymorphicType(record, relationship.definition, value, graph.store);
    }
    graph.registerPolymorphicType(value.type, type);
  }

  relationship.state.hasReceivedData = true;
  localMembers.add(value);
  if (index === undefined) {
    localState.push(value);
  } else {
    localState.splice(index, 0, value);
  }

  addToInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
}
