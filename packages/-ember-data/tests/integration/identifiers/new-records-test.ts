import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import Store, { recordIdentifierFor } from '@ember-data/store';

module('Integration | Identifiers - creating new records', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register(`service:store`, Store);

    class User extends Model {
      @attr() name;
    }

    owner.register('model:user', User);
    store = owner.lookup('service:store');
  });

  test(`We can peek before create`, async function (assert) {
    let record = store.peekRecord('user', '1');
    assert.strictEqual(record, null, 'peekRecord returns null');

    try {
      record = store.createRecord('user', { name: 'Chris', id: '1' });
      assert.strictEqual(record.name, 'Chris', 'We created a record');

      const identifier = recordIdentifierFor(record);

      assert.strictEqual(identifier.type, 'user', 'We have an identifier with the right type');
      assert.strictEqual(identifier.id, '1', 'We have an identifier with an id');
      assert.ok(typeof identifier.lid === 'string' && identifier.lid.length > 0, 'We have an identifier with an lid');
    } catch (e) {
      assert.ok(false, `Did not expect error: ${(e as Error).message}`);
    }
  });
});
