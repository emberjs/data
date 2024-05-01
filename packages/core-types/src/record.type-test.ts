// test

import type { ExtractSuggestedCacheTypes, Includes, TypedRecordInstance } from './record';
import type { ResourceType } from './symbols';

type NoRelations = {
  name: string;
  [ResourceType]: 'no-relations';
};

type NoSelfReference = {
  name: string;
  related: MyThing;
  [ResourceType]: 'no-self-reference';
};

type MyThing = {
  name: string;
  relatedThing: MyThing;
  relatedThings: MyThing[];
  otherThing: OtherThing;
  otherThings: OtherThing[];
  [ResourceType]: 'thing';
};

type OtherThing = {
  name: string;
  thirdThing: OtherThing;
  deals: OtherThing[];
  original: MyThing;
  deep: DeepThing;
  [ResourceType]: 'other-thing';
};

type DeepThing = {
  name: string;
  relatedThing: MyThing;
  otherThing: OtherThing;
  myThing: DeepThing;
  [ResourceType]: 'deep-thing';
};

function takesSuggestTypes<T extends TypedRecordInstance>(types: ExtractSuggestedCacheTypes<T>[]) {}
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
  'deep-thing',
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
]);

takesIncludes<NoRelations>([
  // @ts-expect-error not a valid path since it doesn't exist
  'not',
]);
