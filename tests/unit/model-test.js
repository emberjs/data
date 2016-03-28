import {createStore} from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import QUnit, {module, test} from 'qunit';
import DS from 'ember-data';
import isEnabled from 'ember-data/-private/features';
import { parseDate } from "ember-data/-private/ext/date";

const AssertionPrototype = QUnit.assert;

var get = Ember.get;
var set = Ember.set;
var run = Ember.run;

var Person, store, env;

module("unit/model - DS.Model", {
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
    run(function() {
      store.destroy();
    });
    Person = null;
    store = null;
  }
});

test("can have a property set on it", function(assert) {
  var record;
  run(function() {
    record = store.createRecord('person');
    set(record, 'name', 'bar');
  });

  assert.equal(get(record, 'name'), 'bar', "property was set on the record");
});

test("setting a property on a record that has not changed does not cause it to become dirty", function(assert) {
  assert.expect(2);
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
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

    store.findRecord('person', 1).then(function(person) {
      assert.equal(person.get('hasDirtyAttributes'), false, "precond - person record should not be dirty");

      person.set('name', "Peter");
      person.set('isDrugAddict', true);

      assert.equal(person.get('hasDirtyAttributes'), false, "record does not become dirty after setting property to old value");
    });
  });
});

test("resetting a property on a record cause it to become clean again", function(assert) {
  assert.expect(3);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
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
    store.findRecord('person', 1).then(function(person) {
      assert.equal(person.get('hasDirtyAttributes'), false, "precond - person record should not be dirty");
      person.set('isDrugAddict', false);
      assert.equal(person.get('hasDirtyAttributes'), true, "record becomes dirty after setting property to a new value");
      person.set('isDrugAddict', true);
      assert.equal(person.get('hasDirtyAttributes'), false, "record becomes clean after resetting property to the old value");
    });
  });
});

test("a record becomes clean again only if all changed properties are reset", function(assert) {
  assert.expect(5);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
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
    store.findRecord('person', 1).then(function(person) {
      assert.equal(person.get('hasDirtyAttributes'), false, "precond - person record should not be dirty");
      person.set('isDrugAddict', false);
      assert.equal(person.get('hasDirtyAttributes'), true, "record becomes dirty after setting one property to a new value");
      person.set('name', 'Mark');
      assert.equal(person.get('hasDirtyAttributes'), true, "record stays dirty after setting another property to a new value");
      person.set('isDrugAddict', true);
      assert.equal(person.get('hasDirtyAttributes'), true, "record stays dirty after resetting only one property to the old value");
      person.set('name', 'Peter');
      assert.equal(person.get('hasDirtyAttributes'), false, "record becomes clean after resetting both properties to the old value");
    });
  });
});

test("a record reports its unique id via the `id` property", function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    store.findRecord('person', 1).then(function(record) {
      assert.equal(get(record, 'id'), 1, "reports id as id by default");
    });
  });
});

test("a record's id is included in its toString representation", function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    store.findRecord('person', 1).then(function(record) {
      assert.equal(record.toString(), '<(subclass of DS.Model):'+Ember.guidFor(record)+':1>', "reports id in toString");
    });
  });
});

testInDebug("trying to set an `id` attribute should raise", function(assert) {
  Person = DS.Model.extend({
    id: DS.attr('number'),
    name: DS.attr('string')
  });

  var store = createStore({
    person: Person
  });

  assert.expectAssertion(function() {
    run(function() {
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

test("a collision of a record's id with object function's name", function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  var hasWatchMethod = Object.prototype.watch;
  try {
    if (!hasWatchMethod) {
      Object.prototype.watch = function() {};
    }
    run(function() {
      store.push({
        data: {
          type: 'person',
          id: 'watch'
        }
      });

      store.findRecord('person', 'watch').then(function(record) {
        assert.equal(get(record, 'id'), 'watch', "record is successfully created and could be found by its id");
      });
    });
  } finally {
    if (!hasWatchMethod) {
      delete Object.prototype.watch;
    }
  }
});

/*
test("it should use `_internalModel` and not `internalModel` to store its internalModel", function() {
  expect(1);

  run(function() {
    store.push('person', { id: 1 });

    store.findRecord(Person, 1).then(function(record) {
      equal(record.get('_internalModel'), undefined, "doesn't shadow internalModel key");
    });
  });
});
*/

test("it should cache attributes", function(assert) {
  assert.expect(2);

  var Post = DS.Model.extend({
    updatedAt: DS.attr('string')
  });

  var store = createStore({
    post: Post
  });

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  run(function() {
    store.push({
      data: {
        type: 'post',
        id: '1'
      }
    });
    store.findRecord('post', 1).then(function(record) {
      run(function() {
        record.set('updatedAt', date);
      });
      assert.deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
      assert.strictEqual(get(record, 'updatedAt'), get(record, 'updatedAt'), "second get still returns the same object");
    }).finally(function() {
      run(store, 'destroy');
    });
  });
});

test("changedAttributes() return correct values", function(assert) {
  assert.expect(4);

  var Mascot = DS.Model.extend({
    name: DS.attr('string'),
    likes: DS.attr('string'),
    isMascot: DS.attr('boolean')
  });

  var store = createStore({
    mascot: Mascot
  });

  var mascot;


  run(function() {
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
    mascot = store.peekRecord('mascot', 1);
  });

  assert.equal(Object.keys(mascot.changedAttributes()).length, 0, 'there are no initial changes');
  run(function() {
    mascot.set('name', 'Tomster');   // new value
    mascot.set('likes', 'Ember.js'); // changed value
    mascot.set('isMascot', true);    // same value
  });
  var changedAttributes = mascot.changedAttributes();
  assert.deepEqual(changedAttributes.name, [undefined, 'Tomster']);
  assert.deepEqual(changedAttributes.likes, ['JavaScript', 'Ember.js']);

  run(function() {
    mascot.rollbackAttributes();
  });
  assert.equal(Object.keys(mascot.changedAttributes()).length, 0, 'after rollback attributes there are no changes');
});

function toObj(obj) {
  // https://github.com/jquery/qunit/issues/851
  var result = Object.create(null);
  for (var key in obj) {
    result[key] = obj[key];
  }
  return result;
}

test("changedAttributes() works while the record is being saved", function(assert) {
  assert.expect(1);
  var cat;
  var adapter = DS.Adapter.extend({
    createRecord(store, model, snapshot) {
      assert.deepEqual(toObj(cat.changedAttributes()), {
        name: [undefined, 'Argon'],
        likes: [undefined, 'Cheese'] });
      return {};
    }
  });
  var Mascot = DS.Model.extend({
    name: DS.attr('string'),
    likes: DS.attr('string'),
    isMascot: DS.attr('boolean')
  });

  var store = createStore({
    mascot: Mascot,
    adapter: adapter
  });

  run(function() {
    cat = store.createRecord('mascot');
    cat.setProperties({ name: 'Argon', likes: 'Cheese' });
    cat.save();
  });
});

test("changedAttributes() works while the record is being updated", function(assert) {
  assert.expect(1);
  var cat;
  var adapter = DS.Adapter.extend({
    updateRecord(store, model, snapshot) {
      assert.deepEqual(toObj(cat.changedAttributes()), { name: ['Argon', 'Helia'], likes: ['Cheese', 'Mussels'] });
      return { id: '1', type: 'mascot' };
    }
  });
  var Mascot = DS.Model.extend({
    name: DS.attr('string'),
    likes: DS.attr('string'),
    isMascot: DS.attr('boolean')
  });

  var store = createStore({
    mascot: Mascot,
    adapter: adapter
  });

  run(function() {
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
    cat.setProperties({ name: 'Helia', likes: 'Mussels' });
    cat.save();
  });
});

test("a DS.Model does not require an attribute type", function(assert) {
  var Tag = DS.Model.extend({
    name: DS.attr()
  });

  var store = createStore({
    tag: Tag
  });

  var tag;

  run(function() {
    tag = store.createRecord('tag', { name: "test" });
  });

  assert.equal(get(tag, 'name'), "test", "the value is persisted");
});

test("a DS.Model can have a defaultValue without an attribute type", function(assert) {
  var Tag = DS.Model.extend({
    name: DS.attr({ defaultValue: "unknown" })
  });

  var store = createStore({
    tag: Tag
  });
  var tag;

  run(function() {
    tag = store.createRecord('tag');
  });

  assert.equal(get(tag, 'name'), "unknown", "the default value is found");
});

testInDebug("Calling attr() throws a warning", function(assert) {
  assert.expect(1);

  run(function() {
    var person = store.createRecord('person', { id: 1, name: 'TomHuda' });

    assert.throws(function() {
      person.attr();
    }, /The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected/, "attr() throws a warning");
  });
});

if (!isEnabled('ds-references')) {
  testInDebug("Calling belongsTo() throws a warning", function(assert) {
    assert.expect(1);

    run(function() {
      var person = store.createRecord('person', { id: 1, name: 'TomHuda' });

      assert.throws(function() {
        person.belongsTo();
      }, /The `belongsTo` method is not available on DS.Model, a DS.Snapshot was probably expected/, "belongsTo() throws a warning");
    });
  });

  testInDebug("Calling hasMany() throws a warning", function(assert) {
    assert.expect(1);

    run(function() {
      var person = store.createRecord('person', { id: 1, name: 'TomHuda' });

      assert.throws(function() {
        person.hasMany();
      }, /The `hasMany` method is not available on DS.Model, a DS.Snapshot was probably expected/, "hasMany() throws a warning");
    });
  });
}

test("supports pushedData in root.deleted.uncommitted", function(assert) {
  var record;
  var hash = {
    data: {
      type: 'person',
      id: '1'
    }
  };
  run(function() {
    record = store.push(hash);
    record.deleteRecord();
    store.push(hash);
    assert.equal(get(record, 'currentState.stateName'), 'root.deleted.uncommitted',
      'record accepts pushedData is in root.deleted.uncommitted state');
  });
});

test("currentState is accessible when the record is created", function(assert) {
  var record;
  var hash = {
    data: {
      type: 'person',
      id: '1'
    }
  };
  run(function() {
    record = store.push(hash);
    assert.equal(get(record, 'currentState.stateName'), 'root.loaded.saved',
          'records pushed into the store start in the loaded state');
  });
});

module("unit/model - DS.Model updating", {
  beforeEach() {
    Person = DS.Model.extend({ name: DS.attr('string') });
    env = setupStore({
      person: Person
    });
    store = env.store;
    run(function() {
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
  },
  afterEach() {
    run(function() {
      store.destroy();
      Person = null;
      store = null;
    });
  }
});

test("a DS.Model can update its attributes", function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.findRecord('person', 2).then(function(person) {
      set(person, 'name', "Brohuda Katz");
      assert.equal(get(person, 'name'), "Brohuda Katz", "setting took hold");
    });
  });
});

test("a DS.Model can have a defaultValue", function(assert) {
  var Tag = DS.Model.extend({
    name: DS.attr('string', { defaultValue: "unknown" })
  });
  var tag;

  var store = createStore({
    tag: Tag
  });

  run(function() {
    tag = store.createRecord('tag');
  });

  assert.equal(get(tag, 'name'), "unknown", "the default value is found");

  run(function() {
    set(tag, 'name', null);
  });

  assert.equal(get(tag, 'name'), null, "null doesn't shadow defaultValue");
});

test("a DS.model can define 'setUnknownProperty'", function(assert) {
  var tag;
  var Tag = DS.Model.extend({
    name: DS.attr("string"),

    setUnknownProperty(key, value) {
      if (key === "title") {
        this.set("name", value);
      }
    }
  });

  var store = createStore({
    tag: Tag
  });

  run(function() {
    tag = store.createRecord('tag', { name: "old" });
    set(tag, "title", "new");
  });

  assert.equal(get(tag, "name"), "new", "setUnknownProperty not triggered");
});

test("a defaultValue for an attribute can be a function", function(assert) {
  var Tag = DS.Model.extend({
    createdAt: DS.attr('string', {
      defaultValue() {
        return "le default value";
      }
    })
  });
  var tag;

  var store = createStore({
    tag: Tag
  });

  run(function() {
    tag = store.createRecord('tag');
  });
  assert.equal(get(tag, 'createdAt'), "le default value", "the defaultValue function is evaluated");
});

test("a defaultValue function gets the record, options, and key", function(assert) {
  assert.expect(2);

  var Tag = DS.Model.extend({
    createdAt: DS.attr('string', {
      defaultValue(record, options, key) {
        assert.deepEqual(record, tag, "the record is passed in properly");
        assert.equal(key, 'createdAt', "the attribute being defaulted is passed in properly");
        return "le default value";
      }
    })
  });

  var store = createStore({
    tag: Tag
  });
  var tag;

  run(function() {
    tag = store.createRecord('tag');
  });

  get(tag, 'createdAt');
});

testInDebug("a complex object defaultValue is deprecated ", function(assert) {
  var Tag = DS.Model.extend({
    tagInfo: DS.attr({ defaultValue: [] })
  });
  var tag;

  var store = createStore({
    tag: Tag
  });

  run(function() {
    tag = store.createRecord('tag');
  });
  assert.expectDeprecation(function() {
    get(tag, 'tagInfo');
  }, /Non primitive defaultValues are deprecated/);
});

testInDebug("a null defaultValue is not deprecated", function(assert) {
  var Tag = DS.Model.extend({
    tagInfo: DS.attr({ defaultValue: null })
  });
  var tag;

  var store = createStore({
    tag: Tag
  });

  run(function() {
    tag = store.createRecord('tag');
  });
  assert.expectNoDeprecation();
  assert.equal(get(tag, 'tagInfo'), null);
});

test("setting a property to undefined on a newly created record should not impact the current state", function(assert) {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({
    tag: Tag
  });

  var tag;

  run(function() {
    tag = store.createRecord('tag');
    set(tag, 'name', 'testing');
    set(tag, 'name', undefined);
  });

  assert.equal(get(tag, 'currentState.stateName'), "root.loaded.created.uncommitted");

  run(function() {
    tag = store.createRecord('tag', { name: undefined });
  });

  assert.equal(get(tag, 'currentState.stateName'), "root.loaded.created.uncommitted");
});

// NOTE: this is a 'backdoor' test that ensures internal consistency, and should be
// thrown out if/when the current `_attributes` hash logic is removed.
test("setting a property back to its original value removes the property from the `_attributes` hash", function(assert) {
  assert.expect(3);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      assert.equal(person._internalModel._attributes.name, undefined, "the `_attributes` hash is clean");

      set(person, 'name', "Niceguy Dale");

      assert.equal(person._internalModel._attributes.name, "Niceguy Dale", "the `_attributes` hash contains the changed value");

      set(person, 'name', "Scumbag Dale");

      assert.equal(person._internalModel._attributes.name, undefined, "the `_attributes` hash is reset");
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
    run(function() {
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
  },
  afterEach() {
    run(function() {
      store.destroy();
      Person = null;
      store = null;
    });
  }
});

test("can ask if record with a given id is loaded", function(assert) {
  assert.equal(store.recordIsLoaded('person', 1), true, 'should have person with id 1');
  assert.equal(store.recordIsLoaded('person', 1), true, 'should have person with id 1');
  assert.equal(store.recordIsLoaded('person', 4), false, 'should not have person with id 4');
  assert.equal(store.recordIsLoaded('person', 4), false, 'should not have person with id 4');
});

test("a listener can be added to a record", function(assert) {
  var count = 0;
  var F = function() { count++; };
  var record;

  run(function() {
    record = store.createRecord('person');
  });

  record.on('event!', F);
  run(function() {
    record.trigger('event!');
  });

  assert.equal(count, 1, "the event was triggered");

  run(function() {
    record.trigger('event!');
  });

  assert.equal(count, 2, "the event was triggered");
});

test("when an event is triggered on a record the method with the same name is invoked with arguments", function(assert) {
  var count = 0;
  var F = function() { count++; };
  var record;

  run(function() {
    record = store.createRecord('person');
  });

  record.eventNamedMethod = F;

  run(function() {
    record.trigger('eventNamedMethod');
  });

  assert.equal(count, 1, "the corresponding method was called");
});

test("when a method is invoked from an event with the same name the arguments are passed through", function(assert) {
  var eventMethodArgs = null;
  var F = function() {
    eventMethodArgs = arguments;
  };
  var record;

  run(function() {
    record = store.createRecord('person');
  });

  record.eventThatTriggersMethod = F;

  run(function() {
    record.trigger('eventThatTriggersMethod', 1, 2);
  });

  assert.equal(eventMethodArgs[0], 1);
  assert.equal(eventMethodArgs[1], 2);
});

AssertionPrototype.converts = function converts(type, provided, expected) {
  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  var registry, container;
  if (Ember.Registry) {
    registry = new Ember.Registry();
    container = registry.container();
  } else {
    container = new Ember.Container();
    registry = container;
  }
  var testStore = createStore({ model: Model });

  run(() => {
    testStore.push(testStore.normalize('model', { id: 1, name: provided }));
    testStore.push(testStore.normalize('model', { id: 2 }));
    var record = testStore.peekRecord('model', 1);
    this.deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
  });

  // See: Github issue #421
  // record = testStore.find(Model, 2);
  // set(record, 'name', provided);
  // deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

AssertionPrototype.convertsFromServer = function convertsFromServer(type, provided, expected) {
  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  var registry, container;
  if (Ember.Registry) {
    registry = new Ember.Registry();
    container = registry.container();
  } else {
    container = new Ember.Container();
    registry = container;
  }
  var testStore = createStore({
    model: Model,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord: () => false
    })
  });

  run(() => {
    testStore.push(testStore.normalize('model', { id: "1", name: provided }));
    testStore.findRecord('model', 1).then((record) => {
      this.deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
    });
  });
};

AssertionPrototype.convertsWhenSet = function(type, provided, expected) {
  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  var testStore = createStore({
    model: Model,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord: () => false
    })
  });

  run(() => {
    testStore.push({
      data: {
        type: 'model',
        id: '2'
      }
    });
    testStore.findRecord('model', 2).then((record) => {
      set(record, 'name', provided);
      this.deepEqual(record.serialize().name, expected, type + " saves " + provided + " as " + expected);
    });
  });
};

test("a DS.Model can describe String attributes", function(assert) {
  assert.expect(6);

  assert.converts('string', "Scumbag Tom", "Scumbag Tom");
  assert.converts('string', 1, "1");
  assert.converts('string', "", "");
  assert.converts('string', null, null);
  assert.converts('string', undefined, null);
  assert.convertsFromServer('string', undefined, null);
});

test("a DS.Model can describe Number attributes", function(assert) {
  assert.expect(9);

  assert.converts('number', "1", 1);
  assert.converts('number', "0", 0);
  assert.converts('number', 1, 1);
  assert.converts('number', 0, 0);
  assert.converts('number', "", null);
  assert.converts('number', null, null);
  assert.converts('number', undefined, null);
  assert.converts('number', true, 1);
  assert.converts('number', false, 0);
});

test("a DS.Model can describe Boolean attributes", function(assert) {
  assert.expect(7);

  assert.converts('boolean', "1", true);
  assert.converts('boolean', "", false);
  assert.converts('boolean', 1, true);
  assert.converts('boolean', 0, false);
  assert.converts('boolean', null, false);
  assert.converts('boolean', true, true);
  assert.converts('boolean', false, false);
});

test("a DS.Model can describe Date attributes", function(assert) {
  assert.expect(5);

  assert.converts('date', null, null);
  assert.converts('date', undefined, undefined);

  var dateString = "2011-12-31T00:08:16.000Z";
  var date = new Date(parseDate(dateString));


  var Person = DS.Model.extend({
    updatedAt: DS.attr('date')
  });

  var store = createStore({
    person: Person,
    adapter: DS.Adapter.extend({
      shouldBackgroundReloadRecord: () => false
    })
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    store.findRecord('person', 1).then(function(record) {
      run(function() {
        record.set('updatedAt', date);
      });
      assert.deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
    });
  });
  assert.convertsFromServer('date', dateString, date);
  assert.convertsWhenSet('date', date, dateString);
});

testInDebug("don't allow setting", function(assert) {
  var Person = DS.Model.extend();
  var record;

  var store = createStore({
    person: Person
  });

  run(function() {
    record = store.createRecord('person');
  });

  assert.throws(function() {
    run(function() {
      record.set('isLoaded', true);
    });
  }, "raised error when trying to set an unsettable record");
});

test("ensure model exits loading state, materializes data and fulfills promise only after data is available", function(assert) {
  assert.expect(2);

  var store = createStore({
    adapter: DS.Adapter.extend({
      findRecord(store, type, id, snapshot) {
        return Ember.RSVP.resolve({ id: 1, name: "John" });
      }
    }),
    person: Person
  });

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      assert.equal(get(person, 'currentState.stateName'), 'root.loaded.saved', 'model is in loaded state');
      assert.equal(get(person, 'isLoaded'), true, 'model is loaded');
    });
  });
});

test("A DS.Model can be JSONified", function(assert) {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({ person: Person });
  var record;

  run(function() {
    record = store.createRecord('person', { name: "TomHuda" });
  });
  assert.deepEqual(record.toJSON(), { name: "TomHuda" });
});

testInDebug("A subclass of DS.Model can not use the `data` property", function(assert) {
  var Person = DS.Model.extend({
    data: DS.attr('string'),
    name: DS.attr('string')
  });

  var store = createStore({ person: Person });

  assert.expectAssertion(function() {
    run(function() {
      store.createRecord('person', { name: "TomHuda" });
    });
  }, /`data` is a reserved property name on DS.Model objects/);
});

testInDebug("A subclass of DS.Model can not use the `store` property", function(assert) {
  var Retailer = DS.Model.extend({
    store: DS.attr(),
    name: DS.attr()
  });

  var store = createStore({ retailer: Retailer });

  assert.expectAssertion(function() {
    run(function() {
      store.createRecord('retailer', { name: "Buy n Large" });
    });
  }, /`store` is a reserved property name on DS.Model objects/);
});

testInDebug("A subclass of DS.Model can not use reserved properties", function(assert) {
  assert.expect(3);
  [
    'currentState', 'data', 'store'
  ].forEach(function(reservedProperty) {
    var invalidExtendObject = {};
    invalidExtendObject[reservedProperty] = DS.attr();
    var Post = DS.Model.extend(invalidExtendObject);

    var store = createStore({ post: Post });

    assert.expectAssertion(function() {
      run(function() {
        store.createRecord('post', {});
      });
    }, /is a reserved property name on DS.Model objects/);
  });
});

test("Pushing a record into the store should transition it to the loaded state", function(assert) {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({ person: Person });

  run(function() {
    var person = store.createRecord('person', { id: 1, name: 'TomHuda' });
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

testInDebug("A subclass of DS.Model throws an error when calling create() directly", function(assert) {
  assert.throws(function() {
    Person.create();
  }, /You should not call `create` on a model/, "Throws an error when calling create() on model");
});

test('toJSON looks up the JSONSerializer using the store instead of using JSONSerializer.create', function(assert) {
  var Person = DS.Model.extend({
    posts: DS.hasMany('post', { async: false })
  });
  var Post = DS.Model.extend({
    person: DS.belongsTo('person', { async: false })
  });

  var env = setupStore({
    person: Person,
    post: Post
  });
  var store = env.store;

  var person, json;
  // Loading the person without explicitly
  // loading its relationships seems to trigger the
  // original bug where `this.store` was not
  // present on the serializer due to using .create
  // instead of `store.serializerFor`.
  run(() => {
    person = store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
  });
  var errorThrown = false;
  try {
    json = run(person, 'toJSON');
  } catch (e) {
    errorThrown = true;
  }

  assert.ok(!errorThrown, 'error not thrown due to missing store');
  assert.deepEqual(json, {});
});


test('accessing attributes in the initializer should not throw an error', function(assert) {
  assert.expect(1);
  var Person = DS.Model.extend({
    name: DS.attr('string'),

    init() {
      this._super.apply(this, arguments);
      assert.ok(!this.get('name'));
    }
  });

  var env = setupStore({
    person: Person
  });
  var store = env.store;

  run(() => store.createRecord('person'));
});

test('setting the id after model creation should correctly update the id', function(assert) {
  assert.expect(2);
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var env = setupStore({
    person: Person
  });
  var store = env.store;

  run(function () {
    var person = store.createRecord('person');

    assert.equal(person.get('id'), null, 'initial created model id should be null');

    person.set('id', 'john');

    assert.equal(person.get('id'), 'john', 'new id should be correctly set.');
  });
});

test('updating the id with store.updateId should correctly when the id property is watched', function(assert) {
  assert.expect(2);
  var Person = DS.Model.extend({
    name: DS.attr('string'),
    idComputed: Ember.computed('id', function() {})
  });

  var env = setupStore({
    person: Person
  });
  var store = env.store;
  run(function () {
    var person = store.createRecord('person');
    person.get('idComputed');

    assert.equal(person.get('id'), null, 'initial created model id should be null');

    store.updateId(person._internalModel, { id: 'john' });

    assert.equal(person.get('id'), 'john', 'new id should be correctly set.');
  });
});

test('accessing the model id without the get function should work when id is watched', function(assert) {
  assert.expect(2);
  var Person = DS.Model.extend({
    name: DS.attr('string'),
    idComputed: Ember.computed('id', function() {})
  });

  var env = setupStore({
    person: Person
  });
  var store = env.store;
  run(function () {
    var person = store.createRecord('person');
    person.get('idComputed');

    assert.equal(person.get('id'), null, 'initial created model id should be null');

    store.updateId(person._internalModel, { id: 'john' });

    assert.equal(person.id, 'john', 'new id should be correctly set.');
  });
});
