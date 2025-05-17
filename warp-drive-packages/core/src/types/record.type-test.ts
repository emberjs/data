/* eslint-disable @typescript-eslint/no-unused-vars */
// tests

import type { ExtractSuggestedCacheTypes, Includes, StringSatisfiesIncludes, TypedRecordInstance } from './record.ts';
import { createIncludeValidator } from './record.ts';
import type { Type } from './symbols.ts';

type NoRelations = {
  name: string;
  [Type]: 'no-relations';
};

type NoSelfReference = {
  name: string;
  related: MyThing;
  [Type]: 'no-self-reference';
};

type MyThing = {
  name: string;
  relatedThing: MyThing;
  relatedThings: MyThing[];
  otherThing: OtherThing;
  otherThings: OtherThing[];
  [Type]: 'thing';
};

type OtherThing = {
  name: string;
  thirdThing: OtherThing;
  deals: OtherThing[];
  original: MyThing;
  deep: DeepThing;
  [Type]: 'other-thing';
};

type DeepThing = {
  name: string;
  relatedThing: MyThing;
  otherThing: OtherThing;
  myThing: DeepThing;
  reallyDeepThing: ReallyDeepThing;
  [Type]: 'deep-thing';
};

type ReallyDeepThing = {
  name: string;
  relatedThing: MyThing;
  otherThing: OtherThing;
  myThing: DeepThing;
  [Type]: 'really-deep-thing';
};

function takesSuggestTypes<T extends TypedRecordInstance, MAX_DEPTH extends 3 | 4 | 5 = 3>(
  types: ExtractSuggestedCacheTypes<T, MAX_DEPTH>[]
) {}
takesSuggestTypes<MyThing>([
  'thing',
  'other-thing',
  'deep-thing',
  // @ts-expect-error not a valid type
  'not-a-thing',
]);

takesSuggestTypes<NoSelfReference>([
  // we should include our own type even when not self-referential
  'no-self-reference',
  'thing',
  'other-thing',
  // @ts-expect-error this should fail at recursion depth 3
  'deep-thing',
  // @ts-expect-error this should fail at recursion depth 4
  'really-deep-thing',
  // @ts-expect-error not a valid type
  'not-a-thing',
]);

takesSuggestTypes<NoSelfReference, 4>([
  // we should include our own type even when not self-referential
  'no-self-reference',
  'thing',
  'other-thing',
  'deep-thing',
  // @ts-expect-error this should fail at recursion depth 4
  'really-deep-thing',
  // @ts-expect-error not a valid type
  'not-a-thing',
]);

takesSuggestTypes<NoSelfReference, 5>([
  // we should include our own type even when not self-referential
  'no-self-reference',
  'thing',
  'other-thing',
  'deep-thing',
  'really-deep-thing',
  // @ts-expect-error not a valid type
  'not-a-thing',
]);

takesSuggestTypes<NoRelations>([
  'no-relations',
  // @ts-expect-error not a valid type
  'not-a-thing',
]);

function takesIncludes<T extends TypedRecordInstance>(includes: Includes<T>[]) {}
takesIncludes<MyThing>([
  // @ts-expect-error not a valid path since it doesn't exist
  'not',
  'relatedThing',
  'relatedThings',
  'otherThing',
  'otherThings',
  // @ts-expect-error not a valid path since its an attribute
  'name',
  'otherThing.thirdThing',
  'otherThing.deals',
  'otherThing.original',
  // @ts-expect-error should not include this since original was already processed above
  'otherThing.original.relatedThing',
  'otherThing.deep',
  'otherThing.deep.relatedThing',
  'otherThing.deep.otherThing',
  'otherThing.deep.myThing',
  'otherThings.thirdThing',
  'otherThings.deals',
  'otherThings.original',
  'otherThings.deep',
  'otherThings.deep.relatedThing',
  // @ts-expect-error should not include this since original was already processed above
  'otherThings.deep.relatedThing.relatedThing',
  'otherThings.deep.otherThing',
  'otherThings.deep.myThing',
  'otherThing.deep.reallyDeepThing',
  // @ts-expect-error should not include this since depth is capped at 3
  'otherThing.deep.reallyDeepThing.relatedThing',
]);

takesIncludes<NoRelations>([
  // @ts-expect-error not a valid path since it doesn't exist
  'not',
]);

const validator = createIncludeValidator<MyThing>();

function expectString(t: string) {}
function expectNever(t: never) {}

expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));
expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));
expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));
expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));
expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));
expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));
expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));
expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));
expectString(validator('relatedThing,otherThing,otherThings.thirdThing'));

expectNever(
  // @ts-expect-error not a valid path since it doesn't exist
  validator('not')
);
expectString(validator('relatedThing'));
expectString(validator('relatedThings'));
expectString(validator('otherThing'));
expectString(validator('otherThings'));
expectNever(
  // @ts-expect-error not a valid path since its an attribute
  validator('name')
);
expectString(validator('otherThing.thirdThing'));
expectString(validator('otherThing.deals'));
expectString(validator('otherThing.original'));
expectNever(
  // @ts-expect-error should not include this since original was already processed above
  validator('otherThing.original.relatedThing')
);
expectString(validator('otherThing.deep'));
expectString(validator('otherThing.deep.relatedThing'));
expectString(validator('otherThing.deep.otherThing'));
expectString(validator('otherThing.deep.myThing'));
expectString(validator('otherThings.thirdThing'));
expectString(validator('otherThings.deals'));
expectString(validator('otherThings.original'));
expectString(validator('otherThings.deep'));
expectString(validator('otherThings.deep.relatedThing'));

expectNever(
  // @ts-expect-error should not include this since original was already processed above
  validator('otherThings.deep.relatedThing.relatedThing')
);
expectString(validator('otherThings.deep.otherThing'));
expectString(validator('otherThings.deep.myThing'));
expectString(validator('otherThing.deep.reallyDeepThing'));
expectNever(
  // @ts-expect-error should not include this since depth is capped at 3
  validator('otherThing.deep.reallyDeepThing.relatedThing')
);

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

const foo: StringSatisfiesIncludes<
  'otherThings.deep.relatedThing',
  Includes<MyThing>
> = 'otherThings.deep.relatedThing';

// @ts-expect-error foo2 is never :)
const foo2: StringSatisfiesIncludes<'company,company.ceo,friends', Includes<MyThing>> = 'company,company.ceo,friends';

expectString(foo);
expectNever(foo2);
