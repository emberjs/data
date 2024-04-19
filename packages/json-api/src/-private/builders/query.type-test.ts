import { expectTypeOf } from 'expect-type';

import Store from '@ember-data/store';
import type { CollectionResourceDataDocument } from '@warp-drive/core-types/spec/document';
import { RequestSignature, type ResourceType } from '@warp-drive/core-types/symbols';

import { query } from './query';

type NoRelations = {
  name: string;
  [ResourceType]: 'no-relations';
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

const store = new Store();
const requestInit = query<MyThing>('thing');

expectTypeOf<CollectionResourceDataDocument<MyThing>>(requestInit[RequestSignature]!);

const result = await store.request(query('thing', {}));
const query2 = query<MyThing>('thing', {
  include: [
    // @ts-expect-error name is an attribute, not a relationship
    'name',
    'relatedThing',
  ],
});
const result2 = await store.request(query2);

expectTypeOf<unknown>(result.content);
expectTypeOf<MyThing[]>(result2.content.data);

const result3 = await store.request(query('no-relations', {}));
const result4 = await store.request(
  query<NoRelations>('no-relations', {
    include: [
      // @ts-expect-error name is an attribute, not a relationship
      'name',
    ],
  })
);
const result5 = await store.request(query('no-relations'));

expectTypeOf<unknown>(result3.content);
expectTypeOf<NoRelations[]>(result4.content.data);
expectTypeOf<unknown[]>(result5.content.data);
