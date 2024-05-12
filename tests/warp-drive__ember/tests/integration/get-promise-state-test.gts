import { rerender, settled } from '@ember/test-helpers';

import { type Awaitable, createDeferred, setPromiseResult } from '@ember-data/request';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test } from '@warp-drive/diagnostic/ember';
import { getPromiseState } from '@warp-drive/ember';

type PromiseState<T, E> = ReturnType<typeof getPromiseState<T, E>>;
const SecretSymbol = Symbol.for('LegacyPromiseProxy');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PromiseProxy<T, E> extends Promise<T> {}
class PromiseProxy<T, E> {
  [SecretSymbol]: true;
  promise: Awaitable<T, E>;

  constructor(promise: Awaitable<T, E>) {
    this[SecretSymbol] = true;
    this.promise = promise;
  }

  then<T1, T2>(
    onFulfilled?: ((value: T) => unknown) | undefined | null,
    onRejected?: ((error: E) => T2 | Promise<T2>) | undefined | null
  ): Promise<T1 | T2> {
    return this.promise.then(onFulfilled!, onRejected!) as Promise<T1 | T2>;
  }

  catch<T2>(onRejected: ((error: E) => T2 | Promise<T2>) | undefined | null): Promise<T2> {
    return this.promise.catch(onRejected!) as Promise<T2>;
  }

  finally(onFinally: () => void): Promise<T> {
    return this.promise.finally(onFinally) as Promise<T>;
  }
}

module('Integration | get-promise-state', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders each stage of a promise resolving in a new microtask queue', async function (this: RenderingTestContext, assert) {
    const defer = createDeferred<string>();

    let state1: PromiseState<string, Error>;
    function _getPromiseState(p: Promise<string>): PromiseState<string, Error> {
      state1 = getPromiseState<string, Error>(p);
      return state1;
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
    assert.equal(state1!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Count:\n          1');
    defer.resolve('Our Data');
    await defer.promise;
    await rerender();
    assert.equal(state1!, getPromiseState(defer.promise));
    assert.equal(state1!.result, 'Our Data');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our DataCount:\n          2');
  });

  test('it renders each stage of a promise resolving in the same microtask queue', async function (this: RenderingTestContext, assert) {
    const promise = Promise.resolve().then(() => 'Our Data');

    let state1: PromiseState<string, Error>;
    function _getPromiseState(p: Promise<string>): PromiseState<string, Error> {
      state1 = getPromiseState<string, Error>(p);
      return state1;
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
    assert.equal(state1!, getPromiseState(promise));
    assert.equal(state1!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Count:\n          1');
    await rerender();
    assert.equal(state1!.result, 'Our Data');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our DataCount:\n          2');
  });

  test('it renders only once when the promise already has a result cached', async function (this: RenderingTestContext, assert) {
    const promise = Promise.resolve().then(() => 'Our Data');

    const result = await promise;
    setPromiseResult(promise, { result, isError: false });

    let state1: PromiseState<string, Error>;
    function _getPromiseState(p: Promise<string>): PromiseState<string, Error> {
      state1 = getPromiseState<string, Error>(p);
      return state1;
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

    let state1: PromiseState<string, Error>;
    function _getPromiseState(p: Promise<string>): PromiseState<string, Error> {
      state1 = getPromiseState<string, Error>(p);
      return state1;
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

    assert.equal(state1!, getPromiseState<never, Error>(promise));
    assert.equal(state1!.result, null);
    assert.equal(state1!.error, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Pending\n          Count:\n          1');
    await rerender();
    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
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

    let state1: PromiseState<string, Error>;
    function _getPromiseState(p: Promise<string>): PromiseState<string, Error> {
      state1 = getPromiseState<string, Error>(p);
      return state1;
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

    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          1');
    await rerender();
    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          1');
  });

  test('it unwraps promise-proxies that utilize the secret symbol for error states', async function (this: RenderingTestContext, assert) {
    const _promise = Promise.resolve().then(() => {
      throw new Error('Our Error');
    });
    const promise = new PromiseProxy<never, Error>(_promise);

    try {
      getPromiseState(promise);
      await promise;
    } catch {
      // do nothing
    }

    let state1: PromiseState<string, Error>;
    function _getPromiseState(p: Promise<string>): PromiseState<string, Error> {
      state1 = getPromiseState<string, Error>(p);
      return state1;
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

    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          1');
    await rerender();
    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          1');
    assert.equal(state1!, getPromiseState<never, Error>(_promise));
  });

  test('it unwraps promise-proxies that utilize the secret symbol for success states', async function (this: RenderingTestContext, assert) {
    const _promise = Promise.resolve().then(() => 'Our Data');
    const promise = new PromiseProxy<string, Error>(_promise);
    getPromiseState(promise);
    await promise;

    let state1: PromiseState<string, Error>;
    function _getPromiseState(p: Promise<string>): PromiseState<string, Error> {
      state1 = getPromiseState<string, Error>(p);
      return state1;
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
    assert.equal(state1!, getPromiseState(_promise));
  });
});
