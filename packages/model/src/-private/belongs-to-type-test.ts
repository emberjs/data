import { expectTypeOf } from 'expect-type';

import type { ResourceType } from '@warp-drive/core-types/symbols';

import type { BelongsToDecorator, RelationshipOptions } from './belongs-to';
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

expectTypeOf<RelationshipOptions<unknown, boolean>>().toEqualTypeOf({ async: false, inverse: null });
expectTypeOf<RelationshipOptions<unknown, boolean>>().toEqualTypeOf({ async: false, inverse: 'comments' });
expectTypeOf<{ async: false; inverse: 'friends' }>().toEqualTypeOf<RelationshipOptions<User, boolean>>();

expectTypeOf(belongsTo()).toBeNever;
expectTypeOf(belongsTo('user')).toBeNever;
expectTypeOf(belongsTo('user', { async: false, inverse: null })).toMatchTypeOf<BelongsToDecorator<unknown>>();
expectTypeOf(belongsTo('user', { async: false, inverse: 'comments' })).toMatchTypeOf<BelongsToDecorator<unknown>>();
