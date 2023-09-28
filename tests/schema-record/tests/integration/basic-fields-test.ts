import { SchemaService } from '@warp-drive/schema-record';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
}

module('Integration | basic fields', function (hooks) {
  setupTest(hooks);

  test('Simple Fields Work As Expected', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);

    schema.defineSchema('user', [
      {
        name: 'name',
        type: 'string',
        kind: 'attribute',
      },
    ]);

    const record = store.createRecord('user', { name: 'Rey Skybarker' }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');

    assert.strictEqual(record.name, 'Rey Skybarker', 'name is accessible');

    try {
      // @ts-expect-error intentionally accessing unknown field
      record.lastName;
      assert.ok(false, 'should error when accessing unknown field');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        'No field named lastName on user',
        'should error when accessing unknown field'
      );
    }
  });
});
