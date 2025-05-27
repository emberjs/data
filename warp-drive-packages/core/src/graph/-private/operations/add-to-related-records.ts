import { assert } from '@warp-drive/core/build-config/macros';

import type { AddToResourceRelationshipMutation } from '../../../types/cache/mutations.ts';
import type { AddToResourceRelationshipOperation } from '../../../types/cache/operations.ts';
import type { ReplaceRelatedRecordOperation } from '../../../types/graph.ts';
import type { StableRecordIdentifier } from '../../../types/identifier.ts';
import { _add } from '../-diff.ts';
import { isBelongsTo, isHasMany, notifyChange } from '../-utils.ts';
import type { CollectionEdge } from '../edges/collection.ts';
import type { Graph } from '../graph.ts';
import replaceRelatedRecord from './replace-related-record.ts';
import { addToInverse } from './replace-related-records.ts';

export default function addToRelatedRecords(
  graph: Graph,
  op: AddToResourceRelationshipOperation | AddToResourceRelationshipMutation,
  isRemote: boolean
) {
  const { record, value, index } = op;
  const relationship = graph.get(record, op.field);

  const _isBelongsTo = isBelongsTo(relationship);
  if (isRemote && _isBelongsTo) {
    if (value !== relationship.remoteState) {
      const newOp: ReplaceRelatedRecordOperation = {
        op: 'replaceRelatedRecord',
        record,
        field: op.field,
        value: value as StableRecordIdentifier,
      };
      return replaceRelatedRecord(graph, newOp, isRemote);
    }
    assert(
      `Expected '${value?.lid}' (the value to add) to NOT be the same as the remote state '${relationship.remoteState?.lid ?? '<null>'}'`,
      value === relationship.remoteState
    );
    return;
  }

  assert(
    `You can only '${op.op}' on a hasMany relationship. ${record.type}.${op.field} is a ${relationship.definition.kind}`,
    isHasMany(relationship)
  );

  // if we are not dirty but have a null localState then we
  // are mutating a relationship that has never been fetched
  // so we initialize localState to an empty array
  if (!relationship.isDirty && !relationship.localState) {
    relationship.localState = [];
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      addRelatedRecord(graph, relationship, record, value[i], index !== undefined ? index + i : null, isRemote);
    }
  } else {
    addRelatedRecord(graph, relationship, record, value, index ?? null, isRemote);
  }

  notifyChange(graph, relationship);
}

function addRelatedRecord(
  graph: Graph,
  relationship: CollectionEdge,
  record: StableRecordIdentifier,
  value: StableRecordIdentifier,
  index: number | null,
  isRemote: boolean
) {
  assert(`expected an identifier to add to the collection relationship`, value);

  if (_add(graph, record, relationship, value, index, isRemote)) {
    addToInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
  }
}
