import { assert } from '@warp-drive/build-config/macros';
import type { ResourceCacheKey } from '@warp-drive/core-types';
import type { AddToResourceRelationshipMutation } from '@warp-drive/core-types/cache/mutations';
import type { AddToResourceRelationshipOperation } from '@warp-drive/core-types/cache/operations';
import type { ReplaceRelatedRecordOperation } from '@warp-drive/core-types/graph';

import { _add } from '../-diff';
import { isBelongsTo, isHasMany, notifyChange } from '../-utils';
import type { CollectionEdge } from '../edges/collection';
import type { Graph } from '../graph';
import replaceRelatedRecord from './replace-related-record';
import { addToInverse } from './replace-related-records';

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
        value: value as ResourceCacheKey,
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
  record: ResourceCacheKey,
  value: ResourceCacheKey,
  index: number | null,
  isRemote: boolean
) {
  assert(`expected an identifier to add to the collection relationship`, value);

  if (_add(graph, record, relationship, value, index, isRemote)) {
    addToInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
  }
}
