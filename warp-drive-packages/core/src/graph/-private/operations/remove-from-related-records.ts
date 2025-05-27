import { assert } from '@warp-drive/core/build-config/macros';

import type { RemoveFromResourceRelationshipMutation } from '../../../types/cache/mutations.ts';
import type { RemoveFromResourceRelationshipOperation } from '../../../types/cache/operations.ts';
import type { ReplaceRelatedRecordOperation } from '../../../types/graph.ts';
import type { StableRecordIdentifier } from '../../../types/identifier.ts';
import { _remove } from '../-diff.ts';
import { isBelongsTo, isHasMany, notifyChange } from '../-utils.ts';
import type { CollectionEdge } from '../edges/collection.ts';
import type { Graph } from '../graph.ts';
import replaceRelatedRecord from './replace-related-record.ts';
import { removeFromInverse } from './replace-related-records.ts';

export default function removeFromRelatedRecords(
  graph: Graph,
  op: RemoveFromResourceRelationshipOperation | RemoveFromResourceRelationshipMutation,
  isRemote: boolean
) {
  const { record, value } = op;
  const relationship = graph.get(record, op.field);

  const _isBelongsTo = isBelongsTo(relationship);
  if (isRemote && _isBelongsTo) {
    if (value === relationship.remoteState) {
      const newOp: ReplaceRelatedRecordOperation = {
        op: 'replaceRelatedRecord',
        record,
        field: op.field,
        value: null,
      };
      return replaceRelatedRecord(graph, newOp, isRemote);
    }
    assert(
      `Expected '${(value as StableRecordIdentifier)?.lid}' (the value to remove) to be the same as the remote state '${relationship.remoteState?.lid ?? '<null>'}'`,
      value === relationship.remoteState
    );
    return;
  }

  assert(
    `You can only '${op.op}' on a hasMany relationship. ${record.type}.${op.field} is a ${relationship.definition.kind}`,
    isHasMany(relationship)
  );

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      removeRelatedRecord(graph, record, relationship, value[i], op.index ?? null, isRemote);
    }
  } else {
    removeRelatedRecord(graph, record, relationship, value, op.index ?? null, isRemote);
  }

  notifyChange(graph, relationship);
}

function removeRelatedRecord(
  graph: Graph,
  record: StableRecordIdentifier,
  relationship: CollectionEdge,
  value: StableRecordIdentifier,
  index: number | null,
  isRemote: boolean
) {
  assert(`expected an identifier to remove from the collection relationship`, value);
  if (_remove(graph, record, relationship, value, index, isRemote)) {
    removeFromInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
  }
}
