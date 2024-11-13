import { setupTest } from 'dummy/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Transform | foo', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const transform = this.owner.lookup('transform:foo');
    assert.ok(transform, 'transform exists');
  });
});
