import { get } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

class Person extends Model {
  @attr()
  name;
}

module('integration/peek-all - DS.Store#peekAll()', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    store = owner.lookup('service:store');
  });

  test("store.peekAll('person') should return all records and should update with new ones", async function (assert) {
    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
      ],
    });

    let all = store.peekAll('person');
    assert.strictEqual(get(all, 'length'), 2);

    store.push({
      data: [
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
    });

    await settled();

    assert.strictEqual(get(all, 'length'), 3);
  });

  test('Calling store.peekAll() multiple times should update immediately', async function (assert) {
    assert.expect(3);

    assert.strictEqual(get(store.peekAll('person'), 'length'), 0, 'should initially be empty');
    store.createRecord('person', { name: 'Tomster' });
    assert.strictEqual(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tomster's friend",
        },
      },
    });
    const array = store.peekAll('person');
    assert.strictEqual(get(array, 'length'), 2, 'should contain two people');
  });

  test('Calling store.peekAll() after creating a record should return correct data', async function (assert) {
    assert.expect(1);

    store.createRecord('person', { name: 'Tomster' });
    assert.strictEqual(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
  });

  test('Newly created records properly cleanup peekAll state when calling destroyRecord (first peek post create)', async function (assert) {
    this.owner.register(
      'model:company',
      class extends Model {
        @attr name;
      }
    );
    const store = this.owner.lookup('service:store');

    const company1 = store.createRecord('company', { id: 'c1', name: 'IPC' });
    await company1.destroyRecord();

    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');

    const company2 = store.createRecord('company', { id: 'c1', name: 'IPC' });

    assert.strictEqual(store.peekAll('company').length, 1, 'one company loaded');

    await company2.destroyRecord();
    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');

    const company3 = store.createRecord('company', { id: 'c1', name: 'IPC' });
    await company3.destroyRecord();

    const peeked = store.peekAll('company');
    assert.strictEqual(peeked.length, 0, 'no company loaded');
  });

  test('Newly created records properly cleanup peekAll state when calling destroyRecord (first peek prior to create)', async function (assert) {
    this.owner.register(
      'model:company',
      class extends Model {
        @attr name;
      }
    );
    const store = this.owner.lookup('service:store');

    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');

    const company1 = store.createRecord('company', { id: 'c1', name: 'IPC' });
    await company1.destroyRecord();

    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');

    const company2 = store.createRecord('company', { id: 'c1', name: 'IPC' });

    assert.strictEqual(store.peekAll('company').length, 1, 'one company loaded');

    await company2.destroyRecord();

    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');

    const company3 = store.createRecord('company', { id: 'c1', name: 'IPC' });
    await company3.destroyRecord();

    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');
  });

  test('Newly created records properly cleanup peekAll state when calling destroyRecord (always peek prior to destroy)', async function (assert) {
    this.owner.register(
      'model:company',
      class extends Model {
        @attr name;
      }
    );
    const store = this.owner.lookup('service:store');

    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');

    const company1 = store.createRecord('company', { id: 'c1', name: 'IPC' });
    assert.strictEqual(store.peekAll('company').length, 1, 'one company loaded');
    await company1.destroyRecord();
    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');

    const company2 = store.createRecord('company', { id: 'c1', name: 'IPC' });
    assert.strictEqual(store.peekAll('company').length, 1, 'one company loaded');
    await company2.destroyRecord();
    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');

    const company3 = store.createRecord('company', { id: 'c1', name: 'IPC' });
    assert.strictEqual(store.peekAll('company').length, 1, 'one company loaded');
    await company3.destroyRecord();
    assert.strictEqual(store.peekAll('company').length, 0, 'no company loaded');
  });
});
