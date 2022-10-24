import { module, test } from 'qunit';

import { setupTest } from 'my-app/tests/helpers';

module('Unit | Transform | foo', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    let transform = this.owner.lookup('transform:foo');
    assert.ok(transform);
  });
});
