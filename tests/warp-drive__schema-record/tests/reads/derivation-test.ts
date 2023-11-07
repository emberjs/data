import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { SchemaRecord } from '@warp-drive/schema-record/record';
import { registerDerivations, SchemaService, withFields } from '@warp-drive/schema-record/schema';

interface User {
  id: string | null;
  $type: 'user';
  firstName: string;
  lastName: string;
  readonly fullName: string;
}

module('Reads | derivation', function (hooks) {
  setupTest(hooks);

  test('we can use simple fields with no `type`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);

    function concat(
      record: SchemaRecord & { [key: string]: unknown },
      options: Record<string, unknown> | null,
      _prop: string
    ): string {
      if (!options) throw new Error(`options is required`);
      const opts = options as { fields: string[]; separator?: string };
      return opts.fields.map((field) => record[field]).join(opts.separator ?? '');
    }

    schema.registerDerivation('concat', concat);
    registerDerivations(schema);

    schema.defineSchema('user', {
      fields: withFields([
        {
          name: 'firstName',
          type: null,
          kind: 'field',
        },
        {
          name: 'lastName',
          type: null,
          kind: 'field',
        },
        {
          name: 'fullName',
          type: 'concat',
          options: { fields: ['firstName', 'lastName'], separator: ' ' },
          kind: 'derived',
        },
      ]),
    });

    const record = store.createRecord('user', { firstName: 'Rey', lastName: 'Skybarker' }) as User;

    assert.strictEqual(record.id, null, 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');

    assert.strictEqual(record.firstName, 'Rey', 'firstName is accessible');
    assert.strictEqual(record.lastName, 'Skybarker', 'lastName is accessible');
    assert.strictEqual(record.fullName, 'Rey Skybarker', 'fullName is accessible');
  });
});
