import { rerender, settled } from '@ember/test-helpers';

import { createDeferred, setPromiseResult, type Awaitable } from '@ember-data/request';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test } from '@warp-drive/diagnostic/ember';
import { getPromiseState } from '@warp-drive/ember';

type PromiseState<T, E> = ReturnType<typeof getPromiseState<T, E>>;
const SecretSymbol = Symbol.for('LegacyPromiseProxy');

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

  // test('it unwraps promise-proxies that utilize the secret symbol for error states', async function (this: RenderingTestContext, assert) {
  //   const _promise = Promise.resolve().then(() => {
  //     throw new Error('Our Error');
  //   });
  //   const promise = new PromiseProxy<never, Error>(_promise);

  //   try {
  //     getPromiseState(promise);
  //     await promise;
  //   } catch {
  //     // do nothing
  //   }

  //   let state: PromiseState<string, Error>;
  //   function _getPromiseState<T>(p: Promise<T>): PromiseState<T, Error> {
  //     state = getPromiseState(p) as PromiseState<string, Error>;
  //     return state as PromiseState<T, Error>;
  //   }
  //   let counter = 0;
  //   function countFor(_result: unknown, _error: unknown) {
  //     return ++counter;
  //   }

  //   await this.render(
  //     <template>
  //       {{#let (_getPromiseState promise) as |state|}}
  //         {{#if state.isPending}}
  //           Pending
  //         {{else if state.isError}}
  //           {{state.error.message}}
  //         {{else if state.isSuccess}}
  //           Invalid Success Reached
  //         {{/if}}
  //         <br />Count:
  //         {{countFor state.result state.error}}{{/let}}
  //     </template>
  //   );

  //   assert.equal(state!.result, null);
  //   assert.true(state!.error instanceof Error);
  //   assert.equal((state!.error as Error | undefined)?.message, 'Our Error');
  //   assert.equal(counter, 1);
  //   assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          1');
  //   await rerender();
  //   assert.equal(state!.result, null);
  //   assert.true(state!.error instanceof Error);
  //   assert.equal((state!.error as Error | undefined)?.message, 'Our Error');
  //   assert.equal(counter, 1);
  //   assert.equal(this.element.textContent?.trim(), 'Our Error\n          Count:\n          1');
  //   assert.equal(state, getPromiseState(_promise));
  // });

  test('it unwraps promise-proxies that utilize the secret symbol for success states', async function (this: RenderingTestContext, assert) {
    const _promise = Promise.resolve().then(() => 'Our Data');
    const promise = new PromiseProxy<string, Error>(_promise);
    getPromiseState(promise);
    await promise;

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
    assert.equal(state, getPromiseState(_promise));
  });
});
