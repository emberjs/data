import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { resolve } from 'rsvp';
import { setupTest } from 'ember-qunit';
import { settled } from '@ember/test-helpers';
import Model from 'ember-data/model';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';
import { module, test } from 'qunit';
import Adapter from 'ember-data/adapter';

class Person extends Model {
  @attr
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

module('unit/record-array - RecordArray', function(hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.register('model:tag', Tag);
    owner.register('model:tool', Tool);

    store = owner.lookup('service:store');
  });

  test('a record array is backed by records', async function(assert) {
    assert.expect(3);
    this.owner.register(
      'adapter:application',
      Adapter.extend({
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
      ],
    });

    let records = await store.findByIds('person', [1, 2, 3]);
    let expectedResults = {
      data: [
        { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
        { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } },
        { id: '3', type: 'person', attributes: { name: 'Scumbag Bryn' } },
      ],
    };

    for (let i = 0, l = expectedResults.data.length; i < l; i++) {
      let {
        id,
        attributes: { name },
      } = expectedResults.data[i];

      assert.deepEqual(
        records[i].getProperties('id', 'name'),
        { id, name },
        'a record array materializes objects on demand'
      );
    }
  });

  test('acts as a live query', async function(assert) {
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

    assert.equal(get(recordArray, 'lastObject.name'), 'wycats');

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

    assert.equal(get(recordArray, 'lastObject.name'), 'brohuda');
  });

  test('acts as a live query (normalized names)', async function(assert) {
    this.owner.register('model:Person', Person);

    let recordArray = store.peekAll('Person');
    let otherRecordArray = store.peekAll('person');

    assert.ok(recordArray === otherRecordArray, 'Person and person are the same record-array');

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

    assert.deepEqual(recordArray.mapBy('name'), ['John Churchill']);

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

    assert.deepEqual(recordArray.mapBy('name'), ['John Churchill', 'Winston Churchill']);
  });

  test('stops updating when destroyed', async function(assert) {
    assert.expect(3);

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

    // Ember 2.18 requires wrapping destroy in a run. Once we drop support with 3.8 LTS
    //  we can remove this.
    run(() => recordArray.destroy());

    await settled();

    assert.equal(recordArray.get('length'), 0, 'Has no more records');
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

    assert.equal(recordArray.get('length'), 0, 'Has not been updated');
    assert.equal(recordArray.get('content'), undefined, 'Has not been updated');
  });

  test('a loaded record is removed from a record array when it is deleted', async function(assert) {
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

    let scumbag = await store.findRecord('person', 1);
    let tag = await store.findRecord('tag', 1);
    let recordArray = tag.get('people');

    recordArray.addObject(scumbag);

    assert.ok(scumbag.get('tag') === tag, "precond - the scumbag's tag has been set");
    assert.equal(get(recordArray, 'length'), 1, 'precond - record array has one item');
    assert.equal(
      get(recordArray.objectAt(0), 'name'),
      'Scumbag Dale',
      'item at index 0 is record with id 1'
    );

    scumbag.deleteRecord();

    assert.equal(
      get(recordArray, 'length'),
      1,
      'record is still in the record array until it is saved'
    );

    await scumbag.save();

    assert.equal(
      get(recordArray, 'length'),
      0,
      'record is removed from the array when it is saved'
    );
  });

  test("a loaded record is not removed from a record array when it is deleted even if the belongsTo side isn't defined", async function(assert) {
    class Person extends Model {
      @attr
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

    assert.equal(tag.get('people.length'), 1, 'record is not removed from the record array');
    assert.equal(tag.get('people').objectAt(0), scumbag, 'tag still has the scumbag');
  });

  test("a loaded record is not removed from both the record array and from the belongs to, even if the belongsTo side isn't defined", async function(assert) {
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

    assert.equal(tag.get('people.length'), 1, 'record is in the record array');
    assert.equal(tool.get('person'), scumbag, 'the tool belongs to the record');

    scumbag.deleteRecord();

    assert.equal(tag.get('people.length'), 1, 'record is stil in the record array');
    assert.equal(tool.get('person'), scumbag, 'the tool still belongs to the record');
  });

  // GitHub Issue #168
  test('a newly created record is removed from a record array when it is deleted', async function(assert) {
    let recordArray = store.peekAll('person');
    let scumbag = store.createRecord('person', {
      name: 'Scumbag Dale',
    });

    assert.equal(
      get(recordArray, 'length'),
      1,
      'precond - record array already has the first created item'
    );

    store.createRecord('person', { name: 'p1' });
    store.createRecord('person', { name: 'p2' });
    store.createRecord('person', { name: 'p3' });

    assert.equal(get(recordArray, 'length'), 4, 'precond - record array has the created item');
    assert.equal(recordArray.objectAt(0), scumbag, 'item at index 0 is record with id 1');

    scumbag.deleteRecord();
    assert.equal(get(recordArray, 'length'), 4, 'record array still has the created item');

    await settled();

    assert.equal(get(recordArray, 'length'), 3, 'record array no longer has the created item');
  });

  test("a record array returns undefined when asking for a member outside of its content Array's range", async function(assert) {
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

    assert.strictEqual(
      recordArray.objectAt(20),
      undefined,
      'objects outside of the range just return undefined'
    );
  });

  // This tests for a bug in the recordCache, where the records were being cached in the incorrect order.
  test('a record array should be able to be enumerated in any order', async function(assert) {
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

    assert.equal(
      get(recordArray.objectAt(2), 'id'),
      '3',
      'should retrieve correct record at index 2'
    );
    assert.equal(
      get(recordArray.objectAt(1), 'id'),
      '2',
      'should retrieve correct record at index 1'
    );
    assert.equal(
      get(recordArray.objectAt(0), 'id'),
      '1',
      'should retrieve correct record at index 0'
    );
  });

  test("an AdapterPopulatedRecordArray knows if it's loaded or not", async function(assert) {
    assert.expect(1);
    let adapter = store.adapterFor('person');

    adapter.query = function(store, type, query, recordArray) {
      return resolve({
        data: [
          { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
          { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } },
          { id: '3', type: 'person', attributes: { name: 'Scumbag Bryn' } },
        ],
      });
    };

    let people = await store.query('person', { page: 1 });

    assert.equal(get(people, 'isLoaded'), true, 'The array is now loaded');
  });
});
