import { expectTypeOf } from 'expect-type';

import { DefaultRegistry, ResolvedRegistry } from '.';
import { AsyncBelongsTo, AsyncHasMany, BelongsTo, HasMany } from './legacy-model';

type GetMappedKey<M, V> = { [K in keyof M]-?: M[K] extends V ? K : never }[keyof M] & string;
type GetConstrainedKey<K, F extends keyof K, V> = K[F] extends V ? K[F] : never;
type KindMap<K> = {
  [P in keyof K]: Awaited<K[P]>;
};
type RelType<A> = A extends Array<infer T> ? T : A;

export type RegistryKeyForRecord<K, R extends ResolvedRegistry = DefaultRegistry> = GetMappedKey<R['model'], K>;

export type RelationshipFieldsFor<K, R extends ResolvedRegistry = DefaultRegistry> = GetMappedKey<
  K,
  | AsyncHasMany<RecordInstance<R>, R>
  | AsyncBelongsTo<RecordInstance<R>, R>
  | BelongsTo<RecordInstance<R>, R>
  | HasMany<RecordInstance<R>, R>
>;
export type RelationshipsFor<K, R extends ResolvedRegistry = DefaultRegistry> = KindMap<
  Pick<K, RelationshipFieldsFor<K, R>>
>;
export type AttributesFor<K, R extends ResolvedRegistry = DefaultRegistry> = Omit<K, RelationshipFieldsFor<K, R>>;
export type AttributeFieldsFor<K, R extends ResolvedRegistry = DefaultRegistry> = keyof AttributesFor<K, R>;
export type HasManyRelationshipFieldsFor<K, R extends ResolvedRegistry = DefaultRegistry> = GetMappedKey<
  K,
  AsyncHasMany<RecordInstance<R>, R> | HasMany<RecordInstance<R>, R>
>;
export type BelongsToRelationshipFieldsFor<K, R extends ResolvedRegistry = DefaultRegistry> = GetMappedKey<
  K,
  AsyncBelongsTo<RecordInstance<R>, R> | RecordInstance<R>
>;
export type HasManyRelationshipsFor<K, R extends ResolvedRegistry = DefaultRegistry> = KindMap<
  Pick<K, Awaited<HasManyRelationshipFieldsFor<K, R>>>
>;
export type BelongsToRelationshipsFor<K, R extends ResolvedRegistry = DefaultRegistry> = KindMap<
  Pick<K, BelongsToRelationshipFieldsFor<K, R>>
>;
export type RelatedFieldDef<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T>,
  C extends
    | AsyncHasMany<RecordInstance<R>, R>
    | AsyncBelongsTo<RecordInstance<R>, R>
    | BelongsTo<RecordInstance<R>, R>
    | HasMany<RecordInstance<R>, R> =
    | AsyncHasMany<RecordInstance<R>, R>
    | AsyncBelongsTo<RecordInstance<R>, R>
    | BelongsTo<RecordInstance<R>, R>
    | HasMany<RecordInstance<R>, R>
> = GetConstrainedKey<RecordInstance<R, T>, F, C>;

// utilities to help type things nicely
export type RecordType<R extends ResolvedRegistry> = keyof R['model'] & string;
export type RecordInstance<R extends ResolvedRegistry, T extends RecordType<R> = RecordType<R>> = R['model'][T];
export type RecordField<R extends ResolvedRegistry, T extends RecordType<R>> = keyof RecordInstance<R, T> & string;
/*
export type RelatedInstance<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<T, R>
> = RelationshipsFor<T, R>[F];
*/
export type RelatedType<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T>
> = RegistryKeyForRecord<RelatedInstance<R, T, F>, R>;
export type RelatedInstance<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T>,
  C extends
    | AsyncHasMany<RecordInstance<R>, R>
    | AsyncBelongsTo<RecordInstance<R>, R>
    | BelongsTo<RecordInstance<R>, R>
    | HasMany<RecordInstance<R>, R> =
    | AsyncHasMany<RecordInstance<R>, R>
    | AsyncBelongsTo<RecordInstance<R>, R>
    | BelongsTo<RecordInstance<R>, R>
    | HasMany<RecordInstance<R>, R>
> = RelType<Awaited<GetConstrainedKey<RecordInstance<R, T>, F, C>>>;
/*
// this also works if the infer approach ends up not working
export type RelatedInstance<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T>,
  C extends
    | AsyncHasMany<RecordInstance<R>, R>
    | AsyncBelongsTo<RecordInstance<R>, R>
    | BelongsTo<RecordInstance<R>, R>
    | HasMany<RecordInstance<R>, R> =
    | AsyncHasMany<RecordInstance<R>, R>
    | AsyncBelongsTo<RecordInstance<R>, R>
    | BelongsTo<RecordInstance<R>, R>
    | HasMany<RecordInstance<R>, R>
> = GetConstrainedKey<RecordInstance<R, T>, F, C>['___----RELATED_TYPE_KEY'];
*/
export type RelatedField<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RecordField<R, T>
> = RecordField<R, RegistryKeyForRecord<RelatedInstance<R, T, F>, R>>;

// some alt implementations to the above to avoid 'never' situations?
/*
export type RecordType<R extends RegistryMap> = keyof R['model'] extends never
  ? '___NO_MODELS_REGISTERED___'
  : keyof R['model'] & string;
export type RecordInstance<R extends RegistryMap, T extends RecordType<R>> = (R['model'] & {
  ___NO_MODELS_REGISTERED___: never;
})[T];
*/

// ###########################
// ###########################
// ###########################
// -------[[ TESTS ]]---------
// ###########################
// ###########################
// ###########################

// TYPE Tests
declare class User {
  declare name: string;
  declare friends: AsyncHasMany<Person, TestResolved>;
  declare spouse: AsyncBelongsTo<Person, TestResolved>;
  declare bestFriend: BelongsTo<Person, TestResolved>;
  declare enemies: HasMany<Person, TestResolved>;
}
declare class Person {
  declare name: string;
  declare parent: BelongsTo<User, TestResolved>;
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
type TestResolved = ResolvedRegistry<TestRegistry1>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function expectType<T extends Exclude<string | object, never>, V extends T>(): void;

declare function getType<T>(): T;
type UserInstance = RecordInstance<TestResolved, 'user'>;
expectType<'friends' | 'enemies' | 'spouse' | 'bestFriend', RelationshipFieldsFor<UserInstance, TestResolved>>();
expectType<'name', AttributeFieldsFor<UserInstance, TestResolved>>();
expectType<'friends' | 'enemies', HasManyRelationshipFieldsFor<UserInstance, TestResolved>>();
expectType<'spouse' | 'bestFriend', BelongsToRelationshipFieldsFor<UserInstance, TestResolved>>();

expectType<{ bestFriend: Person; spouse: Person }, BelongsToRelationshipsFor<UserInstance, TestResolved>>();
expectTypeOf(getType<RelatedFieldDef<TestResolved, 'user', 'bestFriend'>>()).toMatchTypeOf(getType<Person>());

expectType<'post' | 'user' | 'person', RecordType<TestResolved>>();
expectType<User, RecordInstance<TestResolved, 'user'>>();
expectType<'name' | 'friends' | 'enemies' | 'spouse' | 'bestFriend', RecordField<TestResolved, 'user'>>();

expectTypeOf(getType<RelatedInstance<TestResolved, 'user', 'bestFriend'>>()).toMatchTypeOf(getType<Person>());
expectTypeOf(getType<RelatedType<TestResolved, 'user', 'friends'>>()).toMatchTypeOf(getType<'person'>());
expectTypeOf(getType<RelatedType<TestResolved, 'user', 'enemies'>>()).toMatchTypeOf(getType<'person'>());
expectType<'person', RelatedType<TestResolved, 'user', 'bestFriend'>>();
expectType<'person', RelatedType<TestResolved, 'user', 'spouse'>>();
