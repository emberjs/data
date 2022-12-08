import { run } from '@ember/runloop';

import { module } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';
import Store from '@ember-data/store';
import test from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/store/asserts - DS.Store methods produce useful assertion messages', function (hooks) {
  setupTest(hooks);
  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('model:foo', Model.extend());
    owner.register('service:store', Store);
  });

  const MODEL_NAME_METHODS = [
    'createRecord',
    'findRecord',
    'peekRecord',
    'query',
    'queryRecord',
    'findAll',
    'peekAll',
    'modelFor',
    'normalize',
    'adapterFor',
    'serializerFor',
  ];

  test('Calling Store methods with no modelName asserts', function (assert) {
    assert.expect(MODEL_NAME_METHODS.length);

    let store = this.owner.lookup('service:store');

    MODEL_NAME_METHODS.forEach((methodName) => {
      let assertion = `You need to pass a model name to the store's ${methodName} method`;
      if (methodName === 'findRecord') {
        assertion = `You need to pass a modelName or resource identifier as the first argument to the store's ${methodName} method`;
      }

      assert.expectAssertion(() => {
        store[methodName](null);
      }, assertion);
    });
  });

  const STORE_ENTRY_METHODS = [
    'createRecord',
    'deleteRecord',
    'unloadRecord',
    'find',
    'findRecord',
    'getReference',
    'peekRecord',
    'query',
    'queryRecord',
    'findAll',
    'peekAll',
    'unloadAll',
    'modelFor',
    'push',
    '_push',
    'pushPayload',
    'normalize',
    'adapterFor',
    'serializerFor',
  ];

  test('Calling Store methods after the store has been destroyed asserts', function (assert) {
    const store = new Store();
    store.shouldAssertMethodCallsOnDestroyedStore = true;
    assert.expect(STORE_ENTRY_METHODS.length);
    run(() => store.destroy());

    STORE_ENTRY_METHODS.forEach((methodName) => {
      assert.expectAssertion(() => {
        store[methodName]();
      }, `Attempted to call store.${methodName}(), but the store instance has already been destroyed.`);
    });
  });
});
