import { setupTest } from 'my-app/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | comment', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('comment', {});
    assert.ok(model, 'model exists');
  });
});
