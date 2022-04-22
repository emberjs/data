import { assert, inspect, warn } from '@ember/debug';

import { expectTypeOf } from 'expect-type';

import { coerceId, recordDataFor as peekRecordData } from '@ember-data/store/-private';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RecordData } from '@ember-data/store/-private/ts-interfaces/record-data';
import type { ResolvedRegistry } from '@ember-data/types';
import type { AsyncBelongsTo, AsyncHasMany, BelongsTo, HasMany } from '@ember-data/types/legacy-model';
import type {
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordType,
  RelationshipFieldsFor,
} from '@ember-data/types/utils';

import type BelongsToRelationship from '../relationships/state/belongs-to';
import type ManyRelationship from '../relationships/state/has-many';
import type ImplicitRelationship from '../relationships/state/implicit';
import type { RelationshipRecordData } from '../ts-interfaces/relationship-record-data';
import type { UpdateRelationshipOperation } from './-operations';
import type { Graph } from './index';

export function assertValidRelationshipPayload<R extends ResolvedRegistry>(
  graph: Graph<R>,
  op: UpdateRelationshipOperation<R>
) {
  type T = typeof op.record.type;
  type F = typeof op.field;
  type Rel = ManyRelationship<R, T, F> | ImplicitRelationship<R, T, F> | BelongsToRelationship<R, T, F>;
  const relationship = graph.get(op.record, op.field) as Rel;
  assert(`Cannot update an implicit relationship`, isHasMany(relationship) || isBelongsTo(relationship));

  const payload = op.value;
  const { definition, identifier, state } = relationship;
  const { type } = identifier;
  const { field } = op;
  const { isAsync, kind } = definition;

  if (payload.links) {
    warn(
      `You pushed a record of type '${type}' with a relationship '${field}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty.`,
      isAsync || !!payload.data || state.hasReceivedData,
      {
        id: 'ds.store.push-link-for-sync-relationship',
      }
    );
  } else if (payload.data) {
    if (kind === 'belongsTo') {
      assert(
        `A ${type} record was pushed into the store with the value of ${field} being ${inspect(
          payload.data
        )}, but ${field} is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`,
        !Array.isArray(payload.data)
      );
      assertRelationshipData(graph.store._store, identifier, payload.data, definition);
    } else if (kind === 'hasMany') {
      assert(
        `A ${type} record was pushed into the store with the value of ${field} being '${inspect(
          payload.data
        )}', but ${field} is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.`,
        Array.isArray(payload.data)
      );
      if (Array.isArray(payload.data)) {
        for (let i = 0; i < payload.data.length; i++) {
          assertRelationshipData(graph.store._store, identifier, payload.data[i], definition);
        }
      }
    }
  }
}

export function isNew<R extends ResolvedRegistry, T extends RecordType<R>>(
  identifier: StableRecordIdentifier<T>
): boolean {
  if (!identifier.id) {
    return true;
  }
  const recordData = peekRecordData<R, T>(identifier);
  return recordData ? isRelationshipRecordData(recordData) && recordData.isNew() : false;
}

function isRelationshipRecordData<R extends ResolvedRegistry, T extends RecordType<R>>(
  recordData: RecordData<R, T> | RelationshipRecordData<R, T>
): recordData is RelationshipRecordData<R, T> {
  return typeof (recordData as RelationshipRecordData<R, T>).isNew === 'function';
}

export function isBelongsTo<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  MF extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>,
  BF extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>,
  IF extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
>(
  relationship:
    | ManyRelationship<R, T, IF>
    | ManyRelationship<R, T, MF>
    | ImplicitRelationship<R, T, IF>
    | BelongsToRelationship<R, T, BF>
    | BelongsToRelationship<R, T, IF>
): relationship is BelongsToRelationship<R, T, BF> {
  return relationship.definition.kind === 'belongsTo';
}

export function isImplicit<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  MF extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>,
  BF extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>,
  IF extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
>(
  relationship:
    | ManyRelationship<R, T, IF>
    | ManyRelationship<R, T, MF>
    | ImplicitRelationship<R, T, IF>
    | BelongsToRelationship<R, T, IF>
    | BelongsToRelationship<R, T, BF>
): relationship is ImplicitRelationship<R, T, IF> {
  return relationship.definition.isImplicit;
}

export function isHasMany<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  MF extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>,
  BF extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>,
  IF extends RelationshipFieldsFor<R, T> = RelationshipFieldsFor<R, T>
>(
  relationship:
    | ManyRelationship<R, T, IF>
    | ManyRelationship<R, T, MF>
    | ImplicitRelationship<R, T, IF>
    | BelongsToRelationship<R, T, IF>
    | BelongsToRelationship<R, T, BF>
): relationship is ManyRelationship<R, T, MF> {
  return relationship.definition.kind === 'hasMany';
}

export function assertRelationshipData(store, identifier, data, meta) {
  assert(
    `A ${identifier.type} record was pushed into the store with the value of ${meta.key} being '${JSON.stringify(
      data
    )}', but ${
      meta.key
    } is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`,
    !Array.isArray(data)
  );
  assert(
    `Encountered a relationship identifier without a type for the ${meta.kind} relationship '${meta.key}' on <${
      identifier.type
    }:${identifier.id}>, expected a json-api identifier with type '${meta.type}' but found '${JSON.stringify(
      data
    )}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || (typeof data.type === 'string' && data.type.length)
  );
  assert(
    `Encountered a relationship identifier without an id for the ${meta.kind} relationship '${meta.key}' on <${
      identifier.type
    }:${identifier.id}>, expected a json-api identifier but found '${JSON.stringify(
      data
    )}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || !!coerceId(data.id)
  );
  assert(
    `Encountered a relationship identifier with type '${data.type}' for the ${meta.kind} relationship '${meta.key}' on <${identifier.type}:${identifier.id}>, Expected a json-api identifier with type '${meta.type}'. No model was found for '${data.type}'.`,
    data === null || !data.type || store._hasModelFor(data.type)
  );
}

export function assertNarrows<T>(msg: string, cond: unknown, value: T | unknown): asserts value is T {
  assert(msg, cond);
}

// ###########################
// ###########################
// ###########################
// -------[[ TESTS ]]---------
// ###########################
// ###########################
// ###########################

declare class User {
  declare name: string;
  declare friends: AsyncHasMany<Person, _R>;
  declare spouse: AsyncBelongsTo<Person, _R>;
  declare bestFriend: BelongsTo<Person, _R>;
  declare enemies: HasMany<Person, _R>;
}
declare class Person {
  declare name: string;
  declare parent: BelongsTo<User, _R>;
}
declare class Post {
  declare title: string;
}

type TestRegistry1 = {
  model: {
    person: Person;
    user: User;
    post: Post;
  };
  serializer: {};
  adapter: {};
  transform: {};
};
type _R = ResolvedRegistry<TestRegistry1>;
type _T = 'user';
type _AllRF = RelationshipFieldsFor<_R, _T>;
type _MF = HasManyRelationshipFieldsFor<_R, _T>;
type _BF = BelongsToRelationshipFieldsFor<_R, _T>;

declare function getType<T>(): T;

let unknownRelationship = getType<
  ManyRelationship<_R, _T, _AllRF> | BelongsToRelationship<_R, _T, _AllRF> | ImplicitRelationship<_R, _T, _AllRF>
>();
let knownManyRelationship = getType<ManyRelationship<_R, _T, _MF>>();
let knownImplicitRelationship = getType<ImplicitRelationship<_R, _T, _AllRF>>();
let knownBelongsToRelationship = getType<BelongsToRelationship<_R, _T, _BF>>();

expectTypeOf(unknownRelationship).not.toEqualTypeOf(knownManyRelationship);
expectTypeOf(unknownRelationship).not.toEqualTypeOf(knownBelongsToRelationship);
expectTypeOf(unknownRelationship).not.toEqualTypeOf(knownImplicitRelationship);

if (isHasMany(unknownRelationship)) {
  // @ts-expect-error
  expectTypeOf(unknownRelationship).not.toEqualTypeOf(knownManyRelationship);
  expectTypeOf(unknownRelationship).toEqualTypeOf(knownManyRelationship);
}

if (isBelongsTo(unknownRelationship)) {
  // @ts-expect-error
  expectTypeOf(unknownRelationship).not.toEqualTypeOf(knownBelongsToRelationship);
  expectTypeOf(unknownRelationship).toEqualTypeOf(knownBelongsToRelationship);
}

if (isImplicit(unknownRelationship)) {
  // @ts-expect-error
  expectTypeOf(unknownRelationship).not.toEqualTypeOf(knownImplicitRelationship);
  expectTypeOf(unknownRelationship).toEqualTypeOf(knownImplicitRelationship);
}
