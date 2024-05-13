import { setupTest } from '<%= modulePrefix %>/tests/helpers';
import { module, test } from 'qunit';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const transform = this.owner.lookup('transform:<%= dasherizedModuleName %>');
    assert.ok(transform, 'transform exists');
  });
});
