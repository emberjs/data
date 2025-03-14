import { render } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest, setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations } from '@warp-drive/schema-record';

interface ChatRelay {
  id: string;
  $type: 'chat-relay';
  config: {
    instanceName: string;
    host: string;
  };
  activeUsers: Record<string, string>;
  name: string;
  [Type]: 'chat-relay';
}

module('ManagedObject | Iterable Behaviors', function (hooks) {
  setupTest(hooks);

  test('we can use `JSON.stringify` on a record without providing toJSON in the schema', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    try {
      const serialized = JSON.stringify(record);
      assert.true(true, 'JSON.stringify should not throw');

      const value = JSON.parse(serialized) as object;
      assert.deepEqual(
        value,
        {
          id: '1',
          $type: 'chat-relay',
          activeUsers: {
            acf4g1: 'Rey Pupatine',
          },
          config: {
            host: 'discord.com',
            instanceName: 'discord',
          },
          name: 'discord.com',
        },
        'stringify should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `JSON.stringify should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `{ ...record }` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    try {
      const value = { ...record } as object;
      assert.true(true, 'spread should not throw');
      assert.deepEqual(
        value,
        {
          id: '1',
          $type: 'chat-relay',
          // spread will preserve the original object references
          activeUsers: record['activeUsers'],
          config: record['config'],
          name: 'discord.com',
        },
        'spread should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `spread should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `for (let key in record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    try {
      const value = {} as Record<string, unknown>;

      for (const key in record) {
        value[key] = record[key as keyof ChatRelay];
      }

      assert.true(true, 'for...in should not throw');
      assert.deepEqual(
        value,
        {
          id: '1',
          $type: 'chat-relay',
          // for...in will preserve the original object references
          activeUsers: record['activeUsers'],
          config: record['config'],
          name: 'discord.com',
        },
        'for...in should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `for...in should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `for (const [key, value] of record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    try {
      const value = {} as Record<string, unknown>;

      // @ts-expect-error we dont type the iterator
      for (const [key, val] of record) {
        value[key as string] = val;
      }

      assert.true(true, 'for...of should not throw');
      assert.deepEqual(
        value,
        {
          id: '1',
          $type: 'chat-relay',
          // for...of will preserve the original object references
          activeUsers: record['activeUsers'],
          config: record['config'],
          name: 'discord.com',
        },
        'for...of should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `for...of should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Object.keys(record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    try {
      const keys = Object.keys(record);
      assert.true(true, 'Object.keys should not throw');
      assert.arrayStrictEquals(
        keys,
        ['id', '$type', 'config', 'activeUsers', 'name'],
        'Object.keys should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `Object.keys should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Object.value(record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    try {
      const values = Object.values(record);
      assert.true(true, 'Object.values should not throw');
      assert.arrayStrictEquals(
        values,
        ['1', 'chat-relay', record.config, record.activeUsers, 'discord.com'],
        'Object.values should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `Object.values should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Object.entries(record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    try {
      const entries = Object.entries(record);
      assert.true(true, 'Object.entries should not throw');
      assert.deepEqual(
        entries,
        [
          ['id', '1'],
          ['$type', 'chat-relay'],
          ['config', record.config],
          ['activeUsers', record.activeUsers],
          ['name', 'discord.com'],
        ],
        'Object.entries should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `Object.entries should not throw: ${(e as Error).message}`);
    }
  });
});

module('ManagedObject | Iterable Behaviors | Rendering', function (hooks) {
  setupRenderingTest(hooks);

  test('we can use `{{#each-in record as |key value|}}` in a template', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    const stringify = (value: unknown) => JSON.stringify(value);

    await render(
      <template>
        {{#each-in record as |key value|}}
          <div data-test-key={{key}}>{{stringify value}}</div>
        {{/each-in}}
      </template>
    );

    assert.dom('[data-test-key="id"]').hasText('"1"');
    assert.dom('[data-test-key="$type"]').hasText('"chat-relay"');
    assert.dom('[data-test-key="name"]').hasText('"discord.com"');
    assert.dom('[data-test-key="config"]').hasText('{"instanceName":"discord","host":"discord.com"}');
    assert.dom('[data-test-key="activeUsers"]').hasText('{"acf4g1":"Rey Pupatine"}');
  });

  test('we can use `{{#each record as |entry|}}` in a template', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'config',
      identity: null,
      fields: [
        { kind: 'field', name: 'instanceName' },
        { kind: 'field', name: 'host' },
      ],
    });

    schema.registerResource({
      type: 'chat-relay',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'config',
          kind: 'schema-object',
          type: 'config',
        },
        {
          name: 'activeUsers',
          kind: 'object',
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<ChatRelay & { [Symbol.iterator]: () => Iterator<[string, unknown]> }>({
      data: {
        type: 'chat-relay',
        id: '1',
        attributes: {
          name: 'discord.com',
          config: { instanceName: 'discord', host: 'discord.com' },
          activeUsers: { acf4g1: 'Rey Pupatine' },
        },
      },
    });

    interface get {
      (entry: [string, unknown], index: 0): string;
      (entry: [string, unknown], index: 1): unknown;
    }
    const get = ((entry: [string, unknown], index: 0 | 1) => entry[index]) as get;
    const stringify = (value: unknown) => JSON.stringify(value);

    await render(
      <template>
        {{#each record as |entry|}}
          <div data-test-key={{get entry 0}}>{{stringify (get entry 1)}}</div>
        {{/each}}
      </template>
    );

    assert.dom('[data-test-key="id"]').hasText('"1"');
    assert.dom('[data-test-key="$type"]').hasText('"chat-relay"');
    assert.dom('[data-test-key="name"]').hasText('"discord.com"');
    assert.dom('[data-test-key="config"]').hasText('{"instanceName":"discord","host":"discord.com"}');
    assert.dom('[data-test-key="activeUsers"]').hasText('{"acf4g1":"Rey Pupatine"}');
  });
});
