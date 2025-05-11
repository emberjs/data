import type { RequestInfo } from './request';
import type { RequestSignature } from './symbols';

type User = {
  id: string;
  name: string;
};

function myBuilder<T>(type: string, id: string): RequestInfo<unknown, T> {
  return {
    method: 'GET',
    url: `/${type}/${id}`,
    headers: new Headers(),
    body: null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _result = myBuilder<User>('user', '1');

type A = typeof _result;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _B = A[typeof RequestSignature];
