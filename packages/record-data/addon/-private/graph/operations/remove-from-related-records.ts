import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import { ResolvedRegistry } from '@ember-data/types';
import { HasManyRelationshipFieldsFor, RecordType, RelatedType, RelationshipFieldsFor } from '@ember-data/types/utils';

import type ManyRelationship from '../../relationships/state/has-many';
import type { RemoveFromRelatedRecordsOperation } from '../-operations';
import { assertNarrows, isHasMany } from '../-utils';
import type { Graph } from '../index';
import { removeFromInverse } from './replace-related-records';

export default function removeFromRelatedRecords<R extends ResolvedRegistry>(
  graph: Graph<R>,
  op: RemoveFromRelatedRecordsOperation<R>,
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

function removeRelatedRecord<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends HasManyRelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  relationship: ManyRelationship<R, T, F>,
  record: StableRecordIdentifier<T>,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
) {
  assert(`expected an identifier to add to the relationship`, value);
  assertNarrows<StableRecordIdentifier<RT>>(`expected identifier to be of the correct type`, true, value);
  const { members, currentState } = relationship;

  if (!members.has(value)) {
    return;
  }

  members.delete(value);
  let index = currentState.indexOf(value);

  assert(`expected members and currentState to be in sync`, index !== -1);
  currentState.splice(index, 1);

  // we lie on this type because the inverse could be an implicit relationship field, but "string" would lose value
  // for the graph the rest of the time.
  removeFromInverse(graph, value, relationship.definition.inverseKey as RelationshipFieldsFor<R, RT>, record, isRemote);
}
