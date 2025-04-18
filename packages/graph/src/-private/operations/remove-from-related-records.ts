import { assert } from '@warp-drive/build-config/macros';
import type { ResourceCacheKey } from '@warp-drive/core-types';
import type { RemoveFromResourceRelationshipMutation } from '@warp-drive/core-types/cache/mutations';
import type { RemoveFromResourceRelationshipOperation } from '@warp-drive/core-types/cache/operations';
import type { ReplaceRelatedRecordOperation } from '@warp-drive/core-types/graph';

import { _remove } from '../-diff';
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
      `Expected '${(value as ResourceCacheKey)?.lid}' (the value to remove) to be the same as the remote state '${relationship.remoteState?.lid ?? '<null>'}'`,
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
  record: ResourceCacheKey,
  relationship: CollectionEdge,
  value: ResourceCacheKey,
  index: number | null,
  isRemote: boolean
) {
  assert(`expected an identifier to remove from the collection relationship`, value);
  if (_remove(graph, record, relationship, value, index, isRemote)) {
    removeFromInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
  }
}
