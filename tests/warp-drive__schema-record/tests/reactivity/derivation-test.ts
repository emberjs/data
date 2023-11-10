import { rerender } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import { SchemaRecord } from '@warp-drive/schema-record/record';
import { FieldSchema, registerDerivations, SchemaService, withFields } from '@warp-drive/schema-record/schema';

import { reactiveContext } from '../-utils/reactive-context';

interface User {
  id: string | null;
  $type: 'user';
  firstName: string;
  lastName: string;
  readonly fullName: string;
}

module('Reactivity | derivation', function (hooks) {
  setupRenderingTest(hooks);

  test('we can derive from simple fields', async function (assert) {
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
          kind: 'attribute',
        },
        {
          name: 'lastName',
          type: null,
          kind: 'attribute',
        },
        {
          name: 'fullName',
          type: 'concat',
          options: { fields: ['firstName', 'lastName'], separator: ' ' },
          kind: 'derived',
        },
      ]),
    });

    const fieldsMap = schema.schemas.get('user')!.fields;
    const fields: FieldSchema[] = [...fieldsMap.values()];

    const record = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          firstName: 'Rey',
          lastName: 'Pupatine',
        },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.firstName, 'Rey', 'firstName is accessible');
    assert.strictEqual(record.lastName, 'Pupatine', 'lastName is accessible');
    assert.strictEqual(record.fullName, 'Rey Pupatine', 'fullName is accessible');

    const { counters, fieldOrder } = await reactiveContext.call(this, record, fields);
    const nameIndex = fieldOrder.indexOf('firstName');

    assert.strictEqual(counters.id, 1, 'id Count is 1');
    assert.strictEqual(counters.$type, 1, '$type Count is 1');
    assert.strictEqual(counters.firstName, 1, 'firstName Count is 1');
    assert.strictEqual(counters.lastName, 1, 'lastName Count is 1');
    assert.strictEqual(counters.fullName, 1, 'fullName Count is 1');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('firstName: Rey', 'firstName is rendered');
    assert.dom(`li:nth-child(${nameIndex + 3})`).hasText('lastName: Pupatine', 'lastName is rendered');
    assert.dom(`li:nth-child(${nameIndex + 5})`).hasText('fullName: Rey Pupatine', 'fullName is rendered');

    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          firstName: 'Rey',
          lastName: 'Skybarker',
        },
      },
    });

    assert.strictEqual(record.firstName, 'Rey', 'firstName is accessible');
    assert.strictEqual(record.lastName, 'Skybarker', 'lastName is accessible');
    assert.strictEqual(record.fullName, 'Rey Skybarker', 'fullName is accessible');

    await rerender();

    assert.strictEqual(counters.id, 1, 'id Count is 1');
    assert.strictEqual(counters.$type, 1, '$type Count is 1');
    assert.strictEqual(counters.firstName, 1, 'firstName Count is 2');
    assert.strictEqual(counters.lastName, 2, 'lastName Count is 2');
    assert.strictEqual(counters.fullName, 2, 'fullName Count is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('firstName: Rey', 'firstName is rendered');
    assert.dom(`li:nth-child(${nameIndex + 3})`).hasText('lastName: Skybarker', 'lastName is rendered');
    assert.dom(`li:nth-child(${nameIndex + 5})`).hasText('fullName: Rey Skybarker', 'fullName is rendered');
  });
});
