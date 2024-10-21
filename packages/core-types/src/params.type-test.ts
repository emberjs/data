/* eslint-disable @typescript-eslint/no-unused-vars */

import type { StringSatisfiesIncludes } from './params';

type A = 'hello' | 'there' | 'goodnight' | 'moon';

type V1 = 'hello';
type V2 = 'hello,there';
type V3 = 'there,hello,goodnight';
type V4 = 'moon,there';
type V5 = 'moon,goodnight,hello,there';
type V6 = 'hello,there,goodnight,moon';

type I1 = 'where';
type I2 = 'hello,not';
type I3 = 'invalid,hello,there';
type I4 = 'hello,there,goodnight,moot';
type I5 = 'hello,there,goodnight,moon,invalid';
type I6 = 'hello,there,goodnight,moons';

function ExpectString<T, V extends T>(): V {
  return '' as V;
}
function ExpectNever<T, V extends never>(): V {
  return '' as V;
}

ExpectString<V1, StringSatisfiesIncludes<V1, A>>();
ExpectString<V2, StringSatisfiesIncludes<V2, A>>();
ExpectString<V3, StringSatisfiesIncludes<V3, A>>();
ExpectString<V4, StringSatisfiesIncludes<V4, A>>();
ExpectString<V5, StringSatisfiesIncludes<V5, A>>();
ExpectString<V6, StringSatisfiesIncludes<V6, A>>();

ExpectNever<I1, StringSatisfiesIncludes<I1, A>>();
ExpectNever<I2, StringSatisfiesIncludes<I2, A>>();
ExpectNever<I3, StringSatisfiesIncludes<I3, A>>();
ExpectNever<I4, StringSatisfiesIncludes<I4, A>>();
ExpectNever<I5, StringSatisfiesIncludes<I5, A>>();
ExpectNever<I6, StringSatisfiesIncludes<I6, A>>();
