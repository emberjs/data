import { setupTest } from '<%= modulePrefix %>/tests/helpers';
import { module, test } from 'qunit';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('<%= dasherizedModuleName %>', {});
    assert.ok(model, 'model exists');
  });
});
