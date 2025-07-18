import { expectTypeOf } from 'expect-type';

import { Store } from '@warp-drive/core';
import { RequestSignature, type Type } from '@warp-drive/core/types/symbols';

import type { FindRecordResultDocument } from './find-record.ts';
import { findRecord } from './find-record.ts';

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
  [Type]: 'deep-thing';
};

const store = new Store();
const query = findRecord<MyThing>('thing', '1');

expectTypeOf<FindRecordResultDocument<MyThing>>(query[RequestSignature]!);

const result = await store.request(findRecord('thing', '1'));
const result2 = await store.request(
  findRecord<MyThing>('thing', '1', {
    include: [
      // @\ts-expect-error name is an attribute, not a relationship
      'name',
      'relatedThing',
      // @\ts-expect-error relatedThings does not have thirdThing
      'relatedThing.thirdThing',
      'relatedThings',
      'otherThing',
      'otherThing.thirdThing',
      'otherThings',
      'otherThings.deep.myThing',
      // @\ts-expect-error cyclic relationships are not allowed in includes
      'relatedThing.relatedThing',
    ],
  })
);

expectTypeOf<unknown>(result.content);
expectTypeOf<MyThing>(result2.content.data);
