import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

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
