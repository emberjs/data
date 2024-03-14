import { render } from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';

import { module, test } from 'qunit';

import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';

import { getPromiseState, setupPromiseState } from '@warp-drive/ember';

module('Integration | get-promise-state', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    const promise = Promise.resolve().then(() => 'Our Data');
    class TestState {
      @tracked renders = 0;

      get currentRenderCount() {
        return ++this.renders;
      }
    }
    const testState = new TestState();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.set('promise', promise);
    this.set('testState', testState);
    this.set('getPromiseState', getPromiseState);

    await render(
      hbs`{{#let (this.getPromiseState this.promise) as |state|}}{{state.content}}<br>Count: {{this.testState.currentRenderCount}}{{/let}}`
    );

    assert.strictEqual(this.element.textContent.trim(), 'OurData\nCount: 2');
  });

  test('it can render efficiently', async function (assert) {
    const promise = Promise.resolve().then(() => 'Our Data');
    class TestState {
      @tracked renders = 0;

      get currentRenderCount() {
        return ++this.renders;
      }
    }
    setupPromiseState(promise);
    await promise;
    const testState = new TestState();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.set('promise', promise);
    this.set('testState', testState);
    this.set('getPromiseState', getPromiseState);

    await render(
      hbs`{{#let (this.getPromiseState this.promise) as |state|}}{{state.content}}<br>Count: {{this.testState.currentRenderCount}}{{/let}}`
    );

    assert.strictEqual(this.element.textContent.trim(), 'OurData\nCount: 1');
  });
});
