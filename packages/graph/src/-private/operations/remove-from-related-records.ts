import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { RemoveFromResourceRelationshipMutation } from '@warp-drive/core-types/cache/mutations';
import type { RemoveFromResourceRelationshipOperation } from '@warp-drive/core-types/cache/operations';
import type { ReplaceRelatedRecordOperation } from '@warp-drive/core-types/graph';

import { _removeLocal } from '../-diff';
import { isBelongsTo, isHasMany, notifyChange } from '../-utils';
import type { CollectionEdge } from '../edges/collection';
import type { Graph } from '../graph';
import replaceRelatedRecord from './replace-related-record';
import { removeFromInverse } from './replace-related-records';

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
  // TODO we should potentially thread the index information through here
  // when available as it may make it faster to remove from the local state
  // when trying to patch more efficiently without blowing away the entire
  // local state array
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      removeRelatedRecord(graph, relationship, record, value[i], isRemote);
    }
  } else {
    removeRelatedRecord(graph, relationship, record, value, isRemote);
  }
  notifyChange(graph, relationship);
}

function removeRelatedRecord(
  graph: Graph,
  relationship: CollectionEdge,
  record: StableRecordIdentifier,
  value: StableRecordIdentifier,
  isRemote: boolean
) {
  assert(`expected an identifier to remove from the collection relationship`, value);
  if (!isRemote) {
    if (_removeLocal(relationship, value)) {
      removeFromInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
    }
  } else {
    // FIXME
  }
}
