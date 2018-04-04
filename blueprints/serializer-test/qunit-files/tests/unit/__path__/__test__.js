import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

moduleForModel('<%= dasherizedModuleName %>', '<%= friendlyTestDescription %>', {
  // Specify the other units that are required for this test.
  needs: ['serializer:<%= dasherizedModuleName %>']
});

  test('it serializes records', function(assert) {
    let store = this.owner.lookup('service:store');
    let record = store.createRecord('<%= dasherizedModuleName %>', {});

  let serializedRecord = record.serialize();

  assert.ok(serializedRecord);
});
