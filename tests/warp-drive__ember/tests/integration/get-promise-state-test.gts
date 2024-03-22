import { rerender, settled } from '@ember/test-helpers';

import { createDeferred, setPromiseResult } from '@ember-data/request';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test } from '@warp-drive/diagnostic/ember';
import { getPromiseState } from '@warp-drive/ember';

type PromiseState<T, E> = ReturnType<typeof getPromiseState<T, E>>;

module('Integration | get-promise-state', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders each stage of a promise resolving in a new microtask queue', async function (this: RenderingTestContext, assert) {
    const defer = createDeferred<string>();

    let state: PromiseState<string, Error>;
    function _getPromiseState<T>(p: Promise<T>): PromiseState<T, Error> {
      state = getPromiseState(p) as PromiseState<string, Error>;
      return state as PromiseState<T, Error>;
    }
    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        {{#let (_getPromiseState defer.promise) as |state|}}
          {{state.result}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>
    );
    assert.equal(state!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Count:\n          1');
    defer.resolve('Our Data');
    await defer.promise;
    await rerender();
    assert.equal(state!, getPromiseState(defer.promise));
    assert.equal(state!.result, 'Our Data');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our DataCount:\n          2');
  });

  test('it renders each stage of a promise resolving in the same microtask queue', async function (this: RenderingTestContext, assert) {
    const promise = Promise.resolve().then(() => 'Our Data');

    let state: PromiseState<string, Error>;
    function _getPromiseState<T>(p: Promise<T>): PromiseState<T, Error> {
      state = getPromiseState(p) as PromiseState<string, Error>;
      return state as PromiseState<T, Error>;
    }
    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{state.result}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>
    );
    assert.equal(state!, getPromiseState(promise));
    assert.equal(state!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Count:\n          1');
    await rerender();
    assert.equal(state!.result, 'Our Data');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our DataCount:\n          2');
  });

  test('it renders only once when the promise already has a result cached', async function (this: RenderingTestContext, assert) {
    const promise = Promise.resolve().then(() => 'Our Data');

    const result = await promise;
    setPromiseResult(promise, { result, isError: false });

    let state: PromiseState<string, Error>;
    function _getPromiseState<T>(p: Promise<T>): PromiseState<T, Error> {
      state = getPromiseState(p) as PromiseState<string, Error>;
      return state as PromiseState<T, Error>;
    }
    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{state.result}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>
    );

    assert.equal(this.element.textContent?.trim(), 'Our DataCount:\n          1');
    await settled();

    assert.equal(this.element.textContent?.trim(), 'Our DataCount:\n          1');
  });

  test('it transitions to error state correctly', async function (this: RenderingTestContext, assert) {
    const promise = Promise.resolve().then(() => {
      throw new Error('Our Error');
    });

    let state: PromiseState<string, Error>;
    function _getPromiseState<T>(p: Promise<T>): PromiseState<T, Error> {
      state = getPromiseState(p) as PromiseState<string, Error>;
      return state as PromiseState<T, Error>;
    }
    let counter = 0;
    function countFor(_result: unknown, _error: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{#if state.isPending}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}{{/let}}
      </template>
    );

    assert.equal(state!, getPromiseState(promise));
    assert.equal(state!.result, null);
    assert.equal(state!.error, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Pending\n          Count:\n          1');
    await rerender();
    assert.equal(state!.result, null);
    assert.true(state!.error instanceof Error);
    assert.equal((state!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          2');
  });

  test('it renders only once when the promise error state is already cached', async function (this: RenderingTestContext, assert) {
    const promise = Promise.resolve().then(() => {
      throw new Error('Our Error');
    });
    try {
      const result = await promise;
      setPromiseResult(promise, { result, isError: false });
    } catch (e) {
      setPromiseResult(promise, { result: e, isError: true });
    }

    let state: PromiseState<string, Error>;
    function _getPromiseState<T>(p: Promise<T>): PromiseState<T, Error> {
      state = getPromiseState(p) as PromiseState<string, Error>;
      return state as PromiseState<T, Error>;
    }
    let counter = 0;
    function countFor(_result: unknown, _error: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        {{#let (_getPromiseState promise) as |state|}}
          {{#if state.isPending}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}{{/let}}
      </template>
    );

    assert.equal(state!.result, null);
    assert.true(state!.error instanceof Error);
    assert.equal((state!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          1');
    await rerender();
    assert.equal(state!.result, null);
    assert.true(state!.error instanceof Error);
    assert.equal((state!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          1');
  });
});
