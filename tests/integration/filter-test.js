import { hash, all } from 'rsvp';
import { set, get, computed } from '@ember/object';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

import customAdapter from 'dummy/tests/helpers/custom-adapter';

let store, env, data, recordArray;

const Person = DS.Model.extend({
  name: DS.attr('string'),
  bestFriend: DS.belongsTo('person', { inverse: null, async: false }),
  upperName: computed('name', function() {
    return this.get('name').toUpperCase();
  }).readOnly()
});

module('integration/filter - DS.Model updating', {
  beforeEach() {
    data = [
      {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Scumbag Dale'
        },
        relationships: {
          bestFriend: {
            data: {
              id: '2',
              type: 'person'
            }
          }
        }
      },
      {
        id: '2',
        type: 'person',
        attributes: {
          name: 'Scumbag Katz'
        }
      },
      {
        id: '3',
        type: 'person',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }
    ];

    env = setupStore({ person: Person });
    store = env.store;
  },

  afterEach() {
    edited = null;
    data = null;

    run(store, 'destroy');
  }
});

function tapFn(fn, callback) {
  const old_fn = fn;

  function new_fn() {
    let result = old_fn.apply(this, arguments);
    if (callback) {
      callback.apply(fn, arguments);
    }
    new_fn.summary.called.push(arguments);
    return result;
  }
  new_fn.summary = { called: [] };

  return new_fn;
}


test('when a DS.Model updates its attributes, its changes affect its filtered Array membership', function(assert) {
  run(() => store.push({ data }));

  let people = run(() => {
    return store.filter('person', hash => {
      if (hash.get('name').match(/Katz$/)) {
        return true;
      }
    });
  });

  assert.equal(get(people, 'length'), 1, 'precond - one item is in the RecordArray');

  const person = people.objectAt(0);

  assert.equal(get(person, 'name'), 'Scumbag Katz', 'precond - the item is correct');

  run(() => set(person, 'name', 'Yehuda Katz'));

  assert.equal(get(people, 'length'), 1, 'there is still one item');
  assert.equal(get(person, 'name'), 'Yehuda Katz', "it has the updated item");

  run(() => set(person, 'name', 'Yehuda Katz-Foo'));

  assert.equal(get(people, 'query'), null, 'expected no query object set');
  assert.equal(get(people, 'length'), 0, 'there are now no items');
});

test('when a DS.Model updates its relationships, its changes affect its filtered Array membership', function(assert) {
  run(() => store.push({ data }));

  let people = run(() => {
    return store.filter('person', person => {
      if (person.get('bestFriend') && person.get('bestFriend.name').match(/Katz$/)) {
        return true;
      }
    });
  });

  run(() => assert.equal(get(people, 'length'), 1, 'precond - one item is in the RecordArray'));

  let person = people.objectAt(0);

  assert.equal(get(person, 'name'), 'Scumbag Dale', 'precond - the item is correct');

  run(() => set(person, 'bestFriend', null));

  assert.equal(get(people, 'length'), 0, 'there are now 0 items');

  let erik = store.peekRecord('person', 3);
  let yehuda = store.peekRecord('person', 2);

  run(() => erik.set('bestFriend', yehuda));

  person = people.objectAt(0);
  assert.equal(get(people, 'length'), 1, 'there is now 1 item');
  assert.equal(get(person, 'name'), 'Scumbag Bryn', 'precond - the item is correct');
});

test('a record array can have a filter on it', function(assert) {
  run(() => store.push({ data }));

  let recordArray = run(() => {
    return store.filter('person', hash => {
      if (hash.get('name').match(/Scumbag [KD]/)) {
        return true;
      }
    });
  });

  assert.equal(get(recordArray, 'length'), 2, 'The Record Array should have the filtered objects on it');

  run(() => {
    store.push({
      data: [{
        id: '4',
        type: 'person',
        attributes: {
          name: 'Scumbag Koz'
        }
      }]
    });
  });

  assert.equal(get(recordArray, 'length'), 3, 'The Record Array should be updated as new items are added to the store');

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Scumbag Tom'
        }
      }]
    });
  });

  assert.equal(get(recordArray, 'length'), 2, 'The Record Array should be updated as existing members are updated');
});

test('a filtered record array includes created elements', function(assert) {
  run(() => store.push({ data }));

  let recordArray = run(() => {
    return store.filter('person', hash => {
      if (hash.get('name').match(/Scumbag [KD]/)) {
        return true;
      }
    });
  });

  assert.equal(get(recordArray, 'length'), 2, 'precond - The Record Array should have the filtered objects on it');

  run(() => {
    store.createRecord('person', { name: 'Scumbag Koz' });
  });

  assert.equal(get(recordArray, 'length'), 3, 'The record array has the new object on it');
});

test('a Record Array can update its filter', function(assert) {
  customAdapter(env, DS.Adapter.extend({
    deleteRecord(store, type, snapshot) { },
    shouldBackgroundReloadRecord() { return false; }
  }));

  run(() => store.push({ data }));

  let dickens = run(() => {
    let record = store.createRecord('person', { id: 4, name: 'Scumbag Dickens' });
    record.deleteRecord();
    return record;
  });

  let asyncData = run(() => {
    return {
      dale: store.findRecord('person', 1),
      katz: store.findRecord('person', 2),
      bryn: store.findRecord('person', 3)
    };
  });

  return store.filter('person', hash => {
    if (hash.get('name').match(/Scumbag [KD]/)) {
      return true;
    }
  }).then(recordArray => {

    return hash(asyncData).then(records => {
      assert.contains(recordArray, records.dale);
      assert.contains(recordArray, records.katz);
      assert.without(recordArray,  dickens);
      assert.without(recordArray,  records.bryn);

      run(() => {
        recordArray.set('filterFunction', hash => {
          if (hash.get('name').match(/Katz/)) {
            return true;
          }
        });
      });

      assert.equal(get(recordArray, 'length'), 1, 'The Record Array should have one object on it');

      run(() => {
        store.push({
          data: [{
            id: '5',
            type: 'person',
            attributes: {
              name: 'Other Katz'
            }
          }]
        });
      });

      assert.equal(get(recordArray, 'length'), 2, 'The Record Array now has the new object matching the filter');

      run(() => {
        store.push({
          data: [{
            id: '6',
            type: 'person',
            attributes: {
              name: 'Scumbag Demon'
            }
          }]
        });
      });

      assert.equal(get(recordArray, 'length'), 2, 'The Record Array doesn\'t have objects matching the old filter');
    });
  });
});

test('a Record Array can update its filter and notify array observers', function(assert) {
  customAdapter(env, DS.Adapter.extend({
    deleteRecord(store, type, snapshot) { },
    shouldBackgroundReloadRecord() { return false; }
  }));

  run(() => store.push({ data }));

  let dickens = run(() => {
    dickens = store.createRecord('person', { id: 4, name: 'Scumbag Dickens' });
    dickens.deleteRecord();
    return dickens;
  });

  let asyncData = run(() => {
    return [
      store.findRecord('person', 1),
      store.findRecord('person', 2),
      store.findRecord('person', 3)
    ];
  });

  return store.filter('person', hash => {
    if (hash.get('name').match(/Scumbag [KD]/)) {
      return true;
    }
  }).then(recordArray => {

    let didChangeIdx;
    let didChangeRemoved = 0;
    let didChangeAdded = 0;

    let arrayObserver = {
      arrayWillChange() { },

      arrayDidChange(array, idx, removed, added) {
        didChangeIdx = idx;
        didChangeRemoved += removed;
        didChangeAdded += added;
      }
    };

    recordArray.addArrayObserver(arrayObserver);

    run(() => {
      recordArray.set('filterFunction', hash => {
        if (hash.get('name').match(/Katz/)) {
          return true;
        }
      });
    });

    return all(asyncData).then(() => {
      assert.equal(didChangeRemoved, 1, 'removed one item from array');
      didChangeRemoved = 0;

      run(() => {
        store.push({
          data: [{
            id: '5',
            type: 'person',
            attributes: {
              name: 'Other Katz'
            }
          }]
        });
      });

      assert.equal(didChangeAdded, 1, 'one item was added');
      didChangeAdded = 0;

      assert.equal(recordArray.objectAt(didChangeIdx).get('name'), 'Other Katz');

      run(() => {
        store.push({
          data: [{
            id: '6',
            type: 'person',
            attributes: {
              name: 'Scumbag Demon'
            }
          }]
        });
      });

      assert.equal(didChangeAdded, 0, 'did not get called when an object that doesn\'t match is added');

      run(() => {
        recordArray.set('filterFunction', hash => {
          if (hash.get('name').match(/Scumbag [KD]/)) {
            return true;
          }
        });
      });

      assert.equal(didChangeAdded, 2, 'one item is added when going back');
      assert.equal(recordArray.objectAt(didChangeIdx).get('name'), 'Scumbag Dale');
      assert.equal(recordArray.objectAt(didChangeIdx+1).get('name'), 'Scumbag Demon');
    });
  });
});

test('it is possible to filter by computed properties', function(assert) {
  customAdapter(env, DS.Adapter.extend({
    shouldBackgroundReloadRecord: () => false
  }));

  let filter = run(() => {
    return store.filter('person', person => person.get('upperName') === 'TOM DALE');
  });

  assert.equal(filter.get('length'), 0, 'precond - the filter starts empty');

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  assert.equal(filter.get('length'), 1, 'the filter now has a record in it');

  return store.findRecord('person', 1).then(person => {
    run(() => {
      person.set('name', 'Yehuda Katz');
    });

    assert.equal(filter.get('length'), 0, 'the filter is empty again');
  });
});

test('a filter created after a record is already loaded works', function(assert) {
  customAdapter(env, DS.Adapter.extend({
    shouldBackgroundReloadRecord() { return false; }
  }));

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  let filter = run(() => {
    return store.filter('person', person => person.get('upperName') === 'TOM DALE');
  });

  assert.equal(filter.get('length'), 1, 'the filter now has a record in it');

  return store.findRecord('person', 1).then(person => {
    assert.equal(filter.objectAt(0), person);
  });
});

test('filter with query persists query on the resulting filteredRecordArray', function(assert) {
  customAdapter(env, DS.Adapter.extend({
    query(store, type, id) {
      return {
        data: [
          {
            id: id,
            type: 'person',
            attributes: {
              name: 'Tom Dale'
            }
          }
        ]
      };
    }
  }));

  let filter = run(() => {
    return store.filter('person', { foo: 1 }, person => true);
  });

  return run(() => {
    return filter.then(array => {
      assert.deepEqual(get(array, 'query'), { foo: 1 }, 'has expected query');
    });
  });
});

test('it is possible to filter by state flags', function(assert) {
  customAdapter(env, DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return {
        data: {
          id,
          type: 'person',
          attributes: {
            name: 'Tom Dale'
          }
        }
      };
    }
  }));

  let filter = run(() => {
    return store.filter('person', person => person.get('isLoaded'));
  });

  assert.equal(filter.get('length'), 0, 'precond - there are no records yet');

  let person = run(() => {
    let person = store.findRecord('person', 1);

    // run will block `find` from being synchronously
    // resolved in test mode

    assert.equal(filter.get('length'), 0, 'the unloaded record isn\'t in the filter');
    return person;
  });

  return person.then(person => {
    assert.equal(filter.get('length'), 1, 'the now-loaded record is in the filter');
    assert.equal(filter.objectAt(0), person);
  });
});

test('it is possible to filter loaded records by dirtiness', function(assert) {
  customAdapter(env, DS.Adapter.extend({
    updateRecord(type, model, snapshot) {
      return { data: { id: snapshot.id, type: model.modelName } };
    },
    shouldBackgroundReloadRecord() {
      return false;
    }
  }));

  let filter = store.filter('person', person => !person.get('hasDirtyAttributes'));

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  return store.findRecord('person', 1).then(person => {
    assert.equal(filter.get('length'), 1, 'the clean record is in the filter');

    // Force synchronous update of the filter, even though
    // we're already inside a run loop
    run(() => person.set('name', 'Yehuda Katz'));

    assert.equal(filter.get('length'), 0, 'the now-dirty record is not in the filter');

    return person.save();
  }).then(person => {
    assert.equal(filter.get('length'), 1, 'the clean record is back in the filter');
  });
});

test('it is possible to filter created records by dirtiness', function(assert) {
  run(() => {
    customAdapter(env, DS.Adapter.extend({
      createRecord(type, model, snapshot) {
        return {
          data: {
            id: snapshot.id,
            type: model.modelName,
            attributes: snapshot._attributes
          }
        }
      },
      shouldBackgroundReloadRecord() { return false; }
    }));
  });

  let filter = run(() => {
    return store.filter('person', person => !person.get('hasDirtyAttributes'));
  });

  let person = run(() => {
    return store.createRecord('person', {
      id: 1,
      name: 'Tom Dale'
    });
  });

  assert.equal(filter.get('length'), 0, 'the dirty record is not in the filter');

  return run(() => {
    return person.save().then(person => {
      assert.equal(filter.get('length'), 1, 'the clean record is in the filter');
    });
  });
});

test('it is possible to filter created records by isReloading', function(assert) {
  customAdapter(env, DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return {
        data: {
          id: 1,
          type: 'person',
          attributes: {
            name: 'Tom Dalle'
          }
        }
      };
    }
  }));

  let filter = store.filter('person', person => {
    return !person.get('isReloading');
  });

  let person = store.createRecord('person', {
    id: 1,
    name: 'Tom Dale'
  });

  return person.reload().then(person => {
    assert.equal(filter.get('length'), 1, 'the filter correctly returned a reloaded object');
  });
});

// SERVER SIDE TESTS
let edited;

function clientEdits(ids) {
  edited = [];

  ids.forEach(id => {
    // wrap in an run to guarantee coalescence of the
    // iterated `set` calls and promise resolution.
    run(() => {
      store.findRecord('person', id).then(person => {
        edited.push(person);
        person.set('name', 'Client-side ' + id );
      });
    });
  });
}

function clientCreates(names) {
  // wrap in an run to guarantee coalescence of the
  // iterated `set` calls.
  edited = run(() => {
    return names.map(name => store.createRecord('person', { name: 'Client-side ' + name }));
  });
}

function serverResponds() {
  edited.forEach(person => run(person, 'save'));
}

function setup(assert, serverCallbacks) {
  customAdapter(env, DS.Adapter.extend(serverCallbacks));

  run(() => {
    store.push({ data });

    recordArray = store.filter('person', hash => {
      if (hash.get('name').match(/Scumbag/)) {
        return true;
      }
    });
  });

  assert.equal(get(recordArray, 'length'), 3, 'The filter function should work');
}

test('a Record Array can update its filter after server-side updates one record', function(assert) {
  setup(assert, {
    updateRecord(store, type, snapshot) {
      return {
        data: {
          id: 1,
          type: 'person',
          attributes: {
            name: 'Scumbag Server-side Dale'
          }
        }
      };
    },
    shouldBackgroundReloadRecord() { return false; }
  });

  clientEdits([1]);
  assert.equal(get(recordArray, 'length'), 2, 'The record array updates when the client changes records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 3, 'The record array updates when the server changes one record');
});

test('a Record Array can update its filter after server-side updates multiple records', function(assert) {
  setup(assert, {
    updateRecord(store, type, snapshot) {
      switch (snapshot.id) {
        case '1':
          return {
            data: {
              id: 1,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side Dale'
              }
            }
          };
        case '2':
          return {
            data: {
              id: 2,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side Katz'
              }
            }
          };
      }
    },
    shouldBackgroundReloadRecord() { return false; }
  });

  clientEdits([1, 2]);
  assert.equal(get(recordArray, 'length'), 1, 'The record array updates when the client changes records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 3, 'The record array updates when the server changes multiple records');
});

test('a Record Array can update its filter after server-side creates one record', function(assert) {
  setup(assert, {
    createRecord(store, type, snapshot) {
      return {
        data: {
          id: 4,
          type: 'person',
          attributes: {
            name: 'Scumbag Server-side Tim'
          }
        }
      };
    }
  });

  clientCreates(['Tim']);
  assert.equal(get(recordArray, 'length'), 3, 'The record array does not include non-matching records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 4, 'The record array updates when the server creates a record');
});

test('a Record Array can update its filter after server-side creates multiple records', function(assert) {
  setup(assert, {
    createRecord(store, type, snapshot) {
      switch (snapshot.attr('name')) {
        case 'Client-side Mike':
          return {
            data: {
              id: 4,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side Mike'
              }
            }
          };
        case 'Client-side David':
          return {
            data: {
              id: 5,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side David'
              }
            }
          };
      }
    }
  });

  clientCreates(['Mike', 'David']);
  assert.equal(get(recordArray, 'length'), 3, 'The record array does not include non-matching records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 5, 'The record array updates when the server creates multiple records');
});

test('a Record Array can update its filter after server-side creates multiple records', function(assert) {
  setup(assert, {
    createRecord(store, type, snapshot) {
      switch (snapshot.attr('name')) {
        case 'Client-side Mike':
          return {
            data: {
              id: 4,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side Mike'
              }
            }
          };
        case 'Client-side David':
          return {
            data: {
              id: 5,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side David'
              }
            }
          };
      }
    }
  });

  clientCreates(['Mike', 'David']);
  assert.equal(get(recordArray, 'length'), 3, 'The record array does not include non-matching records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 5, 'The record array updates when the server creates multiple records');
});

test('destroying filteredRecordArray unregisters models from being filtered', function(assert) {
  const filterFn = tapFn(() => true);

  customAdapter(env, DS.Adapter.extend({
    shouldBackgroundReloadRecord() { return false; }
  }));

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  const recordArray = run(() => store.filter('person', filterFn));

  assert.equal(filterFn.summary.called.length, 1);

  run(() => recordArray.then(array => array.destroy()));

  clientEdits([1]);

  assert.equal(filterFn.summary.called.length, 1, 'expected the filter function not being called anymore');
});
