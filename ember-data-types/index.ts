/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 * Internal Types
 *
 * These types form the foundation of types we will eventually take public.
 *
 */
import {
  AdapterRegistry,
  ModelRegistry,
  Registry,
  SerializerRegistry,
  TransformRegistry,
} from '@ember-data/types/registeries';

import { RecordInstance, RecordType } from './utils';

export {
  AdapterRegistry,
  ModelRegistry,
  Registry,
  SerializerRegistry,
  TransformRegistry,
} from '@ember-data/types/registeries';

/**
 * Every store instance receives a
 * RegistryMap at instantiation, this map
 * is a collection of registries of the
 * various primitives ember-data exposes.
 *
 * Each registry is a lookup map from
 * string "type" to a class.
 */
export interface RegistryMap {
  model: Registry;
  adapter: Registry;
  serializer: Registry;
  transform: Registry;
}
// lookup the thing registered to the ke application if needed.
type AppFallback<R extends Registry> = R extends { application: unknown } ? R['application'] : null;

type ResolvedSerializerRegistry<R extends RegistryMap> = Omit<
  Record<keyof R['model'] | keyof R['adapter'], AppFallback<R['serializer']>>,
  keyof R['serializer']
> &
  R['serializer'];

type ResolvedAdapterRegistry<R extends RegistryMap> = Omit<
  Record<keyof R['model'] | keyof R['serializer'], AppFallback<R['adapter']>>,
  keyof R['adapter']
> &
  R['adapter'];

export type ResolvedRegistry<R extends RegistryMap = RegistryMap> = {
  model: R['model'];
  adapter: ResolvedAdapterRegistry<R>;
  serializer: ResolvedSerializerRegistry<R>;
  transform: R['transform'];
};

export type DefaultRegistry = ResolvedRegistry<{
  model: ModelRegistry;
  adapter: AdapterRegistry;
  serializer: SerializerRegistry;
  transform: TransformRegistry;
}>;

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
}
declare class Post {
  declare title: string;
}
declare class AppSerializer {
  isAppSerializer: true;
}
declare class AppAdapter {
  isAppAdapter: true;
}
declare class UserAdapter {
  isUserAdapter: true;
}
declare class UserSerializer {
  isUserSerializer: true;
}
type TestRegistry1 = {
  model: {
    user: User;
    post: Post;
  };
  serializer: {
    user: UserSerializer;
  };
  adapter: {
    user: UserAdapter;
  };
  transform: {};
};
type TestRegistry2 = {
  model: {
    user: User;
    post: Post;
    'test-user': User;
  };
  serializer: {
    application: AppSerializer;
    user: UserSerializer;
  };
  adapter: {
    application: AppAdapter;
    user: UserAdapter;
  };
  transform: {};
};
type TestRegistry3 = {
  model: {
    user: User;
    post: Post;
  };
  serializer: {
    user: UserSerializer;
  };
  adapter: {
    application: AppAdapter;
    user: UserAdapter;
  };
  transform: {};
};
declare function expectType<T, V extends T>();
declare function assertType<T>(val: T);

// ###########################
// ---------- Test AppFallback
// ###########################

// we should be null if no application adapter present
type Foo1 = AppFallback<DefaultRegistry['adapter']>;
expectType<null, Foo1>();
// @ts-expect-error
expectType<AppAdapter, Foo1>();

// we should be AppAdapter if application adapter present
type Foo2 = AppFallback<TestRegistry2['adapter']>;
// @ts-expect-error
expectType<null, Foo2>();
expectType<AppAdapter, Foo2>();

// ###########################
// ----- Test ResolvedRegistry
// ###########################

// Test a registry with AppAdapter

// should fallback to AppAdapter
type Foo3 = ResolvedRegistry<TestRegistry2>['adapter']['post'];
// @ts-expect-error
expectType<UserAdapter, Foo3>();
expectType<AppAdapter, Foo3>();

// should find UserAdapter
type Foo4 = ResolvedRegistry<TestRegistry2>['adapter']['user'];
expectType<UserAdapter, Foo4>();
// @ts-expect-error
expectType<AppAdapter, Foo4>();

// should find AppAdapter
type Foo5 = ResolvedRegistry<TestRegistry2>['adapter']['application'];
// @ts-expect-error
expectType<UserAdapter, Foo5>();
expectType<AppAdapter, Foo5>();

// Test a registry without AppAdapter

// should fallback to null
type Foo6 = ResolvedRegistry<TestRegistry1>['adapter']['post'];
// @ts-expect-error
expectType<UserAdapter, Foo6>();
expectType<null, Foo6>();

// should find UserAdapter
type Foo7 = ResolvedRegistry<TestRegistry1>['adapter']['user'];
expectType<UserAdapter, Foo7>();
// @ts-expect-error
expectType<null, Foo7>();

// should error because there is no application adapter
// @ts-expect-error
type Foo8 = ResolvedRegistry<TestRegistry1>['adapter']['application'];

// Test a registry without AppSerializer but with AppAdapter

// should resolve to null as there is no AppSerializer
type Foo9 = ResolvedRegistry<TestRegistry3>['serializer']['post'];
// @ts-expect-error
expectType<AppSerializer, Foo9>();
expectType<null, Foo9>();

// should find UserSerializer
type Foo10 = ResolvedRegistry<TestRegistry3>['serializer']['user'];
expectType<UserSerializer, Foo10>();
// @ts-expect-error
expectType<AppSerializer, Foo10>();

// should find AppSerializer to be null
type Foo11 = ResolvedRegistry<TestRegistry3>['serializer']['application'];
// @ts-expect-error
expectType<AppSerializer, Foo11>();
expectType<null, Foo11>();

// ###########################
// ###########################
// ###########################
// ----- Test Complex Interop
// ###########################
// ###########################
// ###########################

/*
  This scenario demonstrates how to type various methods, classes, and
  interfaces such that they can utilize the registry without leading to
  frustrating user or maintainer experiences.

  One of the larger challenges faced is that registry keys will always be
  strings, but typescript keyof returns number | string | symbol. This often
  leads us to narrow the key type using `keyof Registry & string`; however,
  when creating the generic signature, `extends keyof Registry & string`
  creates a subclass, leading to the potential for errors of the following
  form if we are not careful:

  ```
  Type 'StableNewRecordIdentifier<keyof R & string> | undefined' is not assignable to type 'StableRecordIdentifier<T> | undefined'.
  Type 'StableNewRecordIdentifier<keyof R & string>' is not assignable to type 'StableRecordIdentifier<T> | undefined'.
    Type 'StableNewRecordIdentifier<keyof R & string>' is not assignable to type 'StableNewRecordIdentifier<T>'.
      Type 'keyof R & string' is not assignable to type 'T'.
        'keyof R & string' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint 'string'.ts(2322)
  ```

  The patterns in this test scenario, if followed, will lead us into
  "THE PIT OF SUCCESS" -- Stefan Penner
*/

interface RecordIdentifier<T extends string = string> {
  lid: string;
  id: string;
  type: T;
}

interface StableRecordIdentifier<T extends string = string> {
  lid: string;
  id: string;
  type: T;
  isStable: true;
}

/*
  EmberData often receives a string representing a "type" and has to lookup
  something based on that string. These strings can be "un-normalized", and
  so we always start by normalizing them.

  This is tricky, because it means we end up needing to "lie" to our consumers
  about the type of something.

  For instance:
  - `users` and `user` satisfy the same keyof ModelRegistry `user`
  - `foo-user` and `fooUser` and `foo_user` and `foo-users` and `fooUsers` and `foo_users` satisfy the key `foo-user`

  So we need to be able to type this utility function in a way that accepts these potentially arbitrary strings
  alongside a hint of what type that string ought to map to, and cast the return type to the mapped string.

  This has inherent risk for type-safety of sorts, but is overall a massive win
  for developer experience and ergonomics as they get more useful results.

  We also need to be able to call this function from somewhere we did not necessarily pass the full
  registry: :thinking:

  Here, we show how this can work with the registry setup we have while
  being a directly invokable util by an end consumer at the same time without
  their needing to configure the registry generic.

  We also show that ensuring `type` is a string within the function body works.
*/
declare function normalizeType<
  R extends Registry = TestRegistry2['model'],
  K extends keyof R & string = keyof R & string
>(type: K): K;
declare function normalizeType<
  R extends Registry = TestRegistry2['model'],
  K extends keyof R & string = keyof R & string
>(type: Exclude<string, K>): string;
declare function normalizeType<R extends Registry = TestRegistry2['model'], K extends keyof R = keyof R>(
  type: (K & string) | Exclude<string, K>
): (K & string) | string;

// calls without configuring registry,
// for this we've defaulted to TestRegistry2
// to "mock" the global registry
// so that there will be some types available.
let type1 = normalizeType('user');
let type2 = normalizeType('test-user');
let type3 = normalizeType('users');

// @ts-expect-error
assertType<'users'>(normalizeType('users'));
assertType<string>(normalizeType('users'));
assertType<'user'>(normalizeType('user'));
assertType<'test-user'>(normalizeType('test-user'));

// we have a default for the key type, but allow it to be threaded
function createStableIdentifier<R extends RegistryMap, T extends RecordType<R>>(
  identifier: RecordIdentifier<T> | StableRecordIdentifier<T>
): StableRecordIdentifier<T> {
  const { id, lid, type } = identifier;
  // we thread the key type through
  return { id, lid, type: normalizeType<R['model'], T>(type), isStable: true };
}

interface KeyOptions<T extends string> {
  lid: IdentifierMap<T>;
  id: IdentifierMap<T>;
  _allIdentifiers: StableRecordIdentifier<T>[];
}

type IdentifierMap<T extends string> = Record<string, StableRecordIdentifier<T> | undefined>;
type TypeMap<R extends Registry> = {
  [K in keyof R & string]: KeyOptions<K>;
};

// how to type a map where the key type and value type need to match to the same key of
// the registry
// we override vs extend Map to allow generics in the methods
interface RecordMap<R extends RegistryMap> {
  clear(): void;
  delete<K extends RecordType<R>>(key: StableRecordIdentifier<K>): boolean;
  forEach(
    callbackfn: <K extends RecordType<R>>(
      value: RecordInstance<R, K>,
      key: StableRecordIdentifier<K>,
      map: RecordMap<R>
    ) => void,
    thisArg?: unknown
  ): void;
  get<K extends RecordType<R>>(key: StableRecordIdentifier<K>): RecordInstance<R, K> | undefined;
  has<K extends RecordType<R>>(key: StableRecordIdentifier<K>): boolean;
  set<K extends RecordType<R>>(key: StableRecordIdentifier<K>, value: RecordInstance<R, K>): this;
  readonly size: number;
}

declare function assertUserSuppliedType<R extends Registry, T extends keyof R & string = keyof R & string>(
  identifier: RecordIdentifier<T | string>
): asserts identifier is RecordIdentifier<T>;

class Store<I extends RegistryMap = DefaultRegistry, R extends ResolvedRegistry<RegistryMap> = ResolvedRegistry<I>> {
  declare identifierCache: TypeMap<R>;
  declare recordCache: RecordMap<R>;

  // use a generic for the mapped return
  peekRecord<T extends RecordType<R>>(identifier: RecordIdentifier<T>): R['model'][T] | null;
  // returns never if given an invalid type, don't use a generic here
  // we could also type this as "asserts" though the return type for that is void
  // so it doesn't help us with surfacing errors to the end user before runtime
  peekRecord<T extends RecordType<R>>(identifier: RecordIdentifier<Exclude<string, T>>): never;
  // no generic needed for the base signature
  peekRecord<T extends RecordType<R>>(identifier: RecordIdentifier<T | string>): R['model'][keyof R['model']] | null {
    // necessary to have the "never" signature, also gives us a runtime check if we want
    assertUserSuppliedType<R['model'], T>(identifier);
    let { type, lid } = identifier;
    // narrow out the string case
    let stable = this.identifierCache[type].lid[lid];

    if (!stable) {
      // we must pass at least the registry in.
      stable = createStableIdentifier<R, T>(identifier);
    }

    const record = this.recordCache.get(stable);

    return record || null;
  }

  // errors for identifiers with invalid types
  async findRecord<T extends RecordType<R>>(identifier: RecordIdentifier<T>): Promise<R['model'][T] | null> {
    let { type, lid } = identifier;
    let stable = this.identifierCache[type].lid[lid];

    if (!stable) {
      // we thread the keyof through when needed to prevent
      // errors with incompatible subtypes such as
      // ```
      // 'keyof R' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint
      // ```
      stable = createStableIdentifier<R, T>(identifier);
    }

    const record = this.recordCache.get(stable);

    return Promise.resolve(record || null);
  }
}

const store = new Store<TestRegistry2>();

// should be User
const user = store.peekRecord({ type: 'user', id: '1', lid: 'user:1' })!;
assertType<User>(user);

// should be Post
const post = store.peekRecord({ type: 'post', id: '1', lid: 'post:1' })!;
assertType<Post>(post);

// no error but we get a never
const unk = store.peekRecord({ type: 'application', id: '1', lid: 'unk:1' });
assertType<never>(unk);

// @ts-expect-error on type
const unk2 = await store.findRecord({ type: 'application', id: '1', lid: 'unk:1' });
assertType<User | Post | null>(unk2);

const user2 = await store.findRecord({ type: 'user', id: '1', lid: 'unk:1' });
assertType<User>(user2!);

// ############################
// ############################
// ############################
// ----- Test Complex Interop 2
// ############################
// ############################
// ############################

/**
 * When working with multiple classes, using generics to pass along
 * the appropriate type becomes tricky due to subtype constraints.
 *
 * This scenario shows that threading the keys works "most of the time"
 * Where it breaks down is when we:
 *
 * Have a class A that uses class B that uses class D
 * class A also uses class C which uses class B and D
 *
 * In this case, calling B or D from C can result in
 * issues with the subtype constraint.
 *
 * One approach to working around this is to always pass the keys
 * along from the very top level, here we experiment with that.
 */

class Cache<R extends RegistryMap> {
  declare _cache: RecordMap<R>;

  peek<T extends RecordType<R>>(identifier: StableRecordIdentifier<T>): RecordInstance<R, T> | null {
    return this._cache.get(identifier) || null;
  }
}

class Store2<I extends RegistryMap = DefaultRegistry, R extends ResolvedRegistry<RegistryMap> = ResolvedRegistry<I>> {
  declare identifierCache: TypeMap<R>;
  declare recordCache: Cache<R>;

  // use a generic for the mapped return
  peekRecord<T extends RecordType<R>>(identifier: RecordIdentifier<T>): RecordInstance<R, T> | null;
  // returns never if given an invalid type, don't use a generic here
  // we could also type this as "asserts" though the return type for that is void
  // so it doesn't help us with surfacing errors to the end user before runtime
  peekRecord<T extends RecordType<R>>(identifier: RecordIdentifier<Exclude<string, RecordType<R>>>): never;
  // no generic needed for the base signature
  peekRecord<T extends RecordType<R>>(identifier: RecordIdentifier<T | string>): RecordInstance<R, T> | null {
    // necessary to have the "never" signature, also gives us a runtime check if we want
    assertUserSuppliedType<R['model'], T>(identifier);
    let { type, lid } = identifier;
    // narrow out the string case
    let stable = this.identifierCache[type].lid[lid];

    if (!stable) {
      // we must pass at least the registry in.
      stable = createStableIdentifier<R, T>(identifier);
    }

    const record = this.recordCache.peek(stable);

    return record || null;
  }

  // errors for identifiers with invalid types
  async findRecord<T extends RecordType<R>>(identifier: RecordIdentifier<T>): Promise<RecordInstance<R, T> | null> {
    let { type, lid } = identifier;
    let stable = this.identifierCache[type].lid[lid];

    if (!stable) {
      // we thread the keyof through when needed to prevent
      // errors with incompatible subtypes such as
      // ```
      // 'keyof R' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint
      // ```
      stable = createStableIdentifier<R, T>(identifier);
    }

    const record = this.recordCache.peek(stable);

    return Promise.resolve(record || null);
  }
}
