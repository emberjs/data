import { rerender, settled } from '@ember/test-helpers';

import { setPromiseResult, type Awaitable } from '@ember-data/request';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test } from '@warp-drive/diagnostic/ember';
import { Await, getPromiseState } from '@warp-drive/ember';
import { assert } from '@ember/debug';

function asError<T>(x: Exclude<T, Error>): never;
function asError<T>(x: T): Error;
function asError<T>(x: T | null) {
  assert(`Expected an instance of an error, but got ${typeof x}`, x instanceof Error);
  return x;
}

module('Integration | <Await />', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders each stage of a promise', async function (this: RenderingTestContext, assert) {
    const promise: Awaitable<string, Error> = Promise.resolve().then(() => 'Our Data');
    const state = getPromiseState(promise);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Await @promise={{promise}}>
          <:pending>Loading...<br />Count: {{countFor promise}}</:pending>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:success as |result|>{{result}}<br />Count: {{countFor result}}</:success>
        </Await>
      </template>
    );

    assert.equal(state!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Loading...Count: 1');
    await rerender();
    assert.equal(state!.result, 'Our Data');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our DataCount: 2');
  });

  test('it renders only once when the promise already has a result cached', async function (this: RenderingTestContext, assert) {
    const promise: Awaitable<string, Error> = Promise.resolve().then(() => 'Our Data');

    const result = await promise;
    setPromiseResult(promise, { result, isError: false });

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Await @promise={{promise}}>
          <:pending>Loading...<br />Count: {{countFor promise}}</:pending>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:success as |result|>{{result}}<br />Count: {{countFor result}}</:success>
        </Await>
      </template>
    );

    assert.equal(this.element.textContent?.trim(), 'Our DataCount: 1');
    await settled();

    assert.equal(this.element.textContent?.trim(), 'Our DataCount: 1');
  });

  test('it transitions to error state correctly', async function (this: RenderingTestContext, assert) {
    const promise: Awaitable<string, Error> = Promise.resolve().then(() => {
      throw new Error('Our Error');
    });
    const state = getPromiseState(promise);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Await @promise={{promise}}>
          <:pending>Loading...<br />Count: {{countFor promise}}</:pending>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:success as |result|>{{result}}<br />Count: {{countFor result}}</:success>
        </Await>
      </template>
    );

    assert.equal(state!.result, null);
    assert.equal(state!.error, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Loading...Count: 1');
    await rerender();
    assert.equal(state!.result, null);
    assert.true(state!.error instanceof Error);
    assert.equal((state!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our ErrorCount: 2');
  });

  test('it renders only once when the promise error state is already cached', async function (this: RenderingTestContext, assert) {
    const promise: Awaitable<string, Error> = Promise.resolve().then(() => {
      throw new Error('Our Error');
    });
    const state = getPromiseState(promise);

    try {
      const result = await promise;
      setPromiseResult(promise, { result, isError: false });
    } catch (e) {
      setPromiseResult(promise, { result: e, isError: true });
    }

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Await @promise={{promise}}>
          <:pending>Loading...<br />Count: {{countFor promise}}</:pending>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:success as |result|>{{result}}<br />Count: {{countFor result}}</:success>
        </Await>
      </template>
    );

    assert.equal(state!.result, null);
    assert.true(state!.error instanceof Error);
    assert.equal((state!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Our ErrorCount: 1');
    await rerender();
    assert.equal(state!.result, null);
    assert.true(state!.error instanceof Error);
    assert.equal((state!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Our ErrorCount: 1');
  });
});
