import { expectTypeOf } from 'expect-type';

import type { Type } from '@warp-drive/core-types/symbols';

import type { HasMany } from '.';
import type { WithLegacy } from './migration-support';

type User = WithLegacy<{
  [Type]: 'user';
  firstName: string;
  lastName: string;
  age: number;
  friends: HasMany<User>;
  bestFriend: User | null;
}>;

type User2 = WithLegacy<{
  [Type]: 'user';
  id: string;
}>;

expectTypeOf<User['id']>().toEqualTypeOf<string | null>();
expectTypeOf<User2['id']>().toEqualTypeOf<string>();

const user = {} as User;

expectTypeOf(user.firstName).toEqualTypeOf<string>();
expectTypeOf(user.lastName).toEqualTypeOf<string>();
expectTypeOf(user.age).toEqualTypeOf<number>();
expectTypeOf(user.friends).toEqualTypeOf<HasMany<User>>();
expectTypeOf(user.belongsTo('bestFriend').value()).toEqualTypeOf<User | null>();
expectTypeOf(user.hasMany('friends').value()).toEqualTypeOf<HasMany<User> | null>();
expectTypeOf(user.unloadRecord()).toEqualTypeOf<void>();
expectTypeOf(user.save()).toEqualTypeOf<Promise<User>>();
expectTypeOf(user.destroyRecord()).toEqualTypeOf<Promise<User>>();
expectTypeOf(user.rollbackAttributes()).toEqualTypeOf<void>();
expectTypeOf(user.isNew).toEqualTypeOf<boolean>();
expectTypeOf(user.hasDirtyAttributes).toEqualTypeOf<boolean>();
expectTypeOf(user.isValid).toEqualTypeOf<boolean>();
expectTypeOf(user.isLoading).toEqualTypeOf<boolean>();
expectTypeOf(user.isDestroying).toEqualTypeOf<boolean>();
expectTypeOf(user.isDestroyed).toEqualTypeOf<boolean>();
expectTypeOf(user.isDeleted).toEqualTypeOf<boolean>();
expectTypeOf(user.isEmpty).toEqualTypeOf<boolean>();
expectTypeOf(user.isError).toEqualTypeOf<boolean>();
expectTypeOf(user.isSaving).toEqualTypeOf<boolean>();
expectTypeOf(user.isValid).toEqualTypeOf<boolean>();
expectTypeOf(user.isLoaded).toEqualTypeOf<boolean>();
