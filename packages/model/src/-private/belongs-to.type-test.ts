import { expectTypeOf } from 'expect-type';

import type { ResourceType } from '@warp-drive/core-types/symbols';

import type { RelationshipDecorator, RelationshipOptions } from './belongs-to';
import { belongsTo } from './belongs-to';

// ------------------------------
//              💚
// ==============================
//          Type Tests
// ==============================
//              🐹
// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇

type User = {
  [ResourceType]: 'user';
  friends: User[];
};

expectTypeOf<{ async: false; inverse: null }>().toMatchTypeOf<RelationshipOptions<unknown, boolean>>();
expectTypeOf<{ async: true; inverse: 'comments' }>().toMatchTypeOf<RelationshipOptions<unknown, boolean>>();
expectTypeOf<{ async: false; inverse: 'friends' }>().toMatchTypeOf<RelationshipOptions<User, boolean>>();
expectTypeOf<{ async: true; inverse: 'friends' }>().toMatchTypeOf<RelationshipOptions<User, boolean>>();
expectTypeOf<{ async: false; inverse: null }>().toMatchTypeOf<RelationshipOptions<User, boolean>>();
expectTypeOf<{ async: false; inverse: 'notfriends' }>().not.toMatchTypeOf<RelationshipOptions<User, boolean>>();
expectTypeOf<{ async: false; inverse: 'friends' }>().not.toMatchTypeOf<RelationshipOptions<User, true>>();
expectTypeOf<{ async: true; inverse: 'friends' }>().not.toMatchTypeOf<RelationshipOptions<User, false>>();

expectTypeOf(belongsTo()).toBeNever;
expectTypeOf(belongsTo('user')).toBeNever;
expectTypeOf(belongsTo('user', { async: false, inverse: null })).toMatchTypeOf<RelationshipDecorator<unknown>>();
expectTypeOf(belongsTo('user', { async: false, inverse: 'comments' })).toMatchTypeOf<RelationshipDecorator<unknown>>();

type CompanyType = {
  ceo: User;
};
class Company {
  // to confirm we can be called as a decorator
  @belongsTo('user', { async: false, inverse: null }) declare ceo: User;
}
expectTypeOf<Company>().toMatchTypeOf<CompanyType>();
