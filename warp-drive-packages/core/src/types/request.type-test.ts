import { withBrand } from '../request.ts';
import type { RequestSignature } from './symbols.ts';

type User = {
  id: string;
  name: string;
};

function myBuilder<T>(type: string, id: string) {
  return withBrand<T>({
    method: 'GET',
    url: `/${type}/${id}`,
  });
}

const result = myBuilder<User>('user', '1');

type A = typeof result;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _B = A[typeof RequestSignature];

function expectsUser<T extends { [RequestSignature]: User }>(request: T) {}
expectsUser(result);

// @ts-expect-error
expectsUser({});
