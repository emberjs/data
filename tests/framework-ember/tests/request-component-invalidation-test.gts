import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import {
  instantiateRecord,
  registerDerivations,
  SchemaService,
  teardownRecord,
  withDefaults,
} from '@warp-drive/core/reactive';
import type { Handler, NextFn } from '@warp-drive/core/request';
import { DefaultCachePolicy } from '@warp-drive/core/store';
import type { CacheCapabilitiesManager } from '@warp-drive/core/types';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { RequestContext } from '@warp-drive/core/types/request';
import type { SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';
import type { Type } from '@warp-drive/core/types/symbols';
import type { Diagnostic } from '@warp-drive/diagnostic/-types';
import type { RenderingTestContext, TestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test as _test } from '@warp-drive/diagnostic/ember';
import { Request } from '@warp-drive/ember';
import { MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { JSONAPICache } from '@warp-drive/json-api';
import { buildBaseURL } from '@warp-drive/utilities';

type User = {
  id: string;
  name: string;
  [Type]: 'user';
};

class Logger implements Handler {
  assert: Diagnostic;

  constructor(assert: Diagnostic) {
    this.assert = assert;
  }

  request<T>(context: RequestContext, next: NextFn<T>) {
    this.assert.step(`request: ${context.request.method ?? 'GET'} ${context.request.url}`);
    return next(context.request);
  }
}

class TestStore extends Store {
  setupRequestManager(testContext: TestContext, assert: Diagnostic): void {
    this.requestManager = new RequestManager()
      .use([new Logger(assert), new MockServerHandler(testContext), Fetch])
      .useCache(CacheHandler);
  }

  lifetimes = new DefaultCachePolicy({
    apiCacheHardExpires: 5000,
    apiCacheSoftExpires: 1000,
    disableTestOptimization: true,
  });

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

// our tests use a rendering test context and add store to it
interface LocalTestContext extends RenderingTestContext {
  store: TestStore;
}
type DiagnosticTest = Parameters<typeof _test<LocalTestContext>>[1];
function test(name: string, callback: DiagnosticTest): void {
  return _test<LocalTestContext>(name, callback);
}

async function mockGETSuccess(context: LocalTestContext, attributes?: { name: string }): Promise<string> {
  const url = buildBaseURL({ resourcePath: 'users/1' });
  await GET(context, 'users/1', () => ({
    data: {
      id: '1',
      type: 'user',
      attributes: Object.assign(
        {
          name: 'Chris Thoburn',
        },
        attributes
      ),
    },
  }));
  return url;
}

module<LocalTestContext>('Integration | <Request /> | Subscription', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (assert: Diagnostic) {
    this.owner.register('service:store', TestStore);
    this.store = this.owner.lookup('service:store') as TestStore;
    this.store.setupRequestManager(this, assert);
  });

  test('Shows refreshing state on external backgroundReload', async function (assert) {
    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'Chris Thoburn x2' });

    const request = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
      cacheOptions: { types: ['user'] },
    });

    assert.equal(request.lid?.lid, url, 'lid is set');

    await this.render(
      <template>
        <Request @request={{request}}>
          <:content as |result state|>
            {{result.data.name}}
            |
            {{if state.isRefreshing "is refreshing" "is fresh"}}
          </:content>
        </Request>
      </template>
    );
    await request;
    await this.h.rerender();

    assert.dom().hasText('Chris Thoburn | is fresh');
    assert.verifySteps([`request: GET ${url}`]);

    const req2 = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
      cacheOptions: { types: ['user'], backgroundReload: true },
    });
    await this.h.rerender();
    assert.dom().hasText('Chris Thoburn | is refreshing');

    await req2;
    await this.store._getAllPending();
    assert.dom().hasText('Chris Thoburn x2 | is fresh');
    assert.verifySteps([`request: GET ${url}`]);
  });

  test('Shows loading state on external reload if request is expired', async function (assert) {
    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'Chris Thoburn x2' });

    const request = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
      cacheOptions: { types: ['user'] },
    });

    assert.equal(request.lid?.lid, url, 'lid is set');

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Loading...</:loading>
          <:content as |result|>{{result.data.name}}</:content>
        </Request>
      </template>
    );
    await request;
    await this.h.rerender();

    assert.dom().hasText('Chris Thoburn');
    assert.verifySteps([`request: GET ${url}`]);

    // force expiration
    // @ts-expect-error private
    this.store.lifetimes.config.apiCacheHardExpires = 0;
    const req2 = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
      cacheOptions: { types: ['user'] },
    });
    await this.h.rerender();
    assert.dom().hasText('Loading...');

    await req2;
    await this.h.rerender();
    assert.dom().hasText('Chris Thoburn x2');
    assert.verifySteps([`request: GET ${url}`]);
  });
});
