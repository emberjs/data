import { module, test } from 'qunit';

import { setupTest } from 'my-app/tests/helpers';

module('Unit | Adapter | foo', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    let adapter = this.owner.lookup('adapter:foo');
    assert.ok(adapter);
  });
});
