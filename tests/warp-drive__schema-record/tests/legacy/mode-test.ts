import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import { registerDerivations, withFields } from '@ember-data/model/migration-support';
import type Store from '@ember-data/store';
import { Editable, Legacy } from '@warp-drive/schema-record/record';
import { SchemaService } from '@warp-drive/schema-record/schema';

interface User {
  [Legacy]: boolean;
  [Editable]: boolean;
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
}

module('Legacy Mode', function (hooks) {
  setupRenderingTest(hooks);

  test('we can create a record in legacy mode', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Rey Pupatine', 'name is accessible');
    assert.true(record[Legacy], 'record is in legacy mode');
    assert.true(record[Editable], 'record is editable');

    try {
      record.$type;
      assert.ok(false, 'record.$type should throw');
    } catch (e) {
      assert.strictEqual((e as Error).message, 'No field named $type on user', 'record.$type throws');
    }
  });

  test('records not in legacy mode do not set their constructor modelName value to their type', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: false,
      fields: [
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ],
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.false(record[Legacy], 'record is in legacy mode');

    try {
      (record.constructor as { modelName?: string }).modelName;
      assert.ok(false, 'record.constructor.modelName should throw');
    } catch (e) {
      assert.strictEqual(
        (e as Error).message,
        'No field named constructor on user',
        'record.constructor.modelName throws'
      );
    }
  });

  test('records in legacy mode set their constructor modelName value to the correct type', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const schema = new SchemaService();
    store.registerSchema(schema);
    registerDerivations(schema);

    schema.defineSchema('user', {
      legacy: true,
      fields: withFields([
        {
          name: 'name',
          type: null,
          kind: 'attribute',
        },
      ]),
    });

    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    }) as User;

    assert.true(record[Legacy], 'record is in legacy mode');
    assert.strictEqual(
      (record.constructor as { modelName?: string }).modelName,
      'user',
      'record constructor modelName is correct'
    );
  });
});
