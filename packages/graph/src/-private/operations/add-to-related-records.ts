import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { AddToRelatedRecordsOperation } from '@warp-drive/core-types/graph';

import { _addLocal } from '../-diff';
import { isHasManyEdge, notifyChange } from '../-utils';
import type { LegacyHasManyEdge } from '../edges/has-many';
import type { Graph } from '../graph';
import { addToInverse } from './replace-related-records';

export default function addToRelatedRecords(graph: Graph, op: AddToRelatedRecordsOperation, isRemote: false) {
  assert(
    `Graph does not yet support updating the remote state of a relationship via the ${op.op} operation`,
    !isRemote
  );
  const { record, value, index } = op;
  const relationship = graph.get(record, op.field);
  assert(
    `You can only '${op.op}' on a hasMany relationship. ${record.type}.${op.field} is a ${relationship.definition.kind}`,
    isHasManyEdge(relationship)
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
  relationship: LegacyHasManyEdge,
  record: StableRecordIdentifier,
  value: StableRecordIdentifier,
  index: number | undefined,
  isRemote: false
) {
  assert(`expected an identifier to add to the collection relationship`, value);

  if (_addLocal(graph, record, relationship, value, index ?? null)) {
    addToInverse(graph, value, relationship.definition.inverseKey, record, isRemote);
  }
}
