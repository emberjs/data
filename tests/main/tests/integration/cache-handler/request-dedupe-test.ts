import { module, test } from 'qunit';

import JSONAPICache from '@ember-data/json-api';
import type { Handler, RequestContext } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { ResourceKey } from '@warp-drive/core-types';
import type { SingleResourceDataDocument } from '@warp-drive/core-types/spec/document';
import type { Type } from '@warp-drive/core-types/symbols';
import {
  instantiateRecord,
  registerDerivations,
  SchemaService,
  teardownRecord,
  withDefaults,
} from '@warp-drive/schema-record';

type User = {
  id: string;
  name: string;
  [Type]: 'user';
};

class TestStore extends Store {
  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [{ name: 'name', kind: 'field' }],
      })
    );

    return schema;
  }

  instantiateRecord(identifier: ResourceKey, createRecordArgs: { [key: string]: unknown }): unknown {
    return instantiateRecord(this, identifier, createRecordArgs);
  }

  teardownRecord(record: unknown) {
    teardownRecord(record);
  }
}

module('Integration | Cache Handler | Request Dedupe', function () {
  test('it dedupes requests', async function (assert) {
    const TestHandler: Handler = {
      request<T>(context: RequestContext) {
        assert.step(`requested: ${context.request.url}`);
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              name: 'runspired',
            },
          },
        } as T);
      },
    };
    const store = new TestStore();
    store.requestManager = new RequestManager().use([TestHandler]).useCache(CacheHandler);

    // trigger simultaneous requests
    const req1 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req2 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req3 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });

    // wait for all requests to resolve
    const [res1, res2, res3] = await Promise.all([req1, req2, req3]);

    // assert that all requests were deduped
    assert.strictEqual(res1.content.data?.name, 'runspired', 'first request resolved correctly');
    assert.strictEqual(res2.content.data?.name, 'runspired', 'second request resolved correctly');
    assert.strictEqual(res3.content.data?.name, 'runspired', 'third request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');

    // ensure subsequent requests are not deduped
    const res4 = await store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });

    assert.strictEqual(res4.content.data?.name, 'runspired', 'fourth request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');
  });

  test('it dedupes requests when backgroundReload is used', async function (assert) {
    const TestHandler: Handler = {
      request<T>(context: RequestContext) {
        assert.step(`requested: ${context.request.url}`);
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              name: 'runspired',
            },
          },
        } as T);
      },
    };
    const store = new TestStore();
    store.requestManager = new RequestManager().use([TestHandler]).useCache(CacheHandler);

    // trigger simultaneous requests
    const req1 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req2 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { backgroundReload: true },
    });
    const req3 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });

    // wait for all requests to resolve
    const [res1, res2, res3] = await Promise.all([req1, req2, req3]);

    // assert that all requests were deduped
    assert.strictEqual(res1.content.data?.name, 'runspired', 'first request resolved correctly');
    assert.strictEqual(res2.content.data?.name, 'runspired', 'second request resolved correctly');
    assert.strictEqual(res3.content.data?.name, 'runspired', 'third request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');

    // ensure subsequent requests are not deduped
    const res4 = await store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });

    assert.strictEqual(res4.content.data?.name, 'runspired', 'fourth request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');
  });

  test('it dedupes requests when reload is used', async function (assert) {
    const TestHandler: Handler = {
      request<T>(context: RequestContext) {
        assert.step(`requested: ${context.request.url}`);
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              name: 'runspired',
            },
          },
        } as T);
      },
    };
    const store = new TestStore();
    store.requestManager = new RequestManager().use([TestHandler]).useCache(CacheHandler);

    // trigger simultaneous requests
    const req1 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req2 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const req3 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });

    // wait for all requests to resolve
    const [res1, res2, res3] = await Promise.all([req1, req2, req3]);

    // assert that all requests were deduped
    assert.strictEqual(res1.content.data?.name, 'runspired', 'first request resolved correctly');
    assert.strictEqual(res2.content.data?.name, 'runspired', 'second request resolved correctly');
    assert.strictEqual(res3.content.data?.name, 'runspired', 'third request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');

    // ensure subsequent requests are not deduped
    const res4 = await store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });

    assert.strictEqual(res4.content.data?.name, 'runspired', 'fourth request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');
  });

  test('it dedupes requests when backgroundReload and reload are used', async function (assert) {
    const TestHandler: Handler = {
      request<T>(context: RequestContext) {
        assert.step(`requested: ${context.request.url}`);
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              name: 'runspired',
            },
          },
        } as T);
      },
    };
    const store = new TestStore();
    store.requestManager = new RequestManager().use([TestHandler]).useCache(CacheHandler);

    // trigger simultaneous requests
    const req1 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req2 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const req3 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { backgroundReload: true },
    });

    // wait for all requests to resolve
    const [res1, res2, res3] = await Promise.all([req1, req2, req3]);

    // assert that all requests were deduped
    assert.strictEqual(res1.content.data?.name, 'runspired', 'first request resolved correctly');
    assert.strictEqual(res2.content.data?.name, 'runspired', 'second request resolved correctly');
    assert.strictEqual(res3.content.data?.name, 'runspired', 'third request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');

    // ensure subsequent requests are not deduped
    const res4 = await store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });

    assert.strictEqual(res4.content.data?.name, 'runspired', 'fourth request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');
  });

  test('it dedupes requests when backgroundReload and reload are used (multi-round)', async function (assert) {
    let totalRequests = 0;
    const TestHandler: Handler = {
      async request<T>(context: RequestContext) {
        assert.step(`requested: ${context.request.url}`);
        await new Promise((r) => setTimeout(r, 1));
        return Promise.resolve({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              name: 'runspired' + ++totalRequests,
            },
          },
        } as T);
      },
    };
    const store = new TestStore();
    store.requestManager = new RequestManager().use([TestHandler]).useCache(CacheHandler);

    // trigger simultaneous requests
    const req1 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req2 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { backgroundReload: true },
    });
    const req3 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });

    // wait for all requests to resolve
    const [res1, res2, res3] = await Promise.all([req1, req2, req3]);

    // assert that all requests were deduped
    assert.strictEqual(res1.content.data?.name, 'runspired1', 'first request resolved correctly');
    assert.strictEqual(res2.content.data?.name, 'runspired1', 'second request resolved correctly');
    assert.strictEqual(res3.content.data?.name, 'runspired1', 'third request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');

    // round 2
    // trigger simultaneous requests
    const req4 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req5 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { backgroundReload: true },
    });
    const req6 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });

    const res4 = await req4;
    assert.strictEqual(res4.content.data?.name, 'runspired1', 'fourth request resolved correctly from cache');

    const res5 = await req5;
    assert.strictEqual(res4.content.data?.name, 'runspired1', 'fifth request resolved correctly from cache');

    const res6 = await req6;

    // assert that all requests were deduped
    assert.strictEqual(res4.content.data?.name, 'runspired2', 'fourth request resolved correctly');
    assert.strictEqual(res5.content.data?.name, 'runspired2', 'fifth request resolved correctly');
    assert.strictEqual(res6.content.data?.name, 'runspired2', 'sixth request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');

    // round 3
    // trigger simultaneous requests
    const req7 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { backgroundReload: true },
    });
    const req8 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req9 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });

    const res7 = await req7;
    assert.strictEqual(res7.content.data?.name, 'runspired2', 'seventh request resolved correctly from cache');

    const res8 = await req8;
    assert.strictEqual(res8.content.data?.name, 'runspired2', 'eigth request resolved correctly from cache');

    const res9 = await req9;

    // assert that all requests were deduped
    assert.strictEqual(res7.content.data?.name, 'runspired3', 'seventh request resolved correctly');
    assert.strictEqual(res8.content.data?.name, 'runspired3', 'eigth request resolved correctly');
    assert.strictEqual(res9.content.data?.name, 'runspired3', 'ninth request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');

    // round 4
    // trigger simultaneous requests
    const req10 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const req11 = store.request<SingleResourceDataDocument<User>>({ url: '/users/1', op: 'query', method: 'GET' });
    const req12 = store.request<SingleResourceDataDocument<User>>({
      url: '/users/1',
      op: 'query',
      method: 'GET',
      cacheOptions: { backgroundReload: true },
    });

    const res11 = await req11;
    assert.strictEqual(res11.content.data?.name, 'runspired3', 'eleventh request resolved correctly from cache');

    const res12 = await req12;
    assert.strictEqual(res12.content.data?.name, 'runspired3', 'twelfth request resolved correctly from cache');

    const res10 = await req10;

    // assert that all requests were deduped
    assert.strictEqual(res10.content.data?.name, 'runspired4', 'tenth request resolved correctly');
    assert.strictEqual(res11.content.data?.name, 'runspired4', 'eleventh request resolved correctly');
    assert.strictEqual(res12.content.data?.name, 'runspired4', 'twelfth request resolved correctly');
    assert.verifySteps(['requested: /users/1'], 'only one request was made');
  });
});
