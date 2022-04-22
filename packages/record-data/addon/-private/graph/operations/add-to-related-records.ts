import { assert } from '@ember/debug';

import { assertPolymorphicType } from '@ember-data/store/-debug';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import { ResolvedRegistry } from '@ember-data/types';
import { RecordType, RelatedType, RelationshipFieldsFor } from '@ember-data/types/utils';

import type ManyRelationship from '../../relationships/state/has-many';
import type { AddToRelatedRecordsOperation } from '../-operations';
import { assertNarrows, isHasMany } from '../-utils';
import type { Graph } from '../index';
import { addToInverse } from './replace-related-records';

export default function addToRelatedRecords<R extends ResolvedRegistry>(
  graph: Graph<R>,
  op: AddToRelatedRecordsOperation<R>,
  isRemote: boolean
) {
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

  relationship.notifyHasManyChange();
}

function addRelatedRecord<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  relationship: ManyRelationship<R, T, F>,
  record: StableRecordIdentifier<T>,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  index: number | undefined,
  isRemote: boolean
) {
  assertNarrows<StableRecordIdentifier<RT>>(`expected identifier to be of the correct type`, true, value);
  assert(`expected an identifier to add to the relationship`, value);
  const { members, currentState } = relationship;

  if (members.has(value)) {
    return;
  }

  const { type } = relationship.definition;
  if (type !== value.type) {
    assertPolymorphicType(record, relationship.definition, value, graph.store);
    graph.registerPolymorphicType(value.type, type);
  }

  relationship.state.hasReceivedData = true;
  members.add(value);
  if (index === undefined) {
    currentState.push(value);
  } else {
    currentState.splice(index, 0, value);
  }

  // we lie on this type because the inverse could be an implicit relationship field, but "string" would lose value
  // for the graph the rest of the time.
  addToInverse(graph, value, relationship.definition.inverseKey as RelationshipFieldsFor<R, RT>, record, isRemote);
}
