import { expectTypeOf } from 'expect-type';

import type { ResourceType } from '@warp-drive/core-types/symbols';

import type { RelationshipDecorator } from './belongs-to';
import { hasMany } from './has-many';

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

expectTypeOf(hasMany()).toBeNever;
expectTypeOf(hasMany('user')).toBeNever;
expectTypeOf(hasMany('user', { async: false, inverse: null })).toMatchTypeOf<RelationshipDecorator<unknown>>();
expectTypeOf(hasMany('user', { async: false, inverse: 'comments' })).toMatchTypeOf<RelationshipDecorator<unknown>>();

type CompanyType = {
  executives: User[];
};
class Company {
  // to confirm we can be called as a decorator
  @hasMany('user', { async: false, inverse: null }) declare executives: User[];
}
expectTypeOf<Company>().toMatchTypeOf<CompanyType>();
