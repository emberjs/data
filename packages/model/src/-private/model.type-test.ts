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
expectTypeOf(user.hasMany('enemies').identifiers[0]!.type).toEqualTypeOf<string>();
expectTypeOf(user.hasMany('enemies').key).toEqualTypeOf<'enemies'>();
expectTypeOf(user.hasMany('enemies').type).toEqualTypeOf<string>();
expectTypeOf(user.hasMany('enemies').value()).toMatchTypeOf<UnbrandedUser[] | null>();

expectTypeOf(branded.hasMany('enemies')).toEqualTypeOf<HasManyReference<BrandedUser, 'enemies'>>();
expectTypeOf(branded.hasMany('enemies').___identifier.type).toEqualTypeOf<'user'>();
expectTypeOf(branded.hasMany('enemies').identifiers[0]!.type).toEqualTypeOf<'user'>();
expectTypeOf(branded.hasMany('enemies').___identifier.type).not.toEqualTypeOf<string>();
expectTypeOf(branded.hasMany('enemies').identifiers[0]!.type).not.toEqualTypeOf<string>();
expectTypeOf(branded.hasMany('enemies').key).toEqualTypeOf<'enemies'>();
expectTypeOf(branded.hasMany('enemies').type).toEqualTypeOf<'user'>();
expectTypeOf(branded.hasMany('enemies').value()).toMatchTypeOf<BrandedUser[] | null>();
