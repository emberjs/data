import { get } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

class Person extends Model {
  @attr()
  name;
  @belongsTo('tag', { async: false, inverse: 'people' })
  tag;
}

class Tag extends Model {
  @hasMany('person', { async: false, inverse: 'tag' })
  people;
}

class Tool extends Model {
  @belongsTo('person', { async: false, inverse: null })
  person;
}

module('unit/record-array - RecordArray', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.register('model:tag', Tag);
    owner.register('model:tool', Tool);
    owner.register('adapter:application', JSONAPIAdapter.extend());
    owner.register('serializer:application', class extends JSONAPISerializer {});

    store = owner.lookup('service:store');
  });

  test('acts as a live query', async function (assert) {
    let recordArray = store.peekAll('person');

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'wycats',
        },
      },
    });

    await settled();

    assert.strictEqual(recordArray.at(-1).name, 'wycats');

    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'brohuda',
        },
      },
    });

    await settled();

    assert.strictEqual(recordArray.at(-1).name, 'brohuda');
  });

  test('acts as a live query (normalized names)', async function (assert) {
    this.owner.register('model:Person', Person);

    let recordArray = store.peekAll('Person');
    let otherRecordArray = store.peekAll('person');

    assert.strictEqual(recordArray, otherRecordArray, 'Person and person are the same record-array');

    store.push({
      data: {
        type: 'Person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
      },
    });

    await settled();

    assert.deepEqual(
      recordArray.map((v) => v.name),
      ['John Churchill']
    );

    store.push({
      data: {
        type: 'Person',
        id: '2',
        attributes: {
          name: 'Winston Churchill',
        },
      },
    });

    await settled();

    assert.deepEqual(
      recordArray.map((v) => v.name),
      ['John Churchill', 'Winston Churchill']
    );
  });

  test('a loaded record is removed from a record array when it is deleted', async function (assert) {
    assert.expect(5);
    this.owner.register(
      'adapter:application',
      Adapter.extend({
        deleteRecord() {
          return resolve({ data: null });
        },
        shouldBackgroundReloadRecord() {
          return false;
        },
      })
    );

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
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
        {
          type: 'tag',
          id: '1',
          attributes: {},
        },
      ],
    });

    let scumbag = await store.findRecord('person', '1');
    let tag = await store.findRecord('tag', '1');
    let recordArray = tag.people;

    recordArray.push(scumbag);

    assert.strictEqual(scumbag.tag, tag, "precond - the scumbag's tag has been set");
    assert.strictEqual(recordArray.length, 1, 'precond - record array has one item');
    assert.strictEqual(recordArray.at(0)?.name, 'Scumbag Dale', 'item at index 0 is record with id 1');

    scumbag.deleteRecord();

    assert.strictEqual(recordArray.length, 1, 'record is still in the record array until it is saved');

    await scumbag.save();

    assert.strictEqual(recordArray.length, 0, 'record is removed from the array when it is saved');
  });

  test('destroying a record that is in a live record array only removes itself', async function (assert) {
    class Person extends Model {
      @attr name;
    }
    const { owner } = this;
    owner.register('model:person', Person);
    owner.register(
      'adapter:application',
      class extends JSONAPIAdapter {
        deleteRecord() {
          return new Promise((resolve) => {
            setTimeout(resolve, 1);
          }).then(() => {
            return { data: null };
          });
        }
      }
    );
    const store = owner.lookup('service:store');
    const recordArray = store.peekAll('person');

    assert.strictEqual(recordArray.length, 0, 'initial length 0');

    // eslint-disable-next-line no-unused-vars
    const [_one, _two, three] = store.push({
      data: [
        { type: 'person', id: '1', attributes: { name: 'Chris' } },
        { type: 'person', id: '2', attributes: { name: 'Ross' } },
        { type: 'person', id: '3', attributes: { name: 'Cajun' } },
      ],
    });

    assert.strictEqual(recordArray.length, 3, 'populated length 3');

    three.deleteRecord();
    assert.strictEqual(recordArray.length, 3, 'populated length 3');
    await three.save();
    assert.strictEqual(recordArray.length, 2, 'after save persisted length 2');
    three.unloadRecord();
    await settled();

    assert.strictEqual(recordArray.length, 2, 'updated length 2');
  });

  test("a loaded record is not removed from a relationship ManyArray when it is deleted even if the belongsTo side isn't defined", async function (assert) {
    class Person extends Model {
      @attr()
      name;
    }

    class Tag extends Model {
      @hasMany('person', { async: false, inverse: null })
      people;
    }

    this.owner.unregister('model:person');
    this.owner.unregister('model:tag');
    this.owner.register('model:person', Person);
    this.owner.register('model:tag', Tag);
    this.owner.register(
      'adapter:application',
      Adapter.extend({
        deleteRecord() {
          return resolve({ data: null });
        },
      })
    );

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Tom',
          },
        },
        {
          type: 'tag',
          id: '1',
          relationships: {
            people: {
              data: [{ type: 'person', id: '1' }],
            },
          },
        },
      ],
    });

    let scumbag = store.peekRecord('person', 1);
    let tag = store.peekRecord('tag', 1);

    scumbag.deleteRecord();

    assert.strictEqual(tag.people.length, 1, 'record is not removed from the ManyArray');
    assert.strictEqual(tag.people.at(0), scumbag, 'tag still has the scumbag');
  });

  test("a loaded record is not removed from both the record array and from the belongs to, even if the belongsTo side isn't defined", async function (assert) {
    this.owner.register(
      'adapter:application',
      Adapter.extend({
        deleteRecord() {
          return resolve({ data: null });
        },
      })
    );

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Tom',
          },
        },
        {
          type: 'tag',
          id: '1',
          relationships: {
            people: {
              data: [{ type: 'person', id: '1' }],
            },
          },
        },
        {
          type: 'tool',
          id: '1',
          relationships: {
            person: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      ],
    });

    let scumbag = store.peekRecord('person', 1);
    let tag = store.peekRecord('tag', 1);
    let tool = store.peekRecord('tool', 1);

    assert.strictEqual(tag.people.length, 1, 'record is in the record array');
    assert.strictEqual(tool.person, scumbag, 'the tool belongs to the record');

    scumbag.deleteRecord();

    assert.strictEqual(tag.people.length, 1, 'record is stil in the record array');
    assert.strictEqual(tool.person, scumbag, 'the tool still belongs to the record');
  });

  // GitHub Issue #168
  test('a newly created record is removed from a record array when it is deleted', async function (assert) {
    let recordArray = store.peekAll('person');
    let scumbag = store.createRecord('person', {
      name: 'Scumbag Dale',
    });

    await settled();
    assert.strictEqual(get(recordArray, 'length'), 1, 'precond - record array already has the first created item');

    store.createRecord('person', { name: 'p1' });
    store.createRecord('person', { name: 'p2' });
    store.createRecord('person', { name: 'p3' });

    await settled();

    assert.strictEqual(recordArray.length, 4, 'precond - record array has the created item');
    assert.strictEqual(recordArray.at(0), scumbag, 'item at index 0 is record with id 1');

    scumbag.deleteRecord();

    assert.strictEqual(recordArray.length, 3, 'record array no longer has the created item');
  });

  test("a record array returns undefined when asking for a member outside of its content Array's range", async function (assert) {
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
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
    });

    let recordArray = store.peekAll('person');

    assert.strictEqual(recordArray.at(20), undefined, 'objects outside of the range just return undefined');
  });

  // This tests for a bug in the recordCache, where the records were being cached in the incorrect order.
  test('a record array should be able to be enumerated in any order', async function (assert) {
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
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
    });

    let recordArray = store.peekAll('person');

    assert.strictEqual(recordArray.at(2).id, '3', 'should retrieve correct record at index 2');
    assert.strictEqual(recordArray.at(1).id, '2', 'should retrieve correct record at index 1');
    assert.strictEqual(recordArray.at(0).id, '1', 'should retrieve correct record at index 0');
  });

  test("an AdapterPopulatedRecordArray knows if it's loaded or not", async function (assert) {
    assert.expect(2);
    let adapter = store.adapterFor('person');

    adapter.query = function (store, type, query, recordArray) {
      assert.false(recordArray.isLoaded, 'not loaded yet');
      return resolve({
        data: [
          { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
          { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } },
          { id: '3', type: 'person', attributes: { name: 'Scumbag Bryn' } },
        ],
      });
    };

    let people = await store.query('person', { page: 1 });

    assert.true(people.isLoaded, 'The array is now loaded');
  });
});
