import { assert } from '@ember/debug';

import { assertPolymorphicType } from '@ember-data/store/-debug';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import { ResolvedRegistry } from '@ember-data/types';
import {
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordType,
  RelatedType,
  RelationshipFieldsFor,
} from '@ember-data/types/utils';

import type { ManyRelationship } from '../..';
import type { ReplaceRelatedRecordsOperation } from '../-operations';
import { assertNarrows, isBelongsTo, isHasMany, isImplicit, isNew } from '../-utils';
import type { Graph, RelationshipEdge } from '../index';

/*
    case many:1
    ========
    In a bi-directional graph with Many:1 edges, adding a value
    results in up-to 3 discrete value transitions, while removing
    a value is only 2 transitions.

    For adding C to A
    If: A <<-> B, C <->> D is the initial state,
    and: B <->> A <<-> C, D is the final state

    then we would undergo the following transitions.

    add C to A
    remove C from D
    add A to C

    For removing B from A
    If: A <<-> B, C <->> D is the initial state,
    and: A, B, C <->> D is the final state

    then we would undergo the following transitions.

    remove B from A
    remove A from B

    case many:many
    ===========
    In a bi-directional graph with Many:Many edges, adding or
    removing a value requires only 2 value transitions.

    For Adding
    If: A<<->>B, C<<->>D is the initial state (double arrows representing the many side)
    And: D<<->>C<<->>A<<->>B is the final state

    Then we would undergo two transitions.

    add C to A.
    add A to C

    For Removing
    If: A<<->>B, C<<->>D is the initial state (double arrows representing the many side)
    And: A, B, C<<->>D is the final state

    Then we would undergo two transitions.

    remove B from A
    remove A from B

    case many:?
    ========
    In a uni-directional graph with Many:? edges (modeled in EmberData with `inverse:null`) with
    artificial (implicit) inverses, replacing a value results in 2 discrete value transitions.
    This is because a Many:? relationship is effectively Many:Many.
  */
export default function replaceRelatedRecords<R extends ResolvedRegistry>(
  graph: Graph<R>,
  op: ReplaceRelatedRecordsOperation<R>,
  isRemote: boolean
) {
  if (isRemote) {
    replaceRelatedRecordsRemote(graph, op, isRemote);
  } else {
    replaceRelatedRecordsLocal(graph, op, isRemote);
  }
}

function replaceRelatedRecordsLocal<R extends ResolvedRegistry>(
  graph: Graph<R>,
  op: ReplaceRelatedRecordsOperation<R>,
  isRemote: boolean
) {
  type T = typeof op.record.type;
  type F = typeof op.field;

  const relationship = graph.get(op.record, op.field) as RelationshipEdge<R, T, F>;
  assert(`expected hasMany relationship`, isHasMany(relationship));
  relationship.state.hasReceivedData = true;
  type RT = typeof relationship.definition.type;
  const identifiers = op.value as StableRecordIdentifier<RT>[];

  // cache existing state
  const { currentState, members, definition } = relationship;
  const newValues = new Set(identifiers);
  const identifiersLength = identifiers.length;
  const newState = new Array(newValues.size);
  const newMembership = new Set<StableRecordIdentifier<RT>>();

  // wipe existing state
  relationship.members = newMembership;
  relationship.currentState = newState;

  const { type } = relationship.definition;

  let changed = false;

  const currentLength = currentState.length;
  const iterationLength = currentLength > identifiersLength ? currentLength : identifiersLength;
  const equalLength = currentLength === identifiersLength;

  for (let i = 0, j = 0; i < iterationLength; i++) {
    let adv = false;
    if (i < identifiersLength) {
      const identifier = identifiers[i];
      // skip processing if we encounter a duplicate identifier in the array
      if (!newMembership.has(identifier)) {
        if (type !== identifier.type) {
          assertPolymorphicType(relationship.identifier, relationship.definition, identifier, graph.store);
          graph.registerPolymorphicType(type, identifier.type);
        }
        newState[j] = identifier;
        adv = true;
        newMembership.add(identifier);

        if (!members.has(identifier)) {
          changed = true;
          addToInverse<R, T, F, RT>(graph, identifier, definition.inverseKey, op.record, isRemote);
        }
      }
    }
    if (i < currentLength) {
      const identifier = currentState[i];

      // detect reordering
      if (!newMembership.has(identifier)) {
        if (equalLength && newState[i] !== identifier) {
          changed = true;
        }

        if (!newValues.has(identifier)) {
          changed = true;
          removeFromInverse(graph, identifier, definition.inverseKey, op.record, isRemote);
        }
      }
    }
    if (adv) {
      j++;
    }
  }

  if (changed) {
    relationship.notifyHasManyChange();
  }
}

function replaceRelatedRecordsRemote<R extends ResolvedRegistry>(
  graph: Graph<R>,
  op: ReplaceRelatedRecordsOperation<R>,
  isRemote: boolean
) {
  type T = typeof op.record.type;
  type F = typeof op.field;

  const relationship = graph.get(op.record, op.field) as RelationshipEdge<R, T, F>;
  type RT = typeof relationship.definition.type;
  const identifiers = op.value as StableRecordIdentifier<RT>[];

  assert(
    `You can only '${op.op}' on a hasMany relationship. ${op.record.type}.${op.field} is a ${relationship.definition.kind}`,
    isHasMany(relationship)
  );
  if (isRemote) {
    graph._addToTransaction(relationship);
  }
  relationship.state.hasReceivedData = true;

  // cache existing state
  const { canonicalState, canonicalMembers, definition } = relationship;
  const newValues = new Set(identifiers);
  const identifiersLength = identifiers.length;
  const newState = new Array(newValues.size);
  const newMembership = new Set<StableRecordIdentifier<RT>>();

  // wipe existing state
  relationship.canonicalMembers = newMembership;
  relationship.canonicalState = newState;

  const { type } = relationship.definition;

  let changed = false;

  const canonicalLength = canonicalState.length;
  const iterationLength = canonicalLength > identifiersLength ? canonicalLength : identifiersLength;
  const equalLength = canonicalLength === identifiersLength;

  for (let i = 0, j = 0; i < iterationLength; i++) {
    let adv = false;
    if (i < identifiersLength) {
      const identifier = identifiers[i];
      if (!newMembership.has(identifier)) {
        if (type !== identifier.type) {
          assertPolymorphicType(relationship.identifier, relationship.definition, identifier, graph.store);
          graph.registerPolymorphicType(type, identifier.type);
        }
        newState[j] = identifier;
        newMembership.add(identifier);
        adv = true;

        if (!canonicalMembers.has(identifier)) {
          changed = true;
          addToInverse<R, T, F, RT>(graph, identifier, definition.inverseKey, op.record, isRemote);
        }
      }
    }
    if (i < canonicalLength) {
      const identifier = canonicalState[i];

      if (!newMembership.has(identifier)) {
        // detect reordering
        if (equalLength && newState[j] !== identifier) {
          changed = true;
        }

        if (!newValues.has(identifier)) {
          changed = true;
          removeFromInverse(graph, identifier, definition.inverseKey, op.record, isRemote);
        }
      }
    }
    if (adv) {
      j++;
    }
  }

  if (changed) {
    flushCanonical(graph, relationship);
    /*
    replaceRelatedRecordsLocal(
      graph,
      {
        op: op.op,
        record: op.record,
        field: op.field,
        value: canonicalState,
      },
      false
    );*/
  } else {
    // preserve legacy behavior we want to change but requires some sort
    // of deprecation.
    flushCanonical(graph, relationship);
  }
}

export function addToInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends HasManyRelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  key: F,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
): void;
export function addToInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends BelongsToRelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  key: F,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
): void;
export function addToInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  key: F,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
): void;
export function addToInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  key: F,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
): void {
  const relationship = graph.get(identifier, key);
  const { type } = relationship.definition;

  if (type !== value.type) {
    assertPolymorphicType(relationship.identifier, relationship.definition, value, graph.store);
    graph.registerPolymorphicType(type, value.type);
  }

  if (isBelongsTo(relationship)) {
    assertNarrows<StableRecordIdentifier<RT>>(`expected identifier to be of the correct type`, true, value);
    relationship.state.hasReceivedData = true;
    relationship.state.isEmpty = false;

    if (isRemote) {
      graph._addToTransaction(relationship);
      if (relationship.remoteState !== null) {
        removeFromInverse(graph, relationship.remoteState, relationship.definition.inverseKey, identifier, isRemote);
      }
      relationship.remoteState = value;
    }

    if (relationship.localState !== value) {
      if (!isRemote && relationship.localState) {
        removeFromInverse(graph, relationship.localState, relationship.definition.inverseKey, identifier, isRemote);
      }
      relationship.localState = value;
      relationship.notifyBelongsToChange();
    }
  } else if (isHasMany(relationship)) {
    assertNarrows<StableRecordIdentifier<RelatedType<R, T, HasManyRelationshipFieldsFor<R, T>>>>(
      `expected identifier to be of the correct type`,
      true,
      value
    );
    if (isRemote) {
      if (!relationship.canonicalMembers.has(value)) {
        graph._addToTransaction(relationship);
        relationship.canonicalState.push(value);
        relationship.canonicalMembers.add(value);
        relationship.state.hasReceivedData = true;
        flushCanonical(graph, relationship);
      }
    } else {
      if (!relationship.members.has(value)) {
        relationship.currentState.push(value);
        relationship.members.add(value);
        relationship.state.hasReceivedData = true;
        relationship.notifyHasManyChange();
      }
    }
  } else if (isImplicit(relationship)) {
    assertNarrows<StableRecordIdentifier<RT>>(`expected identifier to be of the correct type`, true, value);
    if (isRemote) {
      relationship.addCanonicalMember(value);
    } else {
      relationship.addMember(value);
    }
  } else {
    assert(`The provided relationship was not a Many, BelongsTo or Implicit`);
  }
}

export function removeFromInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends HasManyRelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  key: F,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
): void;
export function removeFromInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends BelongsToRelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  key: F,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
): void;
export function removeFromInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  key: F,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
): void;
export function removeFromInverse<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  key: F,
  value: StableRecordIdentifier<RT> | StableRecordIdentifier<RecordType<R>>,
  isRemote: boolean
): void {
  const relationship = graph.get(identifier, key);

  if (isBelongsTo(relationship)) {
    relationship.state.isEmpty = true;
    if (isRemote) {
      graph._addToTransaction(relationship);
      relationship.remoteState = null;
    }
    if (relationship.localState === value) {
      relationship.localState = null;
      relationship.notifyBelongsToChange();
    }
  } else if (isHasMany(relationship)) {
    assertNarrows<StableRecordIdentifier<RelatedType<R, T, HasManyRelationshipFieldsFor<R, T>>>>(
      `expected identifier to be of the correct type`,
      true,
      value
    );
    if (isRemote) {
      graph._addToTransaction(relationship);
      let index = relationship.canonicalState.indexOf(value);
      if (index !== -1) {
        relationship.canonicalMembers.delete(value);
        relationship.canonicalState.splice(index, 1);
      }
    }
    let index = relationship.currentState.indexOf(value);
    if (index !== -1) {
      relationship.members.delete(value);
      relationship.currentState.splice(index, 1);
    }
    relationship.notifyHasManyChange();
  } else if (isImplicit(relationship)) {
    assertNarrows<StableRecordIdentifier<RT>>(`expected identifier to be of the correct type`, true, value);
    if (isRemote) {
      relationship.removeCompletelyFromOwn(value);
    } else {
      relationship.removeMember(value);
    }
  } else {
    assert(`The provided relationship was not a Many, BelongsTo or Implicit`);
  }
}

export function syncRemoteToLocal<R extends ResolvedRegistry>(rel: ManyRelationship<R>) {
  type RT = typeof rel.definition.type;
  let toAdd = rel.canonicalState;
  let newIdentifiers = rel.currentState.filter(
    (relatedIdentifier: StableRecordIdentifier<RT>) =>
      isNew<R, RT>(relatedIdentifier) && toAdd.indexOf(relatedIdentifier) === -1
  );
  let existingState = rel.currentState;
  rel.currentState = toAdd.concat(newIdentifiers);

  let members = (rel.members = new Set<StableRecordIdentifier<RT>>());
  rel.canonicalMembers.forEach((v) => members.add(v));
  for (let i = 0; i < newIdentifiers.length; i++) {
    members.add(newIdentifiers[i]);
  }

  // TODO always notifying fails only one test and we should probably do away with it
  if (existingState.length !== rel.currentState.length) {
    rel.notifyHasManyChange();
  } else {
    for (let i = 0; i < existingState.length; i++) {
      if (existingState[i] !== rel.currentState[i]) {
        rel.notifyHasManyChange();
        break;
      }
    }
  }
}

function flushCanonical<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends HasManyRelationshipFieldsFor<R, T>
>(graph: Graph<R>, rel: ManyRelationship<R, T, F>) {
  graph._scheduleLocalSync(rel);
}
