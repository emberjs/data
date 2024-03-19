import { rerender, settled } from '@ember/test-helpers';

import { hbs } from 'ember-cli-htmlbars';

import { createDeferred, setPromiseResult } from '@ember-data/request';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test } from '@warp-drive/diagnostic/ember';
import type { PromiseState } from '@warp-drive/ember';
import { getPromiseState } from '@warp-drive/ember';

module('Integration | get-promise-state', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders each stage of a promise resolving in a new microtask queue', async function (this: RenderingTestContext, assert) {
    const defer = createDeferred();

    let state: PromiseState;

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.set('promise', defer.promise);
    this.set('getPromiseState', (p: Promise<unknown>) => {
      state = getPromiseState(p);
      return state;
    });
    let counter = 0;
    this.set('countFor', (result: unknown) => {
      return ++counter;
    });

    await this.render(
      hbs`{{#let (this.getPromiseState this.promise) as |state|}}{{state.result}}<br>Count: {{this.countFor state.result}}{{/let}}`
    );
    assert.equal(state!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Count: 1');
    defer.resolve('Our Data');
    await defer.promise;
    await rerender();
    assert.equal(state!, getPromiseState(defer.promise));
    assert.equal(state!.result, 'Our Data');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our DataCount: 2');
  });

  test('it renders each stage of a promise resolving in the same microtask queue', async function (this: RenderingTestContext, assert) {
    const promise = Promise.resolve().then(() => 'Our Data');

    let state: PromiseState;

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.set('promise', promise);
    this.set('getPromiseState', (p: Promise<unknown>) => {
      state = getPromiseState(p);
      return state;
    });
    let counter = 0;
    this.set('countFor', (result: unknown) => {
      return ++counter;
    });

    await this.render(
      hbs`{{#let (this.getPromiseState this.promise) as |state|}}{{state.result}}<br>Count: {{this.countFor state.result}}{{/let}}`
    );
    assert.equal(state!, getPromiseState(promise));
    assert.equal(state!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Count: 1');
    await rerender();
    assert.equal(state!.result, 'Our Data');
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Our DataCount: 2');
  });

  test('it renders only once when the promise already has a result cached', async function (this: RenderingTestContext, assert) {
    const promise = Promise.resolve().then(() => 'Our Data');

    const result = await promise;
    setPromiseResult(promise, { result, isError: false });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.set('promise', promise);
    this.set('getPromiseState', getPromiseState);
    let counter = 0;
    this.set('countFor', (_result: unknown) => {
      return ++counter;
    });

    await this.render(
      hbs`{{#let (this.getPromiseState this.promise) as |state|}}{{state.result}}<br>Count: {{this.countFor state.result}}{{/let}}`
    );

    assert.equal(this.element.textContent?.trim(), 'Our DataCount: 1');
    await settled();

    assert.equal(this.element.textContent?.trim(), 'Our DataCount: 1');
  });
});
