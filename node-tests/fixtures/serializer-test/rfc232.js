import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';

module('serializer:foo', 'Unit | Serializer | foo', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let store = this.owner.lookup('service:store');
    let serializer = this.owner.factoryFor('serializer:foo').create({ store });

    assert.ok(serializer);
  });

  test('it serializes records', function(assert) {
    let store = this.owner.lookup('service:store');
    let record = run(() => store.createRecord('foo', {}));

    let serializedRecord = record.serialize();

    assert.ok(serializedRecord);
  });
});
