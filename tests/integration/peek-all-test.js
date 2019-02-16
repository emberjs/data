import { get } from '@ember/object';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import { attr } from '@ember-decorators/data';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';

class Person extends Model {
  @attr
  name;
}

module('integration/peek-all - DS.Store#peekAll()', function(hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.register('model:person', Person);
    store = owner.lookup('service:store');
  });

  test("store.peekAll('person') should return all records and should update with new ones", async function(assert) {
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
    assert.equal(get(all, 'length'), 2);

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

    assert.equal(get(all, 'length'), 3);
  });

  test('Calling store.peekAll() multiple times should update immediately', async function(assert) {
    assert.expect(3);

    assert.equal(get(store.peekAll('person'), 'length'), 0, 'should initially be empty');
    store.createRecord('person', { name: 'Tomster' });
    assert.equal(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tomster's friend",
        },
      },
    });
    assert.equal(get(store.peekAll('person'), 'length'), 2, 'should contain two people');
  });

  test('Calling store.peekAll() after creating a record should return correct data', async function(assert) {
    assert.expect(1);

    store.createRecord('person', { name: 'Tomster' });
    assert.equal(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
  });
});
