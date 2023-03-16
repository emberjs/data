import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { resolve } from 'rsvp';

import type { NextFn } from '@ember-data/request/-private/types';
import { StoreRequestContext } from '@ember-data/store/-private/cache-handler';

import { guardDestroyedStore } from './common';
import { normalizeResponseHelper } from './utils/serializer-response';

export const LegacyNetworkHandler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>) {
    // if we are not a legacy request, move on
    if (context.request.url || !context.request.op) {
      return next(context.request);
    }

    switch (context.request.op) {
      case 'queryRecord':
        return queryRecord(context);
      default:
        return next(context.request);
    }
  },
};

function queryRecord<T>(context: StoreRequestContext): Promise<T> {
  const { store, data } = context.request;
  const { type, query, options } = data as { type: string; query: Record<string, unknown>; options: object };
  const adapter = store.adapterFor(type);
  assert(`You tried to make a query but you have no adapter (for ${type})`, adapter);
  assert(
    `You tried to make a query but your adapter does not implement 'queryRecord'`,
    typeof adapter.queryRecord === 'function'
  );

  const schema = store.modelFor(type);
  let promise = resolve().then(() => adapter.queryRecord(store, schema, query, options)) as Promise<T>;

  promise = guardDestroyedStore(promise, store, DEBUG ? `DS: Handle Adapter#queryRecord of ${type}` : ``) as Promise<T>;

  return promise.then((adapterPayload: T) => {
    let serializer = store.serializerFor(type);
    let payload = normalizeResponseHelper(
      serializer,
      store,
      schema,
      adapterPayload as Record<string, unknown>,
      null,
      'queryRecord'
    );

    assert(
      `Expected the primary data returned by the serializer for a 'queryRecord' response to be a single object or null but instead it was an array.`,
      !Array.isArray(payload.data)
    );

    return store._push(payload);
  }) as Promise<T>;
}
