import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import type { AddToRelatedRecordsOperation } from '../-operations';
import { isHasMany, notifyChange } from '../-utils';
import type { CollectionRelationship } from '../edges/collection';
import type { Graph } from '../graph';
import { _add, addToInverse } from './replace-related-records';

export default function addToRelatedRecords(graph: Graph, op: AddToRelatedRecordsOperation, isRemote: false) {
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
  relationship: CollectionRelationship,
  record: StableRecordIdentifier,
  value: StableRecordIdentifier,
  index: number | undefined,
  isRemote: false
) {
  assert(`expected an identifier to add to the relationship`, value);
  if (_add(graph, record, relationship, value)) {
    relationship.state.hasReceivedData = true;
    addToInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
  }
}
