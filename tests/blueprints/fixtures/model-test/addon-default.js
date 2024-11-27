import { setupTest } from 'dummy/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | foo', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('foo', {});
    assert.ok(model, 'model exists');
  });
});
