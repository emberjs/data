import { rerender } from '@ember/test-helpers';

import JSONAPICache from '@ember-data/json-api';
import type { Handler, NextFn, RequestContext } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { buildBaseURL, CachePolicy } from '@ember-data/request-utils';
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { SingleResourceDataDocument } from '@warp-drive/core-types/spec/document';
import type { Type } from '@warp-drive/core-types/symbols';
import type { Diagnostic } from '@warp-drive/diagnostic/-types';
import type { RenderingTestContext, TestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test as _test } from '@warp-drive/diagnostic/ember';
import { Request } from '@warp-drive/ember';
import { GET, HolodeckHandler } from '@warp-drive/holodeck';
import { instantiateRecord, teardownRecord } from '@warp-drive/schema-record/hooks';
import type { SchemaRecord } from '@warp-drive/schema-record/record';
import { registerDerivations, SchemaService, withDefaults } from '@warp-drive/schema-record/schema';

function trim(str?: string | null): string {
  if (!str) {
    return '';
  }
  return str
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

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
      .use([new Logger(assert), new HolodeckHandler(testContext), Fetch])
      .useCache(CacheHandler);
  }

  lifetimes = new CachePolicy({
    apiCacheHardExpires: 5000,
    apiCacheSoftExpires: 1000,
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

  instantiateRecord(identifier: StableRecordIdentifier, createRecordArgs: { [key: string]: unknown }): unknown {
    return instantiateRecord(this, identifier, createRecordArgs);
  }

  teardownRecord(record: SchemaRecord) {
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
    await rerender();

    assert.equal(trim(this.element.textContent), 'Chris Thoburn | is fresh');
    assert.verifySteps([`request: GET ${url}`]);

    const req2 = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
      cacheOptions: { types: ['user'], backgroundReload: true },
    });
    await rerender();
    assert.equal(trim(this.element.textContent), 'Chris Thoburn | is refreshing');

    await req2;
    await this.store._getAllPending();
    assert.equal(trim(this.element.textContent), 'Chris Thoburn x2 | is fresh');
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
    await rerender();

    assert.equal(trim(this.element.textContent), 'Chris Thoburn');
    assert.verifySteps([`request: GET ${url}`]);

    // force expiration
    this.store.lifetimes.config.apiCacheHardExpires = 0;
    const req2 = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
      cacheOptions: { types: ['user'] },
    });
    await rerender();
    assert.equal(trim(this.element.textContent), 'Loading...');

    await req2;
    await rerender();
    assert.equal(trim(this.element.textContent), 'Chris Thoburn x2');
    assert.verifySteps([`request: GET ${url}`]);
  });
});
