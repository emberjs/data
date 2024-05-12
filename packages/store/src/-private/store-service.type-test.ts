import EmberObject from '@ember/object';

import { expectTypeOf } from 'expect-type';

import { ResourceType } from '@warp-drive/core-types/symbols';

import type { CreateRecordProperties } from './store-service';
import type { Collection, IdentifierArray } from './record-arrays/identifier-array';
import { Store } from './store-service';

//////////////////////////////////
//////////////////////////////////
// store.peekRecord
//////////////////////////////////
//////////////////////////////////
{
  const store = new Store();

  type UnbrandedUser = {
    name: string;
  };
  type BrandedUser = {
    name: string;
    [ResourceType]: 'user';
  };

  const result1 = store.peekRecord('user', '1');

  expectTypeOf(result1).toBeUnknown();
  expectTypeOf(
    store.peekRecord<UnbrandedUser>(
      // @ts-expect-error since there is no brand, this should error
      'user',
      '1'
    )
  ).toEqualTypeOf<UnbrandedUser | null>();

  expectTypeOf(store.peekRecord<BrandedUser>('user', '1')).toEqualTypeOf<BrandedUser | null>();
  expectTypeOf(
    store.peekRecord<BrandedUser>(
      // @ts-expect-error should error since this does not match the brand
      'users',
      '1'
    )
  ).toEqualTypeOf<BrandedUser | null>();
}

//////////////////////////////////
//////////////////////////////////
// store.findRecord
//////////////////////////////////
//////////////////////////////////
{
  const store = new Store();

  type UnbrandedUser = {
    name: string;
  };
  type BrandedUser = {
    name: string;
    [ResourceType]: 'user';
  };

  expectTypeOf(store.findRecord('user', '1')).toEqualTypeOf<Promise<unknown>>();
  expectTypeOf(
    // @ts-expect-error no matching signature since no brand from which to check 'user'
    store.findRecord<UnbrandedUser>('user', '1')
  ).toEqualTypeOf<Promise<UnbrandedUser>>();
  expectTypeOf(store.findRecord<BrandedUser>('user', '1')).toEqualTypeOf<Promise<BrandedUser>>();
  expectTypeOf(
    // @ts-expect-error should error since this does not match the brand
    store.findRecord<BrandedUser>('users', '1')
  ).toEqualTypeOf<Promise<BrandedUser>>();

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

  const result = await store.findRecord('thing', '1');
  const result2 = await store.findRecord<MyThing>('thing', '1', {
    include: [
      // @ts-expect-error name is an attribute, not a relationship
      'name',
      'relatedThing',
      // @ts-expect-error relatedThings does not have thirdThing
      'relatedThing.thirdThing',
      'relatedThings',
      'otherThing',
      'otherThing.thirdThing',
      'otherThings',
      'otherThings.deep.myThing',
      // @ts-expect-error cyclic relationships are not allowed in includes
      'relatedThing.relatedThing',
    ],
  });

  expectTypeOf<unknown>(result);
  expectTypeOf<MyThing>(result2);
}

//////////////////////////////////
//////////////////////////////////
// store.queryRecord
//////////////////////////////////
//////////////////////////////////
{
  const store = new Store();

  type UnbrandedUser = {
    name: string;
  };
  type BrandedUser = {
    name: string;
    [ResourceType]: 'user';
  };

  // @ts-expect-error expect error since no second argument
  void store.queryRecord('user');

  expectTypeOf(store.queryRecord('user', {})).toEqualTypeOf<Promise<unknown>>();
  expectTypeOf(
    // @ts-expect-error no matching signature since no brand from which to check 'user'
    store.queryRecord<UnbrandedUser>('user', {})
  ).toEqualTypeOf<Promise<UnbrandedUser | null>>();
  expectTypeOf(store.queryRecord<BrandedUser>('user', {})).toEqualTypeOf<Promise<BrandedUser | null>>();
  expectTypeOf(
    // @ts-expect-error should error since this does not match the brand
    store.queryRecord<BrandedUser>('users', {})
  ).toEqualTypeOf<Promise<BrandedUser | null>>();

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

  const result = await store.queryRecord('thing', {});
  const result2 = await store.queryRecord<MyThing>('thing', {
    include: [
      // @ts-expect-error name is an attribute, not a relationship
      'name',
      'relatedThing',
      // @ts-expect-error relatedThings does not have thirdThing
      'relatedThing.thirdThing',
      'relatedThings',
      'otherThing',
      'otherThing.thirdThing',
      'otherThings',
      'otherThings.deep.myThing',
      // @ts-expect-error cyclic relationships are not allowed in includes
      'relatedThing.relatedThing',
    ],
  });
  const result3 = await store.queryRecord('thing', {
    // expect no error because we did not pass a generic
    include: [
      'name',
      'relatedThing',
      'relatedThing.thirdThing',
      'relatedThings',
      'otherThing',
      'otherThing.thirdThing',
      'otherThings',
      'otherThings.deep.myThing',
      'relatedThing.relatedThing',
    ],
  });

  expectTypeOf<unknown>(result);
  expectTypeOf<unknown>(result3);
  expectTypeOf<MyThing | null>(result2);
}

//////////////////////////////////
//////////////////////////////////
// store.findAll
//////////////////////////////////
//////////////////////////////////
{
  const store = new Store();

  type UnbrandedUser = {
    name: string;
  };
  type BrandedUser = {
    name: string;
    [ResourceType]: 'user';
  };

  expectTypeOf(store.findAll('user')).toEqualTypeOf<Promise<IdentifierArray>>();
  expectTypeOf(
    // @ts-expect-error no matching signature since no brand from which to check 'user'
    store.findAll<UnbrandedUser>('user')
  ).toEqualTypeOf<Promise<IdentifierArray<UnbrandedUser>>>();
  expectTypeOf(store.findAll<BrandedUser>('user')).toEqualTypeOf<Promise<IdentifierArray<BrandedUser>>>();
  expectTypeOf(
    // @ts-expect-error should error since this does not match the brand
    store.findAll<BrandedUser>('users')
  ).toEqualTypeOf<Promise<IdentifierArray<BrandedUser>>>();

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

  const result = await store.findAll('thing');
  const result2 = await store.findAll<MyThing>('thing', {
    include: [
      // @ts-expect-error name is an attribute, not a relationship
      'name',
      'relatedThing',
      // @ts-expect-error relatedThings does not have thirdThing
      'relatedThing.thirdThing',
      'relatedThings',
      'otherThing',
      'otherThing.thirdThing',
      'otherThings',
      'otherThings.deep.myThing',
      // @ts-expect-error cyclic relationships are not allowed in includes
      'relatedThing.relatedThing',
    ],
  });

  expectTypeOf<IdentifierArray>(result);
  expectTypeOf<IdentifierArray<MyThing>>(result2);
}

//////////////////////////////////
//////////////////////////////////
// store.query
//////////////////////////////////
//////////////////////////////////
{
  const store = new Store();

  type UnbrandedUser = {
    name: string;
  };
  type BrandedUser = {
    name: string;
    [ResourceType]: 'user';
  };

  // @ts-expect-error expect error since no second argument
  void store.query('user');

  expectTypeOf(store.query('user', {})).toEqualTypeOf<Promise<Collection>>();
  expectTypeOf(
    // @ts-expect-error no matching signature since no brand from which to check 'user'
    store.query<UnbrandedUser>('user', {})
  ).toEqualTypeOf<Promise<Collection<UnbrandedUser>>>();
  expectTypeOf(store.query<BrandedUser>('user', {})).toEqualTypeOf<Promise<Collection<BrandedUser>>>();
  expectTypeOf(
    // @ts-expect-error should error since this does not match the brand
    store.query<BrandedUser>('users', {})
  ).toEqualTypeOf<Promise<Collection<BrandedUser>>>();

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

  const result = await store.query('thing', {});
  const result2 = await store.query<MyThing>('thing', {
    include: [
      // @ts-expect-error name is an attribute, not a relationship
      'name',
      'relatedThing',
      // @ts-expect-error relatedThings does not have thirdThing
      'relatedThing.thirdThing',
      'relatedThings',
      'otherThing',
      'otherThing.thirdThing',
      'otherThings',
      'otherThings.deep.myThing',
      // @ts-expect-error cyclic relationships are not allowed in includes
      'relatedThing.relatedThing',
    ],
  });

  const result3 = await store.query('thing', {
    // we expect no errors here since we did not pass a generic to query
    include: [
      'name',
      'relatedThing',
      'relatedThing.thirdThing',
      'relatedThings',
      'otherThing',
      'otherThing.thirdThing',
      'otherThings',
      'otherThings.deep.myThing',
      'relatedThing.relatedThing',
    ],
  });

  expectTypeOf<Collection>(result);
  expectTypeOf<Collection>(result3);
  expectTypeOf<Collection<MyThing>>(result2);
}

//////////////////////////////////
//////////////////////////////////
// type CreateRecordProperties
//////////////////////////////////
//////////////////////////////////
{
  class MockModel extends EmberObject {
    [ResourceType] = 'user' as const;
    asyncProp = Promise.resolve('async');
    syncProp = 'sync';
  }

  const mock = new MockModel();

  expectTypeOf(mock.asyncProp).toEqualTypeOf<Promise<string>>();
  expectTypeOf(mock.syncProp).toEqualTypeOf<string>();

  const result: CreateRecordProperties<typeof mock> = {};

  // Only `asyncProp` and `syncProp` should be present in the type, they should be optional and
  // any Promise types should be awaited.
  expectTypeOf(result).toEqualTypeOf<{ asyncProp?: string; syncProp?: string }>();
}
