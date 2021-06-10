import Service from '@ember/service';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';

module('integration/injection factoryFor enabled', function (hooks) {
  setupTest(hooks);
  let store;
  let Model;

  hooks.beforeEach(function () {
    let { owner } = this;
    Model = {
      isModel: true,
    };
    owner.register('model:super-villain', Model);
    store = owner.lookup('service:store');
  });

  test('modelFactoryFor', function (assert) {
    let { owner } = this;
    const trueFactory = owner.factoryFor('model:super-villain');
    const modelFactory = store._modelFactoryFor('super-villain');

    assert.strictEqual(modelFactory, trueFactory, 'expected the factory itself to be returned');
  });

  test('modelFor', function (assert) {
    const modelClass = store.modelFor('super-villain');

    assert.strictEqual(modelClass, Model, 'expected the factory itself to be returned');

    assert.equal(modelClass.modelName, 'super-villain', 'expected the factory itself to be returned');
  });
});

module('integration/injection eager injections', function (hooks) {
  setupTest(hooks);
  let store;
  let Apple = Service.extend();

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:foo', Model.extend());
    owner.register('service:apple', Apple);
    owner.inject('model:foo', 'apple', 'service:apple');

    store = this.owner.lookup('service:store');
  });

  test('did inject', async function (assert) {
    // TODO likely this test should instead test that we can use service injections
    // on models (e.g. that owner is properly setup for it).
    assert.expectDeprecation(
      () => {
        let foo = store.createRecord('foo');
        let apple = foo.get('apple');
        let appleService = this.owner.lookup('service:apple');

        assert.ok(apple, `'model:foo' instance should have an 'apple' property`);
        assert.ok(apple === appleService, `'model:foo.apple' should be the apple service`);
        assert.ok(apple instanceof Apple, `'model:foo'.apple should be an instance of 'service:apple'`);
      },
      { id: 'implicit-injections', count: 1 }
    );
  });
});
