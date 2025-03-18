/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectTypeOf } from 'expect-type';

import Store from '@ember-data/store';
import type { RelatedCollection as ManyArray } from '@ember-data/store/-private';
import type { LegacyAttributeField, LegacyRelationshipField } from '@warp-drive/core-types/schema/fields';
import { Type } from '@warp-drive/core-types/symbols';

import { attr } from './attr';
import { belongsTo } from './belongs-to';
import { hasMany } from './has-many';
import { Model } from './model';
import type { PromiseBelongsTo } from './promise-belongs-to';
import type { PromiseManyArray } from './promise-many-array';
import type BelongsToReference from './references/belongs-to';
import type HasManyReference from './references/has-many';
import type { isSubClass, MaybeAttrFields, MaybeBelongsToFields } from './type-utils';

// ------------------------------
//              💚
// ==============================
//          Type Tests
// ==============================
//              🐹
// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇

expectTypeOf<MaybeAttrFields<Model>>().toEqualTypeOf<never>();
expectTypeOf<isSubClass<Model>>().toEqualTypeOf<false>();

class UnbrandedUser extends Model {
  @attr('string') declare name: string | null;
  @hasMany('user', { async: false, inverse: null }) declare enemies: ManyArray<UnbrandedUser>;
  @belongsTo('user', { async: false, inverse: null }) declare bestFriend: UnbrandedUser | null;
  @hasMany('user', { async: true, inverse: 'friends' }) declare friends: PromiseManyArray<UnbrandedUser>;
  @belongsTo('user', { async: true, inverse: 'twin' }) declare twin: PromiseBelongsTo<UnbrandedUser>;
}
const user = new UnbrandedUser();

expectTypeOf<MaybeAttrFields<UnbrandedUser>>().toEqualTypeOf<'name' | 'bestFriend'>();
expectTypeOf<isSubClass<UnbrandedUser>>().toEqualTypeOf<true>();

type DoesExtend = UnbrandedUser extends Model ? true : false;
function takeModel<T extends Model>(model: T): T {
  return model;
}

expectTypeOf(takeModel(new UnbrandedUser())).toEqualTypeOf<UnbrandedUser>();
expectTypeOf<DoesExtend>().toEqualTypeOf<true>();

expectTypeOf<Awaited<PromiseManyArray<UnbrandedUser>>['modelName']>().toEqualTypeOf<string>();
expectTypeOf<ManyArray<UnbrandedUser>['modelName']>().toEqualTypeOf<string>();
expectTypeOf<ManyArray<UnbrandedUser>>().toMatchTypeOf<UnbrandedUser[]>();

expectTypeOf(user.name).toEqualTypeOf<string | null>();
expectTypeOf(user.enemies).toEqualTypeOf<ManyArray<UnbrandedUser>>();
expectTypeOf(user.bestFriend).toEqualTypeOf<UnbrandedUser | null>();
expectTypeOf<Awaited<typeof user.friends>>().toEqualTypeOf<ManyArray<UnbrandedUser>>();
expectTypeOf<Awaited<typeof user.twin>>().toEqualTypeOf<UnbrandedUser | null>();

class BrandedUser extends Model {
  @attr('string') declare name: string | null;
  @hasMany('user', { async: false, inverse: null }) declare enemies: ManyArray<BrandedUser>;
  @belongsTo('user', { async: false, inverse: null }) declare bestFriend: BrandedUser | null;
  @hasMany('user', { async: true, inverse: 'friends' }) declare friends: PromiseManyArray<BrandedUser>;
  @belongsTo('user', { async: true, inverse: 'twin' }) declare twin: PromiseBelongsTo<BrandedUser>;

  [Type] = 'user' as const;
}
const branded = new BrandedUser();

expectTypeOf<MaybeAttrFields<BrandedUser>>().toEqualTypeOf<'name'>();
expectTypeOf<isSubClass<BrandedUser>>().toEqualTypeOf<true>();

expectTypeOf<Awaited<PromiseManyArray<BrandedUser>>['modelName']>().toEqualTypeOf<'user'>();
expectTypeOf<ManyArray<BrandedUser>['modelName']>().toEqualTypeOf<'user'>();
expectTypeOf<ManyArray<BrandedUser>>().toMatchTypeOf<BrandedUser[]>();

expectTypeOf(branded.name).toEqualTypeOf<string | null>();
expectTypeOf(branded.enemies).toEqualTypeOf<ManyArray<BrandedUser>>();
expectTypeOf(branded.bestFriend).toEqualTypeOf<BrandedUser | null>();
expectTypeOf<Awaited<typeof branded.friends>>().toEqualTypeOf<ManyArray<BrandedUser>>();
expectTypeOf<Awaited<typeof branded.twin>>().toEqualTypeOf<BrandedUser | null>();

class BrandedTypedUser extends Model {
  @attr('string') declare name: string | null;
  @hasMany<BrandedTypedUser>('user', { async: false, inverse: null }) declare enemies: ManyArray<BrandedTypedUser>;
  @belongsTo<BrandedTypedUser>('user', { async: false, inverse: null }) declare bestFriend: BrandedTypedUser;
  @hasMany<BrandedTypedUser>('user', { async: true, inverse: 'friends' })
  declare friends: PromiseManyArray<BrandedTypedUser>;
  @belongsTo<BrandedTypedUser>('user', { async: true, inverse: 'twin' })
  declare twin: PromiseBelongsTo<BrandedTypedUser>;
  @hasMany<BrandedTypedUser>('user', { async: false, inverse: 'leader' })
  declare crew: PromiseManyArray<BrandedTypedUser>;
  @belongsTo<BrandedTypedUser>('user', { async: false, inverse: 'crew' })
  declare leader: PromiseBelongsTo<BrandedTypedUser>;

  [Type] = 'user' as const;
}
const brandedAndTyped = new BrandedTypedUser();

expectTypeOf<Awaited<PromiseManyArray<BrandedTypedUser>>['modelName']>().toEqualTypeOf<'user'>();
expectTypeOf<ManyArray<BrandedTypedUser>['modelName']>().toEqualTypeOf<'user'>();
expectTypeOf<ManyArray<BrandedTypedUser>>().toMatchTypeOf<BrandedTypedUser[]>();

expectTypeOf(brandedAndTyped.name).toEqualTypeOf<string | null>();
expectTypeOf(brandedAndTyped.enemies).toEqualTypeOf<ManyArray<BrandedTypedUser>>();
expectTypeOf(brandedAndTyped.bestFriend).toEqualTypeOf<BrandedTypedUser>();
expectTypeOf<Awaited<typeof brandedAndTyped.friends>>().toEqualTypeOf<ManyArray<BrandedTypedUser>>();
expectTypeOf<Awaited<typeof brandedAndTyped.twin>>().toEqualTypeOf<BrandedTypedUser | null>();

// ------------------------------
// References
// ------------------------------

expectTypeOf(
  user.belongsTo(
    // @ts-expect-error
    'bestFriends'
  )
).toBeNever;

// bestFriend is a never because
// the value it points to is not branded
// we could make it *mostly* work but that would
// make other types less useful.
expectTypeOf(
  user.belongsTo(
    // @ts-expect-error
    'bestFriend'
  )
).toBeNever;

// const bestFriend = user.belongsTo('bestFriend');
// expectTypeOf(bestFriend).toEqualTypeOf<BelongsToReference<UnbrandedUser, 'bestFriend'>>();
// expectTypeOf(bestFriend.___identifier.type).toEqualTypeOf<string>();
// expectTypeOf(bestFriend.identifier!.type).toEqualTypeOf<string>();
// expectTypeOf(bestFriend.key).toEqualTypeOf<'bestFriend'>();
// expectTypeOf(bestFriend.type).toEqualTypeOf<string>();
// expectTypeOf(bestFriend.value()).toEqualTypeOf<UnbrandedUser | null>();

expectTypeOf(user.belongsTo('twin')).toEqualTypeOf<BelongsToReference<UnbrandedUser, 'twin'>>();
expectTypeOf(user.belongsTo('twin').___identifier.type).toEqualTypeOf<string>();
expectTypeOf(user.belongsTo('twin').identifier!.type).toEqualTypeOf<string>();
expectTypeOf(user.belongsTo('twin').key).toEqualTypeOf<'twin'>();
expectTypeOf(user.belongsTo('twin').type).toEqualTypeOf<string>();
expectTypeOf(user.belongsTo('twin').value()).toEqualTypeOf<UnbrandedUser | null>();

expectTypeOf(branded.belongsTo('bestFriend')).toEqualTypeOf<BelongsToReference<BrandedUser, 'bestFriend'>>();
expectTypeOf(branded.belongsTo('bestFriend').___identifier.type).toEqualTypeOf<'user'>();
expectTypeOf(branded.belongsTo('bestFriend').identifier!.type).toEqualTypeOf<'user'>();
expectTypeOf(branded.belongsTo('bestFriend').___identifier.type).not.toEqualTypeOf<string>();
expectTypeOf(branded.belongsTo('bestFriend').identifier!.type).not.toEqualTypeOf<string>();
expectTypeOf(branded.belongsTo('bestFriend').key).toEqualTypeOf<'bestFriend'>();
expectTypeOf(branded.belongsTo('bestFriend').type).toEqualTypeOf<'user'>();
expectTypeOf(branded.belongsTo('bestFriend').value()).toEqualTypeOf<BrandedUser | null>();

expectTypeOf(
  user.hasMany(
    // @ts-expect-error
    'bestFriends'
  )
).toBeNever;

expectTypeOf(user.hasMany('enemies')).toEqualTypeOf<HasManyReference<UnbrandedUser, 'enemies'>>();
expectTypeOf(user.hasMany('enemies').___identifier.type).toEqualTypeOf<string>();
expectTypeOf(user.hasMany('enemies').identifiers[0].type).toEqualTypeOf<string>();
expectTypeOf(user.hasMany('enemies').key).toEqualTypeOf<'enemies'>();
expectTypeOf(user.hasMany('enemies').type).toEqualTypeOf<string>();
expectTypeOf(user.hasMany('enemies').value()).toMatchTypeOf<UnbrandedUser[] | null>();

expectTypeOf(branded.hasMany('enemies')).toEqualTypeOf<HasManyReference<BrandedUser, 'enemies'>>();
expectTypeOf(branded.hasMany('enemies').___identifier.type).toEqualTypeOf<'user'>();
expectTypeOf(branded.hasMany('enemies').identifiers[0].type).toEqualTypeOf<'user'>();
expectTypeOf(branded.hasMany('enemies').___identifier.type).not.toEqualTypeOf<string>();
expectTypeOf(branded.hasMany('enemies').identifiers[0].type).not.toEqualTypeOf<string>();
expectTypeOf(branded.hasMany('enemies').key).toEqualTypeOf<'enemies'>();
expectTypeOf(branded.hasMany('enemies').type).toEqualTypeOf<'user'>();
expectTypeOf(branded.hasMany('enemies').value()).toMatchTypeOf<BrandedUser[] | null>();

// these ensure subclasses satisfy Model
function takesAModel(arg: Model) {}
takesAModel(user);
takesAModel(branded);

user.eachAttribute((key, meta) => {
  // bestFriend is in the wrong place because the records aren't branded
  expectTypeOf(key).toEqualTypeOf<'name' | 'bestFriend'>();
  expectTypeOf(meta).toEqualTypeOf<LegacyAttributeField>();
});
user.eachRelationship((key, meta) => {
  expectTypeOf(key).toEqualTypeOf<'twin' | 'enemies' | 'friends'>();
  expectTypeOf(meta).toEqualTypeOf<LegacyRelationshipField>();
});

branded.eachAttribute((key, meta) => {
  expectTypeOf(key).toEqualTypeOf<'name'>();
  expectTypeOf(meta).toEqualTypeOf<LegacyAttributeField>();
});

branded.eachRelationship((key, meta) => {
  expectTypeOf(key).toEqualTypeOf<'bestFriend' | 'twin' | 'enemies' | 'friends'>();
  expectTypeOf(meta).toEqualTypeOf<LegacyRelationshipField>();
});

// this ensures that `serialize` can be overridden
class UserWithCustomSerialize extends Model {
  @attr('string') declare name: string | null;

  serialize() {
    return { name: this.name };
  }
}
expectTypeOf(new UserWithCustomSerialize().serialize()).toEqualTypeOf<{ name: string | null }>();
class FooModel extends Model {
  [Type] = 'foo' as const;

  private myMethod() {
    // ...
  }

  save(options?: Record<string, unknown>): Promise<this> {
    if (this.currentState.isNew && this.currentState.isDeleted) {
      return Promise.resolve(this);
    }

    this.myMethod();

    return super.save(options);
  }
}

expectTypeOf(new FooModel().save()).toEqualTypeOf<Promise<FooModel>>();

const store = new Store();

type CreateProps = Parameters<typeof store.createRecord<BrandedUser>>[1];

expectTypeOf({
  name: 'foo',
  bestFriend: null,
  enemies: [],
  friends: [],
  twin: null,
}).toMatchTypeOf<CreateProps>();

expectTypeOf({ notAProp: 'nope' }).not.toMatchTypeOf<CreateProps>();
expectTypeOf({ crew: [] }).not.toMatchTypeOf<CreateProps>();

store.createRecord<BrandedUser>('user', {
  name: 'foo',
  bestFriend: null,
  enemies: [],
  friends: [],
  twin: null,
  // @ts-expect-error not a field
  crew: [],
});

store.createRecord<BrandedUser>('user', {
  name: 'foo',
  bestFriend: null,
  enemies: [],
  friends: [],
  twin: null,
  // @ts-expect-error not a field
  notAField: 'nope',
});

store.createRecord<BrandedUser>('user', {
  name: 'foo',
  bestFriend: null,
  enemies: [],
  friends: [],
  twin: null,
  // @ts-expect-error is a Model field
  isNew: true,
});

store.createRecord<BrandedUser>('user', {
  name: 'foo',
  bestFriend: null,
  enemies: [],
  friends: [],
  twin: null,
  // @ts-expect-error is an EmberObject field
  isDestroyed: true,
});

class HasGetter extends Model {
  @belongsTo('user', { async: false, inverse: null }) declare bestFriend: BrandedUser | null;

  get bestFriendId(): string | null {
    return this.belongsTo<HasGetter, 'bestFriend'>('bestFriend').id();
  }
}
const hasGetter = new HasGetter();
expectTypeOf<MaybeBelongsToFields<typeof hasGetter>>().toEqualTypeOf<'bestFriend'>();
expectTypeOf(hasGetter.belongsTo('bestFriend').id()).toEqualTypeOf<string | null>();

function expectsArray<T>(array: T[]) {}

// ManyArray<User> works
expectsArray(branded.enemies);

// PromiseManyArray<User> works only if awaited
expectsArray(await branded.friends);
