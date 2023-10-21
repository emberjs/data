import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { _removeLocal } from '../-diff';
import type { RemoveFromRelatedRecordsOperation } from '../-operations';
import { isHasMany, notifyChange } from '../-utils';
import type { CollectionEdge } from '../edges/collection';
import type { Graph } from '../graph';
import { removeFromInverse } from './replace-related-records';

export default function removeFromRelatedRecords(graph: Graph, op: RemoveFromRelatedRecordsOperation, isRemote: false) {
  assert(
    `Graph does not yet support updating the remote state of a relationship via the ${op.op} operation`,
    !isRemote
  );
  const { record, value } = op;
  const relationship = graph.get(record, op.field);
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
  notifyChange(graph, relationship.identifier, relationship.definition.key);
}

function removeRelatedRecord(
  graph: Graph,
  relationship: CollectionEdge,
  record: StableRecordIdentifier,
  value: StableRecordIdentifier,
  isRemote: false
) {
  assert(`expected an identifier to remove from the collection relationship`, value);
  if (_removeLocal(relationship, value)) {
    removeFromInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
  }
}
