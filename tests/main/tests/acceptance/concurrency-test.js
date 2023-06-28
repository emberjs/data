import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

module('Acceptance | concurrency', function (hooks) {
  setupTest(hooks);

  test('multiple store instances do not share identifier', async function (assert) {
    this.owner.register('service:store2', Store);
    this.owner.register(
      'model:user',
      class extends Model {
        @attr name;
      }
    );
    const store1 = this.owner.lookup('service:store');
    const store2 = this.owner.lookup('service:store2');

    assert.notStrictEqual(store1, store2, 'different stores are not the same instance');

    const record1 = store1.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris',
        },
      },
    });
    const record2 = store2.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.notStrictEqual(record1, record2, 'different records are not the same instance');
    assert.notStrictEqual(
      recordIdentifierFor(record1),
      recordIdentifierFor(record2),
      'different records have different identifiers'
    );
  });

  test("multiple store instances do not notify each other's record arrays", async function (assert) {
    this.owner.register('service:store2', Store);
    this.owner.register(
      'model:user',
      class extends Model {
        @attr name;
      }
    );
    const store1 = this.owner.lookup('service:store');
    const store2 = this.owner.lookup('service:store2');

    assert.notStrictEqual(store1, store2, 'different stores are not the same instance');

    const record1 = store1.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris',
        },
      },
    });
    const record2 = store2.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.notStrictEqual(record1, record2, 'different records are not the same instance');
    assert.notStrictEqual(
      recordIdentifierFor(record1),
      recordIdentifierFor(record2),
      'different records have different identifiers'
    );
    assert.strictEqual(store1.peekAll('user').length, 1, 'store1 has one record');
    assert.strictEqual(store2.peekAll('user').length, 1, 'store2 has one record');
  });

  test("multiple store instances do not clear each other's record arrays when torn down", async function (assert) {
    this.owner.register('service:store2', Store);
    this.owner.register(
      'model:user',
      class extends Model {
        @attr name;
      }
    );
    const store1 = this.owner.lookup('service:store');
    const store2 = this.owner.lookup('service:store2');

    assert.notStrictEqual(store1, store2, 'different stores are not the same instance');

    const record1 = store1.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris',
        },
      },
    });
    const record2 = store2.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.notStrictEqual(record1, record2, 'different records are not the same instance');
    assert.notStrictEqual(
      recordIdentifierFor(record1),
      recordIdentifierFor(record2),
      'different records have different identifiers'
    );
    const arr1 = store1.peekAll('user');
    assert.strictEqual(arr1.length, 1, 'store1 has one record');
    assert.strictEqual(store2.peekAll('user').length, 1, 'store2 has one record');

    // queue a change to store1
    store1.push({
      data: {
        id: '2',
        type: 'user',
        attributes: {
          name: 'James',
        },
      },
    });

    store2.destroy();
    await settled();

    assert.strictEqual(arr1.length, 2, 'store1 has two records');
    assert.strictEqual(arr1, store1.peekAll('user'), 'store1 record array is the same instance');
  });

  test("destroying a store instance does not result in removing another store's identifier", async function (assert) {
    this.owner.register('service:store2', Store);
    this.owner.register(
      'model:user',
      class extends Model {
        @attr name;
      }
    );
    const store1 = this.owner.lookup('service:store');
    const store2 = this.owner.lookup('service:store2');

    assert.notStrictEqual(store1, store2, 'different stores are not the same instance');

    const record1 = store1.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris',
        },
      },
    });
    store2.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris',
        },
      },
    });

    store2.destroy();
    await settled();

    const record1Again = store1.peekRecord('user', '1');
    assert.strictEqual(record1, record1Again, 'record is still in store1');
  });
});
