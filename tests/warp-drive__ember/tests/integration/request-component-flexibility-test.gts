import type { TOC } from '@ember/component/template-only';
import { on } from '@ember/modifier';
import { renderSettled } from '@ember/renderer';
import { click, rerender, settled } from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';

import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import {
  instantiateRecord,
  registerDerivations,
  SchemaService,
  teardownRecord,
  withDefaults,
} from '@warp-drive/core/reactive';
import type { Future, Handler, NextFn } from '@warp-drive/core/request';
import { createDeferred } from '@warp-drive/core/request';
import { DefaultCachePolicy } from '@warp-drive/core/store';
import type { RequestState } from '@warp-drive/core/store/-private';
import type { CacheCapabilitiesManager } from '@warp-drive/core/types';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { RequestContext } from '@warp-drive/core/types/request';
import type { SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';
import type { Type } from '@warp-drive/core/types/symbols';
import type { Diagnostic } from '@warp-drive/diagnostic/-types';
import type { RenderingTestContext, TestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test as _test } from '@warp-drive/diagnostic/ember';
import { type ContentFeatures, createRequestSubscription, getRequestState, Request } from '@warp-drive/ember';
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
  deferMode: boolean;
  deferred: ReturnType<typeof createDeferred> | undefined;
  deferredResponse: ReturnType<typeof createDeferred> | undefined;
  deferredRequest: ReturnType<typeof createDeferred>;

  constructor(assert: Diagnostic) {
    this.assert = assert;
    this.deferMode = false;
    this.deferredRequest = createDeferred();
  }

  nextPromise() {
    return this.deferredRequest.promise;
  }

  async release() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!this.deferred) {
      throw new Error('no deferred available to release');
    }
    this.deferred.resolve(this.deferredResponse!.promise);
    await this.deferred.promise;
    this.deferred = undefined;
    this.deferredResponse = undefined;
    await settled();
  }

  async request<T>(context: RequestContext, next: NextFn<T>) {
    if (this.deferMode) {
      if (this.deferred) {
        throw new Error('deferred already exists');
      }
      this.deferred = createDeferred<T>();
      this.deferredResponse = createDeferred<T>();
      this.deferredRequest.resolve(context.request);
      this.deferredRequest = createDeferred();
    }
    this.assert.step(`request: ${context.request.method ?? 'GET'} ${context.request.url}`);
    const result = await next(context.request);

    if (this.deferred) {
      this.deferredResponse!.resolve(result);
      return this.deferred.promise as Promise<T>;
    }

    return result;
  }
}

class TestStore extends Store {
  setupRequestManager(testContext: TestContext, assert: Diagnostic): Logger {
    const logger = new Logger(assert);
    this.requestManager = new RequestManager()
      .use([logger, new MockServerHandler(testContext), Fetch])
      .useCache(CacheHandler);
    return logger;
  }

  lifetimes = new DefaultCachePolicy({
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
  logger: Logger;
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

module<LocalTestContext>('Integration | <Request /> | Flexibility', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (assert: Diagnostic) {
    this.owner.register('service:store', TestStore);
    this.store = this.owner.lookup('service:store') as TestStore;
    this.logger = this.store.setupRequestManager(this, assert);
  });

  test('We can wrap it in custom chrome', async function (assert) {
    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'James Thoburn' });

    class State {
      @tracked request: Future<SingleResourceDataDocument<User>> | undefined = undefined;
    }
    const testState = new State();
    const CustomChrome: TOC<{
      Blocks: { default: [] };
      Args: { state: RequestState | null; features: ContentFeatures<unknown> };
    }> = <template>
      <div class="custom-chrome">
        <h1>The State Is: {{if @state @state.status "idle"}}</h1>
        <button class="retry-button" {{on "click" @features.reload}}>Retry</button>
        <div class="outcome">
          {{yield}}
        </div>
      </div>
    </template>;

    await this.render(
      <template>
        <Request @request={{testState.request}} @chrome={{CustomChrome}}>
          <:idle><div class="idle-state">Loading...</div></:idle>
          <:content as |result|><p class="name">{{result.data.name}}</p></:content>
        </Request>
      </template>
    );

    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: idle');
    testState.request = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
    });
    await renderSettled();
    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: pending');

    await testState.request;
    await rerender();
    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');
    assert.equal(this.element.querySelector('p')!.textContent?.trim(), 'Chris Thoburn');
    assert.verifySteps([`request: GET ${url}`]);

    // click the reload button
    await click(this.element.querySelector('.retry-button')!);

    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');
    assert.equal(this.element.querySelector('p')!.textContent?.trim(), 'James Thoburn');
    assert.verifySteps([`request: GET ${url}`]);
  });

  test('We can use an external subscription', async function (assert) {
    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'James Thoburn' });

    const request = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
    });
    const subscription = createRequestSubscription(this.store, { request });

    const CustomChrome: TOC<{
      Blocks: { default: [] };
      Args: { state: RequestState | null; features: ContentFeatures<unknown> };
    }> = <template>
      <div class="custom-chrome">
        <h1>The State Is: {{if @state @state.status "idle"}}</h1>
        <button class="retry-button" {{on "click" @features.reload}}>Retry</button>
        <div class="outcome">
          {{yield}}
        </div>
      </div>
    </template>;

    await this.render(
      <template>
        <Request @subscription={{subscription}} @chrome={{CustomChrome}}>
          <:idle><div class="idle-state">Loading...</div></:idle>
          <:content as |result|><p class="name">{{result.data.name}}</p></:content>
        </Request>
      </template>
    );

    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: pending');

    await request;
    await rerender();
    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');
    assert.equal(this.element.querySelector('p')!.textContent?.trim(), 'Chris Thoburn');
    assert.verifySteps([`request: GET ${url}`]);

    // click the reload button
    await click(this.element.querySelector('.retry-button')!);

    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');
    assert.equal(this.element.querySelector('p')!.textContent?.trim(), 'James Thoburn');
    assert.verifySteps([`request: GET ${url}`]);
  });

  test('We can use reload from getRequestState', async function (assert) {
    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'James Thoburn' });

    const request = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
    });

    class State {
      @tracked request: Future<SingleResourceDataDocument<User>> = request;
    }
    const testState = new State();
    const CustomChrome: TOC<{
      Blocks: { default: [] };
      Args: { state: RequestState | null; features: ContentFeatures<unknown> };
    }> = <template>
      <div class="custom-chrome">
        <h1>The State Is: {{if @state @state.status "idle"}}</h1>
        <button class="retry-button" {{on "click" @features.reload}}>Retry</button>
        <div class="outcome">
          {{yield}}
        </div>
      </div>
    </template>;

    await this.render(
      <template>
        <Request @request={{testState.request}} @chrome={{CustomChrome}}>
          <:idle><div class="idle-state">Loading...</div></:idle>
          <:content as |result|><p class="name">{{result.data.name}}</p></:content>
        </Request>
      </template>
    );

    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: pending');

    await testState.request;
    await rerender();
    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');
    assert.equal(this.element.querySelector('p')!.textContent?.trim(), 'Chris Thoburn');
    assert.verifySteps([`request: GET ${url}`]);

    // reload from getRequestState
    const state = getRequestState(testState.request);
    assert.false(state.isPending, 'state is not pending');
    if (!state.isPending) {
      this.logger.deferMode = true;
      const promise = state.reload();
      await renderSettled();

      // because we are not reloading the subscription, the component will only
      // show loading state IF the cachepolicy shows the request as stale. It is
      // not stale, so we expect the fulfilled state to still be shown.
      assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');

      await this.logger.release();
      await promise;
    }

    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');
    assert.equal(this.element.querySelector('p')!.textContent?.trim(), 'James Thoburn');
    assert.verifySteps([`request: GET ${url}`]);
  });

  test('We can use reload from getRequestState and get a loading state', async function (assert) {
    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'James Thoburn' });

    const request = this.store.request<SingleResourceDataDocument<User>>({
      url,
      method: 'GET',
    });

    class State {
      @tracked request: Future<SingleResourceDataDocument<User>> = request;
    }
    const testState = new State();
    const CustomChrome: TOC<{
      Blocks: { default: [] };
      Args: { state: RequestState | null; features: ContentFeatures<unknown> };
    }> = <template>
      <div class="custom-chrome">
        <h1>The State Is: {{if @state @state.status "idle"}}</h1>
        <button class="retry-button" {{on "click" @features.reload}}>Retry</button>
        <div class="outcome">
          {{yield}}
        </div>
      </div>
    </template>;

    await this.render(
      <template>
        <Request @request={{testState.request}} @chrome={{CustomChrome}}>
          <:idle><div class="idle-state">Loading...</div></:idle>
          <:content as |result|><p class="name">{{result.data.name}}</p></:content>
        </Request>
      </template>
    );

    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: pending');

    await testState.request;
    await rerender();
    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');
    assert.equal(this.element.querySelector('p')!.textContent?.trim(), 'Chris Thoburn');
    assert.verifySteps([`request: GET ${url}`]);

    // reload from getRequestState
    const state = getRequestState(testState.request);
    assert.false(state.isPending, 'state is not pending');
    if (!state.isPending) {
      this.logger.deferMode = true;
      const requestKey = request.lid!;
      this.store.lifetimes.invalidateRequest(requestKey, this.store);
      const promise = state.reload();
      await renderSettled();

      // because we are not reloading the subscription, the component will only
      // show loading state IF the cachepolicy shows the request as stale. It is
      // marked stale (invalidated), so we expect the pending state to be shown
      // but for only one request to be made.
      assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: pending');

      await this.logger.release();
      this.logger.deferMode = false;
      await promise;
    }

    assert.equal(this.element.querySelector('.custom-chrome h1')?.textContent?.trim(), 'The State Is: fulfilled');
    assert.equal(this.element.querySelector('p')!.textContent?.trim(), 'James Thoburn');
    assert.verifySteps([`request: GET ${url}`]);
  });
});
