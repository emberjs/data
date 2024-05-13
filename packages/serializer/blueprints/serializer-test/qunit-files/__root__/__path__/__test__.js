import { setupTest } from '<%= modulePrefix %>/tests/helpers';
import { module, test } from 'qunit';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const serializer = store.serializerFor('<%= dasherizedModuleName %>');

    assert.ok(serializer, 'serializer exists');
  });

  test('it serializes records', function (assert) {
    const store = this.owner.lookup('service:store');
    const record = store.createRecord('<%= dasherizedModuleName %>', {});

    const serializedRecord = record.serialize();

    assert.ok(serializedRecord, 'it serializes records');
  });
});
