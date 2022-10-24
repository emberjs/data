import { module, test } from 'qunit';

import { setupTest } from 'my-app/tests/helpers';

module('Unit | Model | comment', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    let store = this.owner.lookup('service:store');
    let model = store.createRecord('comment', {});
    assert.ok(model);
  });
});
