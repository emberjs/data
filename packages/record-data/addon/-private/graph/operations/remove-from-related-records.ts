import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';

import type ManyRelationship from '../../relationships/state/has-many';
import type { RemoveFromRelatedRecordsOperation } from '../-operations';
import { isHasMany } from '../-utils';
import type { Graph } from '../index';
import { removeFromInverse } from './replace-related-records';

export default function removeFromRelatedRecords(
  graph: Graph,
  op: RemoveFromRelatedRecordsOperation,
  isRemote: boolean
) {
  const { record, value } = op;
  const relationship = graph.get(record, op.field);
  assert(
    `You can only '${op.op}' on a hasMany relationship. ${record.type}.${op.field} is a ${relationship.definition.kind}`,
    isHasMany(relationship)
  );
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      removeRelatedRecord(graph, relationship, record, value[i], isRemote);
    }
  } else {
    removeRelatedRecord(graph, relationship, record, value, isRemote);
  }
  relationship.notifyHasManyChange();
}

function removeRelatedRecord(
  graph: Graph,
  relationship: ManyRelationship,
  record: StableRecordIdentifier,
  value: StableRecordIdentifier,
  isRemote: boolean
) {
  assert(`expected an identifier to add to the relationship`, value);
  const { members, currentState } = relationship;

  if (!members.has(value)) {
    return;
  }

  members.delete(value);
  let index = currentState.indexOf(value);

  assert(`expected members and currentState to be in sync`, index !== -1);
  currentState.splice(index, 1);

  removeFromInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
}
