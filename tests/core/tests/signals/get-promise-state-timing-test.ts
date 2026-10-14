import { getPromiseState } from '@warp-drive/core/reactive';
import { setPromiseResult } from '@warp-drive/core/request';
import { module, test } from '@warp-drive/diagnostic';
import type { Diagnostic } from '@warp-drive/diagnostic/-types';

/**
 * These tests read the state from JS, without rendering or `settled()`,
 * so they pin down exactly which microtask each property changes on.
 *
 * `value`, `reason`, `isPending`, `isSuccess`, and `isError` are set in the
 * same callback as `result`, `error`, `status`, and `isLoading`, so they are
 * not listed separately.
 */
const MAX_MICROTASKS = 10;

type PromiseState = ReturnType<typeof getPromiseState>;

function describeState(state: PromiseState) {
  const { status, isLoading, result, error } = state;
  const errorMessage = error instanceof Error ? error.message : String(error);

  return `status=${status} isLoading=${isLoading} result=${String(result)} error=${errorMessage}`;
}

/**
 * Steps the state each time it changes, labeled with the microtask it changed on.
 * "sync" is the state right after `getPromiseState` returns.
 * "macrotask" is the state after a setTimeout, and is only listed if it differs.
 */
async function stepTimeline(state: PromiseState, assert: Diagnostic) {
  let previous: string | undefined;

  const record = (label: string) => {
    const current = describeState(state);

    if (current !== previous) assert.step(`${label}: ${current}`);

    previous = current;
  };

  record('sync');

  for (let i = 1; i <= MAX_MICROTASKS; i++) {
    await Promise.resolve();
    record(`microtask ${i}`);
  }

  await new Promise((resolve) => setTimeout(resolve));
  record('macrotask');
}

module('Integration | signals | getPromiseState timing (without rendering)', function () {
  test('Promise.resolve', async function (assert) {
    const state = getPromiseState(Promise.resolve('hello'));

    await stepTimeline(state, assert);

    assert.verifySteps([
      'sync: status=pending isLoading=true result=null error=null',
      'microtask 1: status=fulfilled isLoading=false result=hello error=null',
    ]);
  });

  test('Promise.reject', async function (assert) {
    const state = getPromiseState(Promise.reject(new Error('hello')));

    await stepTimeline(state, assert);

    assert.verifySteps([
      'sync: status=pending isLoading=true result=null error=null',
      'microtask 1: status=rejected isLoading=false result=null error=hello',
    ]);
  });

  test('async function', async function (assert) {
    const run = async () => 'hello';
    const state = getPromiseState(run());

    await stepTimeline(state, assert);

    assert.verifySteps([
      'sync: status=pending isLoading=true result=null error=null',
      'microtask 1: status=fulfilled isLoading=false result=hello error=null',
    ]);
  });

  test('async function with an await', async function (assert) {
    const run = async () => {
      await Promise.resolve();

      return 'hello';
    };
    const state = getPromiseState(run());

    await stepTimeline(state, assert);

    assert.verifySteps([
      'sync: status=pending isLoading=true result=null error=null',
      'microtask 2: status=fulfilled isLoading=false result=hello error=null',
    ]);
  });

  test('async function that awaits, then throws', async function (assert) {
    const run = async () => {
      await Promise.resolve();
      throw new Error('hello');
    };
    const state = getPromiseState(run());

    await stepTimeline(state, assert);

    assert.verifySteps([
      'sync: status=pending isLoading=true result=null error=null',
      'microtask 2: status=rejected isLoading=false result=null error=hello',
    ]);
  });

  test('same promise, after it settled', async function (assert) {
    const promise = Promise.resolve('hello');

    getPromiseState(promise);
    await new Promise((resolve) => setTimeout(resolve));

    const state = getPromiseState(promise);

    await stepTimeline(state, assert);

    assert.verifySteps(['sync: status=fulfilled isLoading=false result=hello error=null']);
  });

  test('same promise, while pending', function (assert) {
    const promise = Promise.resolve('hello');

    assert.equal(getPromiseState(promise), getPromiseState(promise));
  });

  test('promise with a result already set via setPromiseResult', async function (assert) {
    const promise = Promise.resolve('hello');

    setPromiseResult(promise, { isError: false, result: 'hello' });

    const state = getPromiseState(promise);

    await stepTimeline(state, assert);

    assert.verifySteps(['sync: status=fulfilled isLoading=false result=hello error=null']);
  });

  test('promise with an error already set via setPromiseResult', async function (assert) {
    const promise = Promise.reject(new Error('hello'));

    void promise.catch(() => {});
    setPromiseResult(promise, { isError: true, result: new Error('hello') });

    const state = getPromiseState(promise);

    await stepTimeline(state, assert);

    assert.verifySteps(['sync: status=rejected isLoading=false result=null error=hello']);
  });
});
