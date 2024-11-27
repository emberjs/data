import { setupTest } from '<%= modulePrefix %>/tests/helpers';
import { module, test } from 'qunit';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const adapter = this.owner.lookup('adapter:<%= dasherizedModuleName %>');
    assert.ok(adapter, 'adapter exists');
  });
});
