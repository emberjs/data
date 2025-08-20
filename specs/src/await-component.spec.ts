import { type Awaitable, createDeferred, setPromiseResult } from '@warp-drive/core/request';
import { getPromiseState } from '@warp-drive/core/store/-private';
import { spec, type SpecTest, type SuiteBuilder } from '@warp-drive/diagnostic/spec';

// our tests use a rendering test context and add manager to it
interface LocalTestContext {
  nothing: null;
}

export interface AwaitSpecSignature extends Record<string, SpecTest<LocalTestContext, object>> {
  'it renders each stage of a promise': SpecTest<
    LocalTestContext,
    {
      promise: Awaitable<string, Error>;
      countFor: (result: unknown) => number;
    }
  >;
  'it renders only once when the promise already has a result cached': SpecTest<
    LocalTestContext,
    {
      promise: Awaitable<string, Error>;
      countFor: (result: unknown) => number;
    }
  >;
  'it transitions to error state correctly': SpecTest<
    LocalTestContext,
    {
      promise: Awaitable<string, Error>;
      countFor: (result: unknown) => number;
    }
  >;
  'it renders only once when the promise error state is already cached': SpecTest<
    LocalTestContext,
    {
      promise: Awaitable<string, Error>;
      countFor: (result: unknown) => number;
    }
  >;
}

export const AwaitSpec: SuiteBuilder<LocalTestContext, AwaitSpecSignature> = spec<LocalTestContext>(
  '<Await />',
  function (hooks) {}
)
  .for('it renders each stage of a promise')
  .use<{
    promise: Awaitable<string, Error>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
    const defer = createDeferred<string>();
    const state = getPromiseState(defer.promise);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render({
      promise: defer.promise,
      countFor,
    });

    assert.equal(state.result, null);
    assert.equal(counter, 1);
    assert.dom().hasText('Loading...Count: 1');

    defer.resolve('Our Data');
    await this.h.rerender();
    assert.equal(state.result, 'Our Data');
    assert.equal(counter, 2);
    assert.dom().hasText('Our DataCount: 2');
  })

  .for('it renders only once when the promise already has a result cached')
  .use<{
    promise: Awaitable<string, Error>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
    const promise: Awaitable<string, Error> = Promise.resolve().then(() => 'Our Data');

    const result1 = await promise;
    setPromiseResult(promise, { result: result1, isError: false });

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render({
      promise,
      countFor,
    });

    assert.dom().hasText('Our DataCount: 1');
    await this.h.rerender();

    assert.dom().hasText('Our DataCount: 1');
  })

  .for('it transitions to error state correctly')
  .use<{
    promise: Awaitable<string, Error>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
    const defer = createDeferred<string>();
    const state = getPromiseState<string, Error>(defer.promise);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render({
      promise: defer.promise,
      countFor,
    });

    assert.equal(state.result, null);
    assert.equal(state.error, null);
    assert.equal(counter, 1);
    assert.dom().hasText('Loading...Count: 1');
    defer.reject(new Error('Our Error'));
    await this.h.rerender();
    assert.equal(state.result, null);
    assert.true(state.error instanceof Error);
    assert.equal((state.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 2);
    assert.dom().hasText('Our ErrorCount: 2');
  })

  .for('it renders only once when the promise error state is already cached')
  .use<{
    promise: Awaitable<string, Error>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
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

    await this.render({
      promise,
      countFor,
    });

    assert.equal(state.result, null);
    assert.true(state.error instanceof Error);
    assert.equal((state.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.dom().hasText('Our ErrorCount: 1');
    await this.h.rerender();
    assert.equal(state.result, null);
    assert.true(state.error instanceof Error);
    assert.equal((state.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.dom().hasText('Our ErrorCount: 1');
  })
  .build();
