import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { Promise, hash } from 'rsvp';
import { createStore } from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let results;

const Person = DS.Model.extend({
  name: DS.attr('string'),
  tag: DS.belongsTo('tag', { async: false })
});

const Tag = DS.Model.extend({
  people: DS.hasMany('person', { async: false })
});

const Tool = DS.Model.extend({
  person: DS.belongsTo('person', { async: false })
});

module('unit/record_array - DS.RecordArray', {
  beforeEach() {
    results = {
      data: [
        { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
        { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } },
        { id: '3', type: 'person', attributes: { name: 'Scumbag Bryn' } }
      ]
    };
  }
});

test('a record array is backed by records', function(assert) {
  assert.expect(3);

  let store = createStore({
    person: Person,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord() {
        return false;
      }
    })
  });

  run(() => {
    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale'
          }
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz'
          }
        },
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn'
          }
        }]
    });
  });

  return run(() => {
    return store.findByIds('person', [1,2,3]).then(records => {
      for (let i=0, l = get(results, 'data.length'); i<l; i++) {
        let { id, attributes: { name }} = results.data[i];
        assert.deepEqual(records[i].getProperties('id', 'name'), { id, name }, 'a record array materializes objects on demand');
      }
    });
  });
});

test('acts as a live query', function(assert) {
  let store = createStore({
    person: Person
  });

  let recordArray = store.peekAll('person');

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'wycats'
        }
      }
    });
  });

  assert.equal(get(recordArray, 'lastObject.name'), 'wycats');

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'brohuda'
        }
      }
    });
  });
  assert.equal(get(recordArray, 'lastObject.name'), 'brohuda');
});

test('stops updating when destroyed', function(assert) {
  assert.expect(3);

  let store = createStore({
    person: Person
  });

  let recordArray = store.peekAll('person');
  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'wycats'
        }
      }
    });
  });

  run(() => recordArray.destroy());

  run(() => {
    assert.equal(recordArray.get('length'), 0, 'Has no more records');
    store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'brohuda'
        }
      }
    });
  });

  assert.equal(recordArray.get('length'), 0, 'Has not been updated');
  assert.equal(recordArray.get('content'), undefined, 'Has not been updated');
});

test('a loaded record is removed from a record array when it is deleted', function(assert) {
  assert.expect(5);

  let env = setupStore({
    tag: Tag,
    person: Person,
    adapter: DS.Adapter.extend({
      deleteRecord() {
        return Promise.resolve();
      },
      shouldBackgroundReloadRecord() {
        return false;
      }
    })
  });

  let store = env.store;

  run(() => {
    store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Scumbag Katz'
        }
      }, {
        type: 'person',
        id: '3',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }, {
        type: 'tag',
        id: '1'
      }]
    });
  });

  return run(() => {
    return hash({
      scumbag: store.findRecord('person', 1),
      tag: store.findRecord('tag', 1)
    }).then(records => {
      let scumbag = records.scumbag;
      let tag = records.tag;

      run(() => tag.get('people').addObject(scumbag));

      assert.equal(get(scumbag, 'tag'), tag, "precond - the scumbag's tag has been set");

      let recordArray = tag.get('people');

      assert.equal(get(recordArray, 'length'), 1, 'precond - record array has one item');
      assert.equal(get(recordArray.objectAt(0), 'name'), 'Scumbag Dale', "item at index 0 is record with id 1");

      scumbag.deleteRecord();

      assert.equal(get(recordArray, 'length'), 1, 'record is still in the record array until it is saved');

      run(scumbag, 'save');

      assert.equal(get(recordArray, 'length'), 0, 'record is removed from the array when it is saved');
    });
  });
});

test('a loaded record is not removed from a record array when it is deleted even if the belongsTo side isn\'t defined', function(assert) {
  let env = setupStore({
    tag: Tag,
    person: Person.reopen({tags: null }),
    adapter: DS.Adapter.extend({
      deleteRecord() {
        return Promise.resolve();
      }
    })
  });

  let store = env.store;
  let scumbag, tag;

  run(() => {
    store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Tom'
        }
      }, {
        type: 'tag',
        id: '1',
        relationships: {
          people: {
            data: [
              { type: 'person', id: '1' }
            ]
          }
        }
      }]
    });
    scumbag = store.peekRecord('person', 1);
    tag = store.peekRecord('tag', 1);

    scumbag.deleteRecord();
  });

  run(() => {
    assert.equal(tag.get('people.length'), 1, 'record is not removed from the record array');
    assert.equal(tag.get('people').objectAt(0), scumbag, 'tag still has the scumbag');
  });
});

test("a loaded record is not removed from both the record array and from the belongs to, even if the belongsTo side isn't defined", function(assert) {
  let env = setupStore({
    tag: Tag,
    person: Person,
    tool: Tool,
    adapter: DS.Adapter.extend({
      deleteRecord() {
        return Promise.resolve();
      }
    })
  });

  let store = env.store;
  let scumbag, tag, tool;

  run(() => {
    store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Tom'
        }
      }, {
        type: 'tag',
        id: '1',
        relationships: {
          people: {
            data: [
              { type: 'person', id: '1' }
            ]
          }
        }
      }, {
        type: 'tool',
        id: '1',
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }]
    });
    scumbag = store.peekRecord('person', 1);
    tag = store.peekRecord('tag', 1);
    tool = store.peekRecord('tool', 1);
  });

  run(() => {
    assert.equal(tag.get('people.length'), 1, 'record is in the record array');
    assert.equal(tool.get('person'), scumbag, 'the tool belongs to the record');
  });

  run(() => scumbag.deleteRecord());

  assert.equal(tag.get('people.length'), 1, 'record is stil in the record array');
  assert.equal(tool.get('person'), scumbag, 'the tool still belongs to the record');
});

// GitHub Issue #168
test('a newly created record is removed from a record array when it is deleted', function(assert) {
  let store = createStore({
    person: Person,
    tag: Tag
  });
  let recordArray = store.peekAll('person');
  let scumbag = run(() => {
    return store.createRecord('person', {
      name: 'Scumbag Dale'
    });
  });

  assert.equal(get(recordArray, 'length'), 1, 'precond - record array already has the first created item');

  // guarantee coalescence
  run(() => {
    store.createRecord('person', { name: 'p1' });
    store.createRecord('person', { name: 'p2' });
    store.createRecord('person', { name: 'p3' });
  });

  assert.equal(get(recordArray, 'length'), 4, 'precond - record array has the created item');
  assert.equal(recordArray.objectAt(0), scumbag, 'item at index 0 is record with id 1');

  run(() => scumbag.deleteRecord());

  assert.equal(get(recordArray, 'length'), 3, 'record array still has the created item');
});

test("a record array returns undefined when asking for a member outside of its content Array's range", function(assert) {
  let store = createStore({
    person: Person
  });

  run(() => {
    store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Scumbag Katz'
        }
      }, {
        type: 'person',
        id: '3',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }]
    });
  });

  let recordArray = store.peekAll('person');

  assert.strictEqual(recordArray.objectAt(20), undefined, "objects outside of the range just return undefined");
});

// This tests for a bug in the recordCache, where the records were being cached in the incorrect order.
test('a record array should be able to be enumerated in any order', function(assert) {
  let store = createStore({
    person: Person
  });

  run(() => {
    store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Scumbag Katz'
        }
      }, {
        type: 'person',
        id: '3',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }]
    });
  });

  let recordArray = store.peekAll('person');

  assert.equal(get(recordArray.objectAt(2), 'id'), 3, "should retrieve correct record at index 2");
  assert.equal(get(recordArray.objectAt(1), 'id'), 2, "should retrieve correct record at index 1");
  assert.equal(get(recordArray.objectAt(0), 'id'), 1, "should retrieve correct record at index 0");
});

test("an AdapterPopulatedRecordArray knows if it's loaded or not", function(assert) {
  assert.expect(1);

  let env = setupStore({ person: Person });
  let store = env.store;

  env.adapter.query = function(store, type, query, recordArray) {
    return Promise.resolve(results);
  };

  return run(() => {
    return store.query('person', { page: 1 }).then(people => {
      assert.equal(get(people, 'isLoaded'), true, "The array is now loaded");
    });
  });
});
