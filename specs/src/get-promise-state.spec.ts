import { getPromiseState } from '@warp-drive/core/reactive';
import { type Awaitable, createDeferred, setPromiseResult } from '@warp-drive/core/request';
import { spec, type SpecTest, type SuiteBuilder } from '@warp-drive/diagnostic/spec';

interface LocalTestContext {
  unused: null;
}

type PromiseState<T, E> = ReturnType<typeof getPromiseState<T, E>>;
const SecretSymbol = Symbol.for('LegacyPromiseProxy') as unknown as 'Symbol(<LegacyPromiseProxy>)';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
interface PromiseProxy<T, E> extends Promise<T> {}

function frameworkUsesSyncRender(framework: string) {
  return framework === 'ember';
}
class PromiseProxy<T, E> {
  promise: Awaitable<T, E>;

  constructor(promise: Awaitable<T, E>) {
    // @ts-expect-error - can't type symbol props with isolated declarations
    this[SecretSymbol] = true;
    this.promise = promise;
  }

  then<T1, T2>(
    onFulfilled?: ((value: T) => unknown) | null,
    onRejected?: ((error: E) => T2 | Promise<T2>) | null
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

export interface GetPromiseStateSpecSignature extends Record<string, SpecTest<LocalTestContext, object>> {
  'it renders each stage of a promise resolving in a new microtask queue': SpecTest<
    LocalTestContext,
    {
      defer: ReturnType<typeof createDeferred<string>>;
      _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
      countFor: (result: unknown) => number;
    }
  >;
  'it renders each stage of a promise resolving in the same microtask queue': SpecTest<
    LocalTestContext,
    {
      promise: Promise<string>;
      _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
      countFor: (result: unknown) => number;
    }
  >;
  'it renders only once when the promise already has a result cached': SpecTest<
    LocalTestContext,
    {
      promise: Promise<string>;
      _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
      countFor: (result: unknown) => number;
    }
  >;
  'it transitions to error state correctly': SpecTest<
    LocalTestContext,
    {
      promise: Promise<never>;
      _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
      countFor: (result: unknown, error: unknown) => number;
    }
  >;
  'it renders only once when the promise error state is already cached': SpecTest<
    LocalTestContext,
    {
      promise: Promise<never>;
      _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
      countFor: (result: unknown, error: unknown) => number;
    }
  >;
  'it unwraps promise-proxies that utilize the secret symbol for error states': SpecTest<
    LocalTestContext,
    {
      promise: PromiseProxy<never, Error>;
      _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
      countFor: (result: unknown, error: unknown) => number;
    }
  >;
  'it unwraps promise-proxies that utilize the secret symbol for success states': SpecTest<
    LocalTestContext,
    {
      promise: PromiseProxy<string, Error>;
      _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
      countFor: (result: unknown) => number;
    }
  >;
}

export const GetPromiseStateSpec: SuiteBuilder<LocalTestContext, GetPromiseStateSpecSignature> = spec<LocalTestContext>(
  'get-promise-state',
  function (hooks) {}
)
  .for('it renders each stage of a promise resolving in a new microtask queue')
  .use<{
    defer: ReturnType<typeof createDeferred<string>>;
    _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
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

    await this.render({
      defer,
      _getPromiseState,
      countFor,
    });
    assert.equal(state1!.result, null);
    assert.equal(counter, 1);
    assert.dom().hasText('Count:\n          1');
    defer.resolve('Our Data');
    await defer.promise;
    await this.h.rerender();
    assert.equal(state1!, getPromiseState(defer.promise));
    assert.equal(state1!.result, 'Our Data');
    assert.equal(counter, 2);
    assert.dom().hasText('Our DataCount:\n          2');
  })

  .for('it renders each stage of a promise resolving in the same microtask queue')
  .use<{
    promise: Promise<string>;
    _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
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

    await this.render({
      promise,
      _getPromiseState,
      countFor,
    });

    // frameworks which schedule as microtasks (like react) will rerender before
    // we have the chance to see the output.
    // while frameworks which flush render sync (like ember) enable capturing
    // the intermediate state of a single microtask tick.
    // as we we build out the tests for other frameworks we should adjust this
    // to a list to minimize the divergence in tests to be merely this timing
    // semantic.
    if (!frameworkUsesSyncRender(this.framework)) {
      assert.equal(state1!, getPromiseState(promise));
      assert.equal(state1!.result, 'Our Data');
      assert.equal(counter, 2);
      assert.dom().hasText('Our DataCount:\n          2');
      await this.h.rerender();
      assert.equal(state1!.result, 'Our Data');
      assert.equal(counter, 2);
      assert.dom().hasText('Our DataCount:\n          2');
    } else {
      assert.equal(state1!, getPromiseState(promise));
      assert.equal(state1!.result, null);
      assert.equal(counter, 1);
      assert.dom().hasText('Count:\n          1');
      await this.h.rerender();
      assert.equal(state1!.result, 'Our Data');
      assert.equal(counter, 2);
      assert.dom().hasText('Our DataCount:\n          2');
    }
  })

  .for('it renders only once when the promise already has a result cached')
  .use<{
    promise: Promise<string>;
    _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
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

    await this.render({
      promise,
      _getPromiseState,
      countFor,
    });

    assert.dom().hasText('Our DataCount:\n          1');
    await this.h.rerender();

    assert.dom().hasText('Our DataCount:\n          1');
  })

  .for('it transitions to error state correctly')
  .use<{
    promise: Promise<never>;
    _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
    countFor: (result: unknown, error: unknown) => number;
  }>(async function (assert) {
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

    await this.render({
      promise,
      _getPromiseState,
      countFor,
    });

    if (frameworkUsesSyncRender(this.framework)) {
      assert.equal(state1!, getPromiseState<never, Error>(promise));
      assert.equal(state1!.result, null);
      assert.equal(state1!.error, null);
      assert.equal(counter, 1);
      assert.dom().hasText('Pending\n          Count:\n          1');
      await this.h.rerender();
      assert.equal(state1!.result, null);
      assert.true(state1!.error instanceof Error);
      assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
      assert.equal(counter, 2);
      assert.dom().hasText('Our Error\n          Count:\n          2');
    } else {
      assert.equal(state1!, getPromiseState<never, Error>(promise));
      assert.equal(state1!.result, null);
      assert.true(state1!.error instanceof Error);
      assert.equal(counter, 2);
      assert.dom().hasText('Our Error\n          Count:\n          2');
      await this.h.rerender();
      assert.equal(state1!.result, null);
      assert.true(state1!.error instanceof Error);
      assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
      assert.equal(counter, 2);
      assert.dom().hasText('Our Error\n          Count:\n          2');
    }
  })

  .for('it renders only once when the promise error state is already cached')
  .use<{
    promise: Promise<never>;
    _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
    countFor: (result: unknown, error: unknown) => number;
  }>(async function (assert) {
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

    await this.render({
      promise,
      _getPromiseState,
      countFor,
    });

    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.dom().hasText('Our Error\n          Count:\n          1');
    await this.h.rerender();
    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.dom().hasText('Our Error\n          Count:\n          1');
  })

  .for('it unwraps promise-proxies that utilize the secret symbol for error states')
  .use<{
    promise: PromiseProxy<never, Error>;
    _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
    countFor: (result: unknown, error: unknown) => number;
  }>(async function (assert) {
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

    await this.render({
      promise,
      _getPromiseState,
      countFor,
    });

    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.dom().hasText('Our Error\n          Count:\n          1');
    await this.h.rerender();
    assert.equal(state1!.result, null);
    assert.true(state1!.error instanceof Error);
    assert.equal((state1!.error as Error | undefined)?.message, 'Our Error');
    assert.equal(counter, 1);
    assert.dom().hasText('Our Error\n          Count:\n          1');
    assert.equal(state1!, getPromiseState<never, Error>(_promise));
  })

  .for('it unwraps promise-proxies that utilize the secret symbol for success states')
  .use<{
    promise: PromiseProxy<string, Error>;
    _getPromiseState: (p: Promise<string>) => PromiseState<string, Error>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
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

    await this.render({
      promise,
      _getPromiseState,
      countFor,
    });

    assert.dom().hasText('Our DataCount:\n          1');
    await this.h.rerender();

    assert.dom().hasText('Our DataCount:\n          1');
    assert.equal(state1!, getPromiseState(_promise));
  })
  .build();
