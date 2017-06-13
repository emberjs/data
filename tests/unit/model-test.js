import {createStore} from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';
import DS from 'ember-data';
import { isEnabled } from 'ember-data/-private';

const { get, getOwner, set, run } = Ember;

let Person, store, env;

module('unit/model - DS.Model', {
  beforeEach() {
    Person = DS.Model.extend({
      name: DS.attr('string'),
      isDrugAddict: DS.attr('boolean')
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  afterEach() {
    run(() => store.destroy());
  }
});

test('can have a property set on it', function(assert) {
  let record = run(() => {
    let record = store.createRecord('person');
    set(record, 'name', 'bar');
    return record;
  });

  assert.equal(get(record, 'name'), 'bar', 'property was set on the record');
});

test('setting a property on a record that has not changed does not cause it to become dirty', function(assert) {
  assert.expect(2);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Peter',
          isDrugAddict: true
        }
      }
    });

    return store.findRecord('person', 1).then(person => {
      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');

      person.set('name', "Peter");
      person.set('isDrugAddict', true);

      assert.equal(person.get('hasDirtyAttributes'), false, 'record does not become dirty after setting property to old value');
    });
  });
});

test('resetting a property on a record cause it to become clean again', function(assert) {
  assert.expect(3);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Peter',
          isDrugAddict: true
        }
      }
    });

    return store.findRecord('person', 1).then(person => {
      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');
      person.set('isDrugAddict', false);
      assert.equal(person.get('hasDirtyAttributes'), true, 'record becomes dirty after setting property to a new value');
      person.set('isDrugAddict', true);
      assert.equal(person.get('hasDirtyAttributes'), false, 'record becomes clean after resetting property to the old value');
    });
  });
});

test('resetting a property to the current in-flight value causes it to become clean when the save completes', function(assert) {
  assert.expect(4);

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.Promise.resolve()
  };

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom'
        }
      }
    });

    let person = store.peekRecord('person', 1);
    person.set('name', "Thomas");

    let saving = person.save()

    assert.equal(person.get('name'), 'Thomas');

    person.set('name', 'Tomathy');
    assert.equal(person.get('name'), 'Tomathy');

    person.set('name', 'Thomas');
    assert.equal(person.get('name'), 'Thomas');

    return saving.then(() => {
      assert.equal(person.get('hasDirtyAttributes'), false, 'The person is now clean');
    });
  });
});

test('a record becomes clean again only if all changed properties are reset', function(assert) {
  assert.expect(5);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Peter',
          isDrugAddict: true
        }
      }
    });

    return store.findRecord('person', 1).then(person =>  {
      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');
      person.set('isDrugAddict', false);
      assert.equal(person.get('hasDirtyAttributes'), true, 'record becomes dirty after setting one property to a new value');
      person.set('name', 'Mark');
      assert.equal(person.get('hasDirtyAttributes'), true, 'record stays dirty after setting another property to a new value');
      person.set('isDrugAddict', true);
      assert.equal(person.get('hasDirtyAttributes'), true, 'record stays dirty after resetting only one property to the old value');
      person.set('name', 'Peter');
      assert.equal(person.get('hasDirtyAttributes'), false, "record becomes clean after resetting both properties to the old value");
    });
  });
});

test('a record reports its unique id via the `id` property', function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });

    return store.findRecord('person', 1).then(record => {
      assert.equal(get(record, 'id'), 1, 'reports id as id by default');
    });
  });
});

test("a record's id is included in its toString representation", function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });

    return store.findRecord('person', 1).then(record => {
      assert.equal(record.toString(), `<(subclass of DS.Model):${Ember.guidFor(record)}:1>`, 'reports id in toString');
    });
  });
});

testInDebug('trying to set an `id` attribute should raise', function(assert) {
  Person = DS.Model.extend({
    id: DS.attr('number'),
    name: DS.attr('string')
  });

  const store = createStore({
    person: Person
  });

  assert.expectAssertion(() => {
    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumdale'
          }
        }
      });
      store.findRecord('person', 1);
    });
  }, /You may not set `id`/);
});

test(`a collision of a record's id with object function's name`, function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  let hasWatchMethod = Object.prototype.watch;
  try {
    if (!hasWatchMethod) {
      Object.prototype.watch = function() {};
    }
    return run(() => {
      store.push({
        data: {
          type: 'person',
          id: 'watch'
        }
      });

      return store.findRecord('person', 'watch').then(record => {
        assert.equal(get(record, 'id'), 'watch', 'record is successfully created and could be found by its id');
      });
    });
  } finally {
    if (!hasWatchMethod) {
      delete Object.prototype.watch;
    }
  }
});

test('it should use `_internalModel` and not `internalModel` to store its internalModel', function(assert) {
  run(() => {
    store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {}
      }
    });

    assert.equal(store.peekRecord('person', 1).get('internalModel'), undefined, `doesn't shadow internalModel key`);
  });
});

test('it should cache attributes', function(assert) {
  assert.expect(2);

  const Post = DS.Model.extend({
    updatedAt: DS.attr('string')
  });

  const store = createStore({
    post: Post
  });

  let dateString = 'Sat, 31 Dec 2011 00:08:16 GMT';
  let date = new Date(dateString);

  return run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1'
      }
    });

    return store.findRecord('post', 1).then(record => {
      record.set('updatedAt', date);

      assert.deepEqual(date, get(record, 'updatedAt'), 'setting a date returns the same date');
      assert.strictEqual(get(record, 'updatedAt'), get(record, 'updatedAt'), 'second get still returns the same object');
    }).finally(() => {
      run(store, 'destroy');
    });
  });
});

test("changedAttributes() return correct values", function(assert) {
  assert.expect(4);

  const Mascot = DS.Model.extend({
    name: DS.attr('string'),
    likes: DS.attr('string'),
    isMascot: DS.attr('boolean')
  });

  let store = createStore({
    mascot: Mascot
  });

  let mascot = run(() => {
    store.push({
      data: {
        type: 'mascot',
        id: '1',
        attributes: {
          likes: 'JavaScript',
          isMascot: true
        }
      }
    });

    return store.peekRecord('mascot', 1);
  });

  assert.equal(Object.keys(mascot.changedAttributes()).length, 0, 'there are no initial changes');
  run(() => {
    mascot.set('name', 'Tomster');   // new value
    mascot.set('likes', 'Ember.js'); // changed value
    mascot.set('isMascot', true);    // same value
  });

  let changedAttributes = mascot.changedAttributes();

  assert.deepEqual(changedAttributes.name, [undefined, 'Tomster']);
  assert.deepEqual(changedAttributes.likes, ['JavaScript', 'Ember.js']);

  run(() => mascot.rollbackAttributes());

  assert.equal(Object.keys(mascot.changedAttributes()).length, 0, 'after rollback attributes there are no changes');
});

function toObj(obj) {
  // https://github.com/jquery/qunit/issues/851
  let result = Object.create(null);
  for (let key in obj) {
    result[key] = obj[key];
  }
  return result;
}

test('changedAttributes() works while the record is being saved', function(assert) {
  assert.expect(1);

  let cat;
  const Adapter = DS.Adapter.extend({
    createRecord(store, model, snapshot) {
      assert.deepEqual(toObj(cat.changedAttributes()), {
        name: [undefined, 'Argon'],
        likes: [undefined, 'Cheese']
      });

      return { data: { id: 1, type: 'mascot' } };
    }
  });

  const Mascot = DS.Model.extend({
    name: DS.attr('string'),
    likes: DS.attr('string'),
    isMascot: DS.attr('boolean')
  });

  let store = createStore({
    mascot: Mascot,
    adapter: Adapter
  });

  return run(() => {
    cat = store.createRecord('mascot');
    cat.setProperties({
      name: 'Argon',
      likes: 'Cheese'
    });

    return cat.save();
  });
});

test('changedAttributes() works while the record is being updated', function(assert) {
  assert.expect(1);
  let cat;
  const Adapter = DS.Adapter.extend({
    updateRecord(store, model, snapshot) {
      assert.deepEqual(toObj(cat.changedAttributes()), {
        name: ['Argon', 'Helia'],
        likes: ['Cheese', 'Mussels']
      });

      return { data: { id: '1', type: 'mascot' } };
    }
  });

  const Mascot = DS.Model.extend({
    name: DS.attr('string'),
    likes: DS.attr('string'),
    isMascot: DS.attr('boolean')
  });

  let store = createStore({
    mascot: Mascot,
    adapter: Adapter
  });

  return run(() => {
    store.push({
      data: {
        type: 'mascot',
        id: '1',
        attributes: {
          name: 'Argon',
          likes: 'Cheese'
        }
      }
    });

    cat = store.peekRecord('mascot', 1);
    cat.setProperties({
      name: 'Helia',
      likes: 'Mussels'
    });
    return cat.save();
  });
});

if (isEnabled('ds-rollback-attribute')) {
  test('rollbackAttribute() reverts a single attribute to its canonical value', function(assert) {
    assert.expect(5);

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Peter',
            isDrugAddict: true
          }
        }
      });

      let person = store.peekRecord('person', 1);

      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');
      person.setProperties({
        name: 'Piper',
        isDrugAddict: false
      });
      assert.equal(person.get('hasDirtyAttributes'), true, 'record becomes dirty after setting property to a new value');
      person.rollbackAttribute('isDrugAddict');
      assert.equal(person.get('isDrugAddict'), true, 'The specified attribute is rolled back');
      assert.equal(person.get('name'), 'Piper', 'Unspecified attributes are not rolled back');
      assert.equal(person.get('hasDirtyAttributes'), true, 'record with changed attributes is still dirty');
    });
  });

  test('calling rollbackAttribute() on an unmodified property has no effect', function(assert) {
    assert.expect(5);

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Peter',
            isDrugAddict: true
          }
        }
      });

      let person = store.peekRecord('person', 1);

      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');
      person.set('name', 'Piper');
      assert.equal(person.get('hasDirtyAttributes'), true, 'record becomes dirty after setting property to a new value');
      person.rollbackAttribute('isDrugAddict');
      assert.equal(person.get('isDrugAddict'), true, 'The specified attribute does not change value');
      assert.equal(person.get('name'), 'Piper', 'Unspecified attributes are not rolled back');
      assert.equal(person.get('hasDirtyAttributes'), true, 'record with changed attributes is still dirty');
    });
  });

  test('Rolling back the final value with rollbackAttribute() causes the record to become clean again', function(assert) {
    assert.expect(3);

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Peter',
            isDrugAddict: true
          }
        }
      });

      let person = store.peekRecord('person', 1);

      assert.equal(person.get('hasDirtyAttributes'), false, 'precond - person record should not be dirty');
      person.set('isDrugAddict', false);
      assert.equal(person.get('hasDirtyAttributes'), true, 'record becomes dirty after setting property to a new value');
      person.rollbackAttribute('isDrugAddict');
      assert.equal(person.get('hasDirtyAttributes'), false, 'record becomes clean after resetting property to the old value');
    });
  });

  test('Using rollbackAttribute on an in-flight record reverts to the latest in-flight value', function(assert) {
    assert.expect(4);

    let person;

    // Make sure the save is async
    env.adapter.updateRecord = function(store, type, snapshot) {
      return Ember.RSVP.resolve();
    };

    return run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: "Tom"
          }
        }
      });
      person = store.peekRecord('person', 1);
      person.set('name', 'Thomas');

      let saving = person.save();

      assert.equal(person.get('isSaving'), true);
      assert.equal(person.get('name'), 'Thomas');

      person.set('name', 'Tomathy');
      assert.equal(person.get('name'), 'Tomathy');

      person.rollbackAttribute('name');
      assert.equal(person.get('name'), 'Thomas');

      return saving;
    });
  });

  test('Saving an in-flight record updates the in-flight value rollbackAttribute will use', function(assert) {
    assert.expect(7);

    let person, finishSaving;
    let updateRecordPromise = new Ember.RSVP.Promise(resolve => finishSaving = resolve);

    // Make sure the save is async
    env.adapter.updateRecord = function(store, type, snapshot) {
      return updateRecordPromise;
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: "Tom"
          }
        }
      });

      person = store.peekRecord('person', 1);
    });

    let saving = [];

    run(() => {
      person.set('name', 'Thomas');
      saving.push(person.save());
    });

    run(() => {
      assert.equal(person.get('isSaving'), true);
      assert.equal(person.get('name'), 'Thomas');

      person.set('name', 'Tomathy');
      assert.equal(person.get('name'), 'Tomathy');

      saving.push(person.save());
    });

    run(() => {
      assert.equal(person.get('isSaving'), true);
      assert.equal(person.get('name'), "Tomathy");

      person.set('name', "Tomny");
      assert.equal(person.get('name'), 'Tomny');

      person.rollbackAttribute('name');
      assert.equal(person.get('name'), 'Tomathy');

      finishSaving();
    });

    return Ember.RSVP.Promise.all(saving);
  });
}

test("a DS.Model does not require an attribute type", function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr()
  });

  let store = createStore({
    tag: Tag
  });

  let tag = run(() => store.createRecord('tag', { name: "test" }));

  assert.equal(get(tag, 'name'), 'test', 'the value is persisted');
});

test('a DS.Model can have a defaultValue without an attribute type', function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr({ defaultValue: "unknown" })
  });

  let store = createStore({
    tag: Tag
  });

  let tag = run(() => store.createRecord('tag'));

  assert.equal(get(tag, 'name'), 'unknown', 'the default value is found');
});

testInDebug('Calling attr() throws a warning', function(assert) {
  assert.expect(1);

  let person = run(() => store.createRecord('person', { id: 1, name: 'TomHuda' }));

  assert.throws(() => {
    person.attr();
  }, /The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected/, 'attr() throws a warning');
});

test('supports pushedData in root.deleted.uncommitted', function(assert) {
  let hash = {
    data: {
      type: 'person',
      id: '1'
    }
  };

  run(() => {
    let record = store.push(hash);
    record.deleteRecord();
    store.push(hash);
    assert.equal(get(record, 'currentState.stateName'), 'root.deleted.uncommitted',
      'record accepts pushedData is in root.deleted.uncommitted state');
  });
});

test('currentState is accessible when the record is created', function(assert) {
  let hash = {
    data: {
      type: 'person',
      id: '1'
    }
  };

  run(() => {
    let record = store.push(hash);
    assert.equal(get(record, 'currentState.stateName'), 'root.loaded.saved',
      'records pushed into the store start in the loaded state');
  });
});

module('unit/model - DS.Model updating', {
  beforeEach() {
    Person = DS.Model.extend({
      name: DS.attr('string')
    });

    env = setupStore({
      person: Person
    });

    store = env.store;
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
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('a DS.Model can update its attributes', function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  return run(() => {
    return store.findRecord('person', 2).then(person => {
      set(person, 'name', 'Brohuda Katz');
      assert.equal(get(person, 'name'), 'Brohuda Katz', 'setting took hold');
    });
  });
});

test('a DS.Model can have a defaultValue', function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string', { defaultValue: 'unknown' })
  });

  let store = createStore({
    tag: Tag
  });

  let tag = run(() => store.createRecord('tag'));

  assert.equal(get(tag, 'name'), 'unknown', 'the default value is found');

  run(() => set(tag, 'name', null));

  assert.equal(get(tag, 'name'), null, `null doesn't shadow defaultValue`);
});

test(`a DS.model can define 'setUnknownProperty'`, function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string'),

    setUnknownProperty(key, value) {
      if (key === 'title') {
        this.set('name', value);
      }
    }
  });

  let store = createStore({
    tag: Tag
  });

  let tag = run(() => {
    tag = store.createRecord('tag', { name: "old" });
    set(tag, 'title', 'new');

    return tag;
  });

  assert.equal(get(tag, 'name'), 'new', 'setUnknownProperty not triggered');
});

test('a defaultValue for an attribute can be a function', function(assert) {
  const Tag = DS.Model.extend({
    createdAt: DS.attr('string', {
      defaultValue() {
        return 'le default value';
      }
    })
  });

  let store = createStore({
    tag: Tag
  });

  run(() => {
    let tag = store.createRecord('tag');
    assert.equal(get(tag, 'createdAt'), 'le default value', 'the defaultValue function is evaluated');
  });
});

test('a defaultValue function gets the record, options, and key', function(assert) {
  assert.expect(2);

  const Tag = DS.Model.extend({
    createdAt: DS.attr('string', {
      defaultValue(record, options, key) {
        assert.deepEqual(record, tag, 'the record is passed in properly');
        assert.equal(key, 'createdAt', 'the attribute being defaulted is passed in properly');
        return 'le default value';
      }
    })
  });

  let store = createStore({
    tag: Tag
  });

  let tag = run(() => store.createRecord('tag'));

  get(tag, 'createdAt');
});

testInDebug('a complex object defaultValue is deprecated', function(assert) {
  const Tag = DS.Model.extend({
    tagInfo: DS.attr({ defaultValue: [] })
  });

  let store = createStore({
    tag: Tag
  });

  let tag = run(() => store.createRecord('tag'));

  assert.expectDeprecation(() => {
    get(tag, 'tagInfo');
  }, /Non primitive defaultValues are deprecated/);
});

testInDebug('a null defaultValue is not deprecated', function(assert) {
  const Tag = DS.Model.extend({
    tagInfo: DS.attr({ defaultValue: null })
  });

  let store = createStore({
    tag: Tag
  });

  let tag = run(() => store.createRecord('tag'));

  assert.expectNoDeprecation();
  assert.equal(get(tag, 'tagInfo'), null);
});

test('setting a property to undefined on a newly created record should not impact the current state', function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    tag: Tag
  });

  let tag = run(() => {
    tag = store.createRecord('tag');

    set(tag, 'name', 'testing');
    set(tag, 'name', undefined);

    return tag;
  });


  assert.equal(get(tag, 'currentState.stateName'), 'root.loaded.created.uncommitted');

  tag = run(() =>  store.createRecord('tag', { name: undefined }));

  assert.equal(get(tag, 'currentState.stateName'), 'root.loaded.created.uncommitted');
});

// NOTE: this is a 'backdoor' test that ensures internal consistency, and should be
// thrown out if/when the current `_attributes` hash logic is removed.
test('setting a property back to its original value removes the property from the `_attributes` hash', function(assert) {
  assert.expect(3);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(person._internalModel._attributes.name, undefined, 'the `_attributes` hash is clean');

      set(person, 'name', 'Niceguy Dale');

      assert.equal(person._internalModel._attributes.name, 'Niceguy Dale', 'the `_attributes` hash contains the changed value');

      set(person, 'name', 'Scumbag Dale');

      assert.equal(person._internalModel._attributes.name, undefined, 'the `_attributes` hash is reset');
    });
  });
});

module("unit/model - with a simple Person model", {
  beforeEach() {
    Person = DS.Model.extend({
      name: DS.attr('string')
    });
    store = createStore({
      person: Person
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
  },
  afterEach() {
    run(store, 'destroy');
  }
});

test('can ask if record with a given id is loaded', function(assert) {
  assert.equal(store.hasRecordForId('person', 1), true, 'should have person with id 1');
  assert.equal(store.hasRecordForId('person', 1), true, 'should have person with id 1');
  assert.equal(store.hasRecordForId('person', 4), false, 'should not have person with id 4');
  assert.equal(store.hasRecordForId('person', 4), false, 'should not have person with id 4');
});

test("a listener can be added to a record", function(assert) {
  let count = 0;
  let F = function() { count++; };

  let record = run(() => store.createRecord('person'));

  record.on('event!', F);
  run(() => record.trigger('event!'));

  assert.equal(count, 1, 'the event was triggered');

  run(() => record.trigger('event!'));

  assert.equal(count, 2, 'the event was triggered');
});

test('when an event is triggered on a record the method with the same name is invoked with arguments', function(assert) {
  let count = 0;
  let F = function() { count++; };
  let record = run(() => store.createRecord('person'));

  record.eventNamedMethod = F;

  run(() => record.trigger('eventNamedMethod'));

  assert.equal(count, 1, "the corresponding method was called");
});

test('when a method is invoked from an event with the same name the arguments are passed through', function(assert) {
  let eventMethodArgs = null;
  let F = function() { eventMethodArgs = arguments; };
  let record = run(() => store.createRecord('person'));

  record.eventThatTriggersMethod = F;

  run(() => record.trigger('eventThatTriggersMethod', 1, 2));

  assert.equal(eventMethodArgs[0], 1);
  assert.equal(eventMethodArgs[1], 2);
});

function converts(assert, type, provided, expected, options = {}) {
  const Model = DS.Model.extend({
    name: DS.attr(type, options)
  });

  let registry, container;
  if (Ember.Registry) {
    registry = new Ember.Registry();
    container = registry.container();
  } else {
    container = new Ember.Container();
    registry = container;
  }

  let testStore = createStore({
    model: Model
  });
  getOwner(testStore).register('serializer:model', DS.JSONSerializer);

  run(() => {
    testStore.push(testStore.normalize('model', { id: 1, name: provided }));
    testStore.push(testStore.normalize('model', { id: 2 }));

    let record = testStore.peekRecord('model', 1);

    assert.deepEqual(get(record, 'name'), expected, type + ' coerces ' + provided + ' to ' + expected);
  });

  // See: Github issue #421
  // record = testStore.find(Model, 2);
  // set(record, 'name', provided);
  // deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
}

function convertsFromServer(assert, type, provided, expected) {
  const Model = DS.Model.extend({
    name: DS.attr(type)
  });

  let registry, container;
  if (Ember.Registry) {
    registry = new Ember.Registry();
    container = registry.container();
  } else {
    container = new Ember.Container();
    registry = container;
  }
  let testStore = createStore({
    model: Model,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord() { return false; }
    })
  });
  getOwner(testStore).register('serializer:model', DS.JSONSerializer);

  return run(() => {
    testStore.push(testStore.normalize('model', {
      id: '1',
      name: provided
    }));

    return testStore.findRecord('model', 1).then(record => {
      assert.deepEqual(get(record, 'name'), expected, type + ' coerces ' + provided + ' to ' + expected);
    });
  });
}

test('a DS.Model can describe String attributes', function(assert) {
  assert.expect(4);

  converts(assert, 'string', 'Scumbag Tom', 'Scumbag Tom');
  converts(assert, 'string', 1, '1');
  converts(assert, 'string', '', '');
  converts(assert, 'string', null, null);
});

test('a DS.Model can describe Number attributes', function(assert) {
  assert.expect(8);

  converts(assert, 'number', '1', 1);
  converts(assert, 'number', '0', 0);
  converts(assert, 'number', 1, 1);
  converts(assert, 'number', 0, 0);
  converts(assert, 'number', "", null);
  converts(assert, 'number', null, null);
  converts(assert, 'number', true, 1);
  converts(assert, 'number', false, 0);
});

test('a DS.Model can describe Boolean attributes', function(assert) {
  converts(assert, 'boolean', '1', true);
  converts(assert, 'boolean', "", false);
  converts(assert, 'boolean', 1, true);
  converts(assert, 'boolean', 0, false);

  converts(assert, 'boolean', null, null, { allowNull: true });

  converts(assert, 'boolean', null, false, { allowNull: false });

  converts(assert, 'boolean', null, false);

  converts(assert, 'boolean', true, true);
  converts(assert, 'boolean', false, false);
});

test('a DS.Model can describe Date attributes', function(assert) {
  assert.expect(5);

  converts(assert, 'date', null, null);
  converts(assert, 'date', undefined, undefined);

  let dateString = '2011-12-31T00:08:16.000Z';
  let date = new Date(dateString);

  const Person = DS.Model.extend({
    updatedAt: DS.attr('date')
  });

  let store = createStore({
    person: Person,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord() { return false; }
    })
  });

  return run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });

    return store.findRecord('person', 1).then(record => {
      record.set('updatedAt', date);
      assert.deepEqual(date, get(record, 'updatedAt'), 'setting a date returns the same date');
    });
  }).then(() => {
    convertsFromServer(assert, 'date', dateString, date);
    convertsWhenSet(assert, 'date', date, dateString);
  });
});

function convertsWhenSet(assert, type, provided, expected) {
  let testStore = createStore({
    model: DS.Model.extend({
      name: DS.attr(type)
    }),
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord() {
        return false;
      }
    })
  });
  getOwner(testStore).register('serializer:model', DS.JSONSerializer);

  return run(() => {
    testStore.push({
      data: {
        type: 'model',
        id: '2'
      }
    });

    return testStore.findRecord('model', 2).then(record => {
      set(record, 'name', provided);
      assert.deepEqual(record.serialize().name, expected, type + ' saves ' + provided + ' as ' + expected);
    });
  });
}

testInDebug(`don't allow setting`, function(assert) {
  const Person = DS.Model.extend();

  let store = createStore({
    person: Person
  });

  let record = run(() => store.createRecord('person'));

  assert.throws(() => {
    run(() => {
      record.set('isLoaded', true);
    });
  }, 'raised error when trying to set an unsettable record');
});

test('ensure model exits loading state, materializes data and fulfills promise only after data is available', function(assert) {
  assert.expect(2);

  let store = createStore({
    adapter: DS.Adapter.extend({
      findRecord(store, type, id, snapshot) {
        return Ember.RSVP.resolve({
          data: {
            id: 1,
            type: 'person',
            attributes: { name: 'John' }
          }
        });
      }
    }),
    person: Person
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(get(person, 'currentState.stateName'), 'root.loaded.saved', 'model is in loaded state');
      assert.equal(get(person, 'isLoaded'), true, 'model is loaded');
    });
  });
});

test('A DS.Model can be JSONified', function(assert) {
  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({ person: Person });
  let record = run(() => store.createRecord('person', { name: 'TomHuda' }));

  assert.deepEqual(record.toJSON(), { data: { type: 'people', attributes: { name: 'TomHuda' } } });
});

testInDebug('A subclass of DS.Model can not use the `data` property', function(assert) {
  const Person = DS.Model.extend({
    data: DS.attr('string'),
    name: DS.attr('string')
  });

  let store = createStore({ person: Person });

  assert.expectAssertion(() => {
    run(() => {
      store.createRecord('person', { name: 'TomHuda' });
    });
  }, /`data` is a reserved property name on DS.Model objects/);
});

testInDebug('A subclass of DS.Model can not use the `store` property', function(assert) {
  const Retailer = DS.Model.extend({
    store: DS.attr(),
    name: DS.attr()
  });

  let store = createStore({ retailer: Retailer });

  assert.expectAssertion(() => {
    run(() => {
      store.createRecord('retailer', { name: 'Buy n Large' });
    });
  }, /`store` is a reserved property name on DS.Model objects/);
});

testInDebug('A subclass of DS.Model can not use reserved properties', function(assert) {
  assert.expect(3);
  [
    'currentState', 'data', 'store'
  ].forEach(reservedProperty => {
    let invalidExtendObject = {};
    invalidExtendObject[reservedProperty] = DS.attr();
    const Post = DS.Model.extend(invalidExtendObject);

    let store = createStore({ post: Post });

    assert.expectAssertion(() => {
      run(() => {
        store.createRecord('post', {});
      });
    }, /is a reserved property name on DS.Model objects/);
  });
});

test('Pushing a record into the store should transition it to the loaded state', function(assert) {
  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({ person: Person });

  run(() => {
    let person = store.createRecord('person', { id: 1, name: 'TomHuda' });

    assert.equal(person.get('isNew'), true, 'createRecord should put records into the new state');

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'TomHuda'
        }
      }
    });

    assert.equal(person.get('isNew'), false, 'push should put records into the loaded state');
  });
});

testInDebug('A subclass of DS.Model throws an error when calling create() directly', function(assert) {
  assert.throws(() => {
    Person.create();
  }, /You should not call `create` on a model/, 'Throws an error when calling create() on model');
});

test('toJSON looks up the JSONSerializer using the store instead of using JSONSerializer.create', function(assert) {
  const Person = DS.Model.extend({
    posts: DS.hasMany('post', { async: false })
  });
  const Post = DS.Model.extend({
    person: DS.belongsTo('person', { async: false })
  });

  let env = setupStore({
    person: Person,
    post: Post
  });
  let { store } = env;

  // Loading the person without explicitly
  // loading its relationships seems to trigger the
  // original bug where `this.store` was not
  // present on the serializer due to using .create
  // instead of `store.serializerFor`.
  let person = run(() => {
    return store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
  });

  let errorThrown = false;
  let json;
  try {
    json = run(person, 'toJSON');
  } catch (e) {
    errorThrown = true;
  }

  assert.ok(!errorThrown, 'error not thrown due to missing store');
  assert.deepEqual(json, { data: { type: 'people' }});
});

test('internalModel is ready by `init`', function(assert) {
  assert.expect(2);
  let nameDidChange = 0;

  const Person = DS.Model.extend({
    name: DS.attr('string'),

    init() {
      this._super(...arguments);
      this.set('name', 'my-name-set-in-init');
    },

    nameDidChange: Ember.observer('name', () => nameDidChange++)
  });

  let { store } = setupStore({ person: Person });

  assert.equal(nameDidChange, 0, 'observer should not trigger on create');
  let person = run(() => store.createRecord('person'));
  assert.equal(person.get('name'), 'my-name-set-in-init');
});

test('accessing attributes in the initializer should not throw an error', function(assert) {
  assert.expect(1);

  const Person = DS.Model.extend({
    name: DS.attr('string'),

    init() {
      this._super(...arguments);
      assert.ok(!this.get('name'));
    }
  });

  let { store } = setupStore({
    person: Person
  });

  run(() => store.createRecord('person'));
});

test('setting the id after model creation should correctly update the id', function(assert) {
  assert.expect(2);

  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let { store } = setupStore({
    person: Person
  });

  run(() => {
    let person = store.createRecord('person');

    assert.equal(person.get('id'), null, 'initial created model id should be null');

    person.set('id', 'john');

    assert.equal(person.get('id'), 'john', 'new id should be correctly set.');
  });
});

test('updating the id with store.updateId should correctly when the id property is watched', function(assert) {
  assert.expect(2);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    idComputed: Ember.computed('id', function() {})
  });

  let { store } = setupStore({
    person: Person
  });

  run(() => {
    let person = store.createRecord('person');
    person.get('idComputed');

    assert.equal(person.get('id'), null, 'initial created model id should be null');

    store.updateId(person._internalModel, { id: 'john' });

    assert.equal(person.get('id'), 'john', 'new id should be correctly set.');
  });
});

test('accessing the model id without the get function should work when id is watched', function(assert) {
  assert.expect(2);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    idComputed: Ember.computed('id', function() {})
  });

  let { store } = setupStore({
    person: Person
  });

  run(() => {
    let person = store.createRecord('person');
    person.get('idComputed');

    assert.equal(person.get('id'), null, 'initial created model id should be null');

    store.updateId(person._internalModel, { id: 'john' });

    assert.equal(person.id, 'john', 'new id should be correctly set.');
  });
});
