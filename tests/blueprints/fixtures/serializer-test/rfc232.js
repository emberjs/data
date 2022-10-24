import { module, test } from 'qunit';

import { setupTest } from 'my-app/tests/helpers';

module('Unit | Serializer | foo', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('foo');

    assert.ok(serializer);
  });

  test('it serializes records', function (assert) {
    let store = this.owner.lookup('service:store');
    let record = store.createRecord('foo', {});

    let serializedRecord = record.serialize();

    assert.ok(serializedRecord);
  });
});
