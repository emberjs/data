import { module, test } from 'qunit';

import { setupTest } from '<%= modulePrefix %>/tests/helpers';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    let transform = this.owner.lookup('transform:<%= dasherizedModuleName %>');
    assert.ok(transform);
  });
});
