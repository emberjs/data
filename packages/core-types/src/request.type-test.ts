import type { TypeFromInstance } from './record';
import type { TypedRequestInfo } from './request';
import { withBrand } from './request';
import type { SingleResourceDataDocument } from './spec/document';
import type { RequestSignature, Type } from './symbols';

type User = {
  id: string;
  type: string;
  name: string;
  friends: User[];
  bestFriend: User;
  [Type]: 'user';
};

function exampleFindRecord<T>(
  type: TypeFromInstance<T>,
  id: string
): TypedRequestInfo<T, SingleResourceDataDocument<T>> {
  return withBrand({
    url: `/api/${type}/${id}`,
    method: 'GET',
    cacheOptions: { backgroundReload: true },
    op: 'findRecord',
  });
}

const a = exampleFindRecord<User>('user', '1');
function takesUserRequest(userReq: { [RequestSignature]: SingleResourceDataDocument<User> }) {}

takesUserRequest(a);
