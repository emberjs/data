import { expectTypeOf } from 'expect-type';

import { ResourceType } from '@warp-drive/core-types/symbols';

import { attr } from './attr';
import { belongsTo } from './belongs-to';
import { hasMany } from './has-many';
import type ManyArray from './many-array';
import { Model } from './model';
import type { PromiseBelongsTo } from './promise-belongs-to';
import type PromiseManyArray from './promise-many-array';
import type BelongsToReference from './references/belongs-to';
import type HasManyReference from './references/has-many';

// ------------------------------
//              💚
// ==============================
//          Type Tests
// ==============================
//              🐹
// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇

class UnbrandedUser extends Model {
  @attr('string') declare name: string | null;
  @hasMany('user', { async: false, inverse: null }) declare enemies: ManyArray<UnbrandedUser>;
  @belongsTo('user', { async: false, inverse: null }) declare bestFriend: UnbrandedUser;
  @hasMany('user', { async: true, inverse: 'friends' }) declare friends: PromiseManyArray<UnbrandedUser>;
  @belongsTo('user', { async: true, inverse: 'twin' }) declare twin: PromiseBelongsTo<UnbrandedUser>;
}
const user = new UnbrandedUser();

type DoesExtend = UnbrandedUser extends Model ? true : false;
function takeModel<T extends Model>(model: T): T {
  return model;
}

expectTypeOf(takeModel(new UnbrandedUser())).toEqualTypeOf<UnbrandedUser>();
// @ts-expect-error unsure how to fix this, but its a real bug
expectTypeOf<DoesExtend>().toEqualTypeOf<true>();

expectTypeOf<Awaited<PromiseManyArray<UnbrandedUser>>['modelName']>().toEqualTypeOf<string>();
expectTypeOf<ManyArray<UnbrandedUser>['modelName']>().toEqualTypeOf<string>();
expectTypeOf<ManyArray<UnbrandedUser>>().toMatchTypeOf<UnbrandedUser[]>();

expectTypeOf(user.name).toEqualTypeOf<string | null>();
expectTypeOf(user.enemies).toEqualTypeOf<ManyArray<UnbrandedUser>>();
expectTypeOf(user.bestFriend).toEqualTypeOf<UnbrandedUser>();
expectTypeOf<Awaited<typeof user.friends>>().toEqualTypeOf<ManyArray<UnbrandedUser>>();
expectTypeOf<Awaited<typeof user.twin>>().toEqualTypeOf<UnbrandedUser | null>();

class BrandedUser extends Model {
  @attr('string') declare name: string | null;
  @hasMany('user', { async: false, inverse: null }) declare enemies: ManyArray<BrandedUser>;
  @belongsTo('user', { async: false, inverse: null }) declare bestFriend: BrandedUser;
  @hasMany('user', { async: true, inverse: 'friends' }) declare friends: PromiseManyArray<BrandedUser>;
  @belongsTo('user', { async: true, inverse: 'twin' }) declare twin: PromiseBelongsTo<BrandedUser>;

  [ResourceType] = 'user' as const;
}
const branded = new BrandedUser();

expectTypeOf<Awaited<PromiseManyArray<BrandedUser>>['modelName']>().toEqualTypeOf<'user'>();
expectTypeOf<ManyArray<BrandedUser>['modelName']>().toEqualTypeOf<'user'>();
expectTypeOf<ManyArray<BrandedUser>>().toMatchTypeOf<BrandedUser[]>();

expectTypeOf(branded.name).toEqualTypeOf<string | null>();
expectTypeOf(branded.enemies).toEqualTypeOf<ManyArray<BrandedUser>>();
expectTypeOf(branded.bestFriend).toEqualTypeOf<BrandedUser>();
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

  [ResourceType] = 'user' as const;
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

expectTypeOf(user.belongsTo('bestFriend')).toEqualTypeOf<BelongsToReference<UnbrandedUser, 'bestFriend'>>();
expectTypeOf(user.belongsTo('bestFriend').___identifier.type).toEqualTypeOf<string>();
expectTypeOf(user.belongsTo('bestFriend').identifier!.type).toEqualTypeOf<string>();
expectTypeOf(user.belongsTo('bestFriend').key).toEqualTypeOf<'bestFriend'>();
expectTypeOf(user.belongsTo('bestFriend').type).toEqualTypeOf<string>();
expectTypeOf(user.belongsTo('bestFriend').value()).toEqualTypeOf<UnbrandedUser | null>();

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
