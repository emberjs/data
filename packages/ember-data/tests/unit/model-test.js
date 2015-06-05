var get = Ember.get;
var set = Ember.set;
var run = Ember.run;

var Person, store, array, env;

module("unit/model - DS.Model", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr('string'),
      isDrugAddict: DS.attr('boolean')
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  teardown: function() {
    run(function() {
      store.destroy();
    });
    Person = null;
    store = null;
  }
});

test("can have a property set on it", function() {
  var record;
  run(function() {
    record = store.createRecord('person');
    set(record, 'name', 'bar');
  });

  equal(get(record, 'name'), 'bar', "property was set on the record");
});

test("setting a property on a record that has not changed does not cause it to become dirty", function() {
  expect(2);

  run(function() {
    store.push('person', { id: 1, name: "Peter", isDrugAddict: true });
    store.find('person', 1).then(function(person) {
      equal(person.get('isDirty'), false, "precond - person record should not be dirty");

      person.set('name', "Peter");
      person.set('isDrugAddict', true);

      equal(person.get('isDirty'), false, "record does not become dirty after setting property to old value");
    });
  });
});

test("resetting a property on a record cause it to become clean again", function() {
  expect(3);

  run(function() {
    store.push('person', { id: 1, name: "Peter", isDrugAddict: true });
    store.find('person', 1).then(function(person) {
      equal(person.get('isDirty'), false, "precond - person record should not be dirty");
      person.set('isDrugAddict', false);
      equal(person.get('isDirty'), true, "record becomes dirty after setting property to a new value");
      person.set('isDrugAddict', true);
      equal(person.get('isDirty'), false, "record becomes clean after resetting property to the old value");
    });
  });
});

test("a record becomes clean again only if all changed properties are reset", function() {
  expect(5);

  run(function() {
    store.push('person', { id: 1, name: "Peter", isDrugAddict: true });
    store.find('person', 1).then(function(person) {
      equal(person.get('isDirty'), false, "precond - person record should not be dirty");
      person.set('isDrugAddict', false);
      equal(person.get('isDirty'), true, "record becomes dirty after setting one property to a new value");
      person.set('name', 'Mark');
      equal(person.get('isDirty'), true, "record stays dirty after setting another property to a new value");
      person.set('isDrugAddict', true);
      equal(person.get('isDirty'), true, "record stays dirty after resetting only one property to the old value");
      person.set('name', 'Peter');
      equal(person.get('isDirty'), false, "record becomes clean after resetting both properties to the old value");
    });
  });
});

test("a record reports its unique id via the `id` property", function() {
  expect(1);

  run(function() {
    store.push('person', { id: 1 });
    store.find('person', 1).then(function(record) {
      equal(get(record, 'id'), 1, "reports id as id by default");
    });
  });
});

test("a record's id is included in its toString representation", function() {
  expect(1);

  run(function() {
    store.push('person', { id: 1 });
    store.find('person', 1).then(function(record) {
      equal(record.toString(), '<(subclass of DS.Model):'+Ember.guidFor(record)+':1>', "reports id in toString");
    });
  });
});

test("trying to set an `id` attribute should raise", function() {
  Person = DS.Model.extend({
    id: DS.attr('number'),
    name: DS.attr('string')
  });

  var store = createStore({
    person: Person
  });

  expectAssertion(function() {
    run(function() {
      store.push('person', { id: 1, name: "Scumdale" });
      store.find('person', 1);
    });
  }, /You may not set `id`/);
});

test("a collision of a record's id with object function's name", function() {
  expect(1);

  var hasWatchMethod = Object.prototype.watch;
  try {
    if (!hasWatchMethod) {
      Object.prototype.watch = function() {};
    }
    run(function() {
      store.push('person', { id: 'watch' });
      store.find('person', 'watch').then(function(record) {
        equal(get(record, 'id'), 'watch', "record is successfully created and could be found by its id");
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

    store.find(Person, 1).then(function(record) {
      equal(record.get('_internalModel'), undefined, "doesn't shadow internalModel key");
    });
  });
});
*/

test("it should cache attributes", function() {
  expect(2);

  var Post = DS.Model.extend({
    updatedAt: DS.attr('string')
  });

  var store = createStore({
    post: Post
  });

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  run(function() {
    store.push('post', { id: 1 });
    store.find('post', 1).then(function(record) {
      run(function() {
        record.set('updatedAt', date);
      });
      deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
      strictEqual(get(record, 'updatedAt'), get(record, 'updatedAt'), "second get still returns the same object");
    }).finally(function() {
      run(store, 'destroy');
    });
  });

});

test("changedAttributes() return correct values", function() {
  expect(3);

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
    mascot = store.push('mascot', { id: 1, likes: 'JavaScript', isMascot: true });
  });

  deepEqual({}, mascot.changedAttributes(), 'there are no initial changes');
  run(function() {
    mascot.set('name', 'Tomster');   // new value
    mascot.set('likes', 'Ember.js'); // changed value
    mascot.set('isMascot', true);    // same value
  });
  deepEqual({ name: [undefined, 'Tomster'], likes: ['JavaScript', 'Ember.js'] }, mascot.changedAttributes(), 'attributes has changed');

  run(function() {
    mascot.rollback();
  });
  deepEqual({}, mascot.changedAttributes(), 'after rollback there are no changes');
});

test("a DS.Model does not require an attribute type", function() {
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

  equal(get(tag, 'name'), "test", "the value is persisted");
});

test("a DS.Model can have a defaultValue without an attribute type", function() {
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

  equal(get(tag, 'name'), "unknown", "the default value is found");
});

test("Calling attr(), belongsTo() or hasMany() throws a warning", function() {
  expect(3);

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({
    person: Person
  });

  run(function() {
    var person = store.createRecord('person', { id: 1, name: 'TomHuda' });

    throws(function() {
      person.attr();
    }, /The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected/, "attr() throws a warning");

    throws(function() {
      person.belongsTo();
    }, /The `belongsTo` method is not available on DS.Model, a DS.Snapshot was probably expected/, "belongTo() throws a warning");

    throws(function() {
      person.hasMany();
    }, /The `hasMany` method is not available on DS.Model, a DS.Snapshot was probably expected/, "hasMany() throws a warning");
  });
});

test("supports pushedData in root.deleted.uncommitted", function() {
  var record;
  var hash = { id: 1 };
  run(function() {
    record = store.push('person', hash);
    record.deleteRecord();
    store.push('person', hash);
    equal(get(record, 'currentState.stateName'), 'root.deleted.uncommitted',
      'record accepts pushedData is in root.deleted.uncommitted state');
  });
});

test("accessing the `container` property throws an error", function() {
  run(function() {
    var record = store.createRecord('person');

    /* jshint expr:true */
    throws(function() {
      record.container;
    }, /Model instances no longer have access to a container./, "Throws an error when accessing `container` on a model");
  });
});

module("unit/model - DS.Model updating", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });
    env = setupStore({
      person: Person
    });
    store = env.store;
    run(function() {
      store.pushMany('person', array);
    });
  },
  teardown: function() {
    run(function() {
      store.destroy();
      Person = null;
      store = null;
      array = null;
    });
  }
});

test("a DS.Model can update its attributes", function() {
  expect(1);

  run(function() {
    store.find('person', 2).then(function(person) {
      set(person, 'name', "Brohuda Katz");
      equal(get(person, 'name'), "Brohuda Katz", "setting took hold");
    });
  });
});

test("a DS.Model can have a defaultValue", function() {
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

  equal(get(tag, 'name'), "unknown", "the default value is found");

  run(function() {
    set(tag, 'name', null);
  });

  equal(get(tag, 'name'), null, "null doesn't shadow defaultValue");
});

test("a DS.model can define 'setUnknownProperty'", function() {
  var tag;
  var Tag = DS.Model.extend({
    name: DS.attr("string"),

    setUnknownProperty: function(key, value) {
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

  equal(get(tag, "name"), "new", "setUnknownProperty not triggered");
});

test("a defaultValue for an attribute can be a function", function() {
  var Tag = DS.Model.extend({
    createdAt: DS.attr('string', {
      defaultValue: function() {
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
  equal(get(tag, 'createdAt'), "le default value", "the defaultValue function is evaluated");
});

test("a defaultValue function gets the record, options, and key", function() {
  expect(2);

  var Tag = DS.Model.extend({
    createdAt: DS.attr('string', {
      defaultValue: function(record, options, key) {
        deepEqual(record, tag, "the record is passed in properly");
        equal(key, 'createdAt', "the attribute being defaulted is passed in properly");
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

test("setting a property to undefined on a newly created record should not impact the current state", function() {
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

  equal(get(tag, 'currentState.stateName'), "root.loaded.created.uncommitted");

  run(function() {
    tag = store.createRecord('tag', { name: undefined });
  });

  equal(get(tag, 'currentState.stateName'), "root.loaded.created.uncommitted");
});

// NOTE: this is a 'backdoor' test that ensures internal consistency, and should be
// thrown out if/when the current `_attributes` hash logic is removed.
test("setting a property back to its original value removes the property from the `_attributes` hash", function() {
  expect(3);

  run(function() {
    store.find('person', 1).then(function(person) {
      equal(person._internalModel._attributes.name, undefined, "the `_attributes` hash is clean");

      set(person, 'name', "Niceguy Dale");

      equal(person._internalModel._attributes.name, "Niceguy Dale", "the `_attributes` hash contains the changed value");

      set(person, 'name', "Scumbag Dale");

      equal(person._internalModel._attributes.name, undefined, "the `_attributes` hash is reset");
    });
  });
});

module("unit/model - with a simple Person model", {
  setup: function() {
    array = [
      { id: 1, name: "Scumbag Dale" },
      { id: 2, name: "Scumbag Katz" },
      { id: 3, name: "Scumbag Bryn" }
    ];
    Person = DS.Model.extend({
      name: DS.attr('string')
    });
    store = createStore({
      person: Person
    });
    run(function() {
      store.pushMany('person', array);
    });
  },
  teardown: function() {
    run(function() {
      store.destroy();
      Person = null;
      store = null;
      array = null;
    });
  }
});

test("can ask if record with a given id is loaded", function() {
  equal(store.recordIsLoaded('person', 1), true, 'should have person with id 1');
  equal(store.recordIsLoaded('person', 1), true, 'should have person with id 1');
  equal(store.recordIsLoaded('person', 4), false, 'should not have person with id 4');
  equal(store.recordIsLoaded('person', 4), false, 'should not have person with id 4');
});

test("a listener can be added to a record", function() {
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

  equal(count, 1, "the event was triggered");

  run(function() {
    record.trigger('event!');
  });

  equal(count, 2, "the event was triggered");
});

test("when an event is triggered on a record the method with the same name is invoked with arguments", function() {
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

  equal(count, 1, "the corresponding method was called");
});

test("when a method is invoked from an event with the same name the arguments are passed through", function() {
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

  equal(eventMethodArgs[0], 1);
  equal(eventMethodArgs[1], 2);
});

var converts = function(type, provided, expected) {
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
  var serializer = DS.JSONSerializer.create({
    store: testStore,
    container: container
  });

  run(function() {
    testStore.push('model', serializer.normalize(Model, { id: 1, name: provided }));
    testStore.push('model', serializer.normalize(Model, { id: 2 }));
    testStore.find('model', 1).then(function(record) {
      deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
    });
  });

  // See: Github issue #421
  // record = testStore.find(Model, 2);
  // set(record, 'name', provided);
  // deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsFromServer = function(type, provided, expected) {
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
  var serializer = DS.JSONSerializer.create({
    store: testStore,
    container: container
  });

  run(function() {
    testStore.push('model', serializer.normalize(Model, { id: "1", name: provided }));
    testStore.find('model', 1).then(function(record) {
      deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
    });
  });
};

var convertsWhenSet = function(type, provided, expected) {
  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  var testStore = createStore({ model: Model });

  run(function() {
    testStore.push('model', { id: 2 });
    testStore.find('model', 2).then(function(record) {
      set(record, 'name', provided);
      deepEqual(record.serialize().name, expected, type + " saves " + provided + " as " + expected);
    });
  });
};

test("a DS.Model can describe String attributes", function() {
  expect(6);

  converts('string', "Scumbag Tom", "Scumbag Tom");
  converts('string', 1, "1");
  converts('string', "", "");
  converts('string', null, null);
  converts('string', undefined, null);
  convertsFromServer('string', undefined, null);
});

test("a DS.Model can describe Number attributes", function() {
  expect(9);

  converts('number', "1", 1);
  converts('number', "0", 0);
  converts('number', 1, 1);
  converts('number', 0, 0);
  converts('number', "", null);
  converts('number', null, null);
  converts('number', undefined, null);
  converts('number', true, 1);
  converts('number', false, 0);
});

test("a DS.Model can describe Boolean attributes", function() {
  expect(7);

  converts('boolean', "1", true);
  converts('boolean', "", false);
  converts('boolean', 1, true);
  converts('boolean', 0, false);
  converts('boolean', null, false);
  converts('boolean', true, true);
  converts('boolean', false, false);
});

test("a DS.Model can describe Date attributes", function() {
  expect(5);

  converts('date', null, null);
  converts('date', undefined, undefined);

  var dateString = "2011-12-31T00:08:16.000Z";
  var date = new Date(Ember.Date.parse(dateString));


  var Person = DS.Model.extend({
    updatedAt: DS.attr('date')
  });

  var store = createStore({
    person: Person
  });

  run(function() {
    store.push('person', { id: 1 });
    store.find('person', 1).then(function(record) {
      run(function() {
        record.set('updatedAt', date);
      });
      deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
    });
  });
  convertsFromServer('date', dateString, date);
  convertsWhenSet('date', date, dateString);
});

test("don't allow setting", function() {
  var Person = DS.Model.extend();
  var record;

  var store = createStore({
    person: Person
  });

  run(function() {
    record = store.createRecord('person');
  });

  raises(function() {
    run(function() {
      record.set('isLoaded', true);
    });
  }, "raised error when trying to set an unsettable record");
});

test("ensure model exits loading state, materializes data and fulfills promise only after data is available", function () {
  expect(2);

  var store = createStore({
    adapter: DS.Adapter.extend({
      find: function(store, type, id, snapshot) {
        return Ember.RSVP.resolve({ id: 1, name: "John" });
      }
    }),
    person: Person
  });

  run(function() {
    store.find('person', 1).then(function(person) {
      equal(get(person, 'currentState.stateName'), 'root.loaded.saved', 'model is in loaded state');
      equal(get(person, 'isLoaded'), true, 'model is loaded');
    });
  });
});

test("A DS.Model can be JSONified", function() {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({ person: Person });
  var record;

  run(function() {
    record = store.createRecord('person', { name: "TomHuda" });
  });
  deepEqual(record.toJSON(), { name: "TomHuda" });
});

test("A subclass of DS.Model can not use the `data` property", function() {
  var Person = DS.Model.extend({
    data: DS.attr('string'),
    name: DS.attr('string')
  });

  var store = createStore({ person: Person });

  expectAssertion(function() {
    run(function() {
      store.createRecord('person', { name: "TomHuda" });
    });
  }, /`data` is a reserved property name on DS.Model objects/);
});

test("A subclass of DS.Model can not use the `store` property", function() {
  var Retailer = DS.Model.extend({
    store: DS.attr(),
    name: DS.attr()
  });

  var store = createStore({ retailer: Retailer });

  expectAssertion(function() {
    run(function() {
      store.createRecord('retailer', { name: "Buy n Large" });
    });
  }, /`store` is a reserved property name on DS.Model objects/);
});

test("A subclass of DS.Model can not use reserved properties", function() {
  expect(3);
  [
    'currentState', 'data', 'store'
  ].forEach(function(reservedProperty) {
    var invalidExtendObject = {};
    invalidExtendObject[reservedProperty] = DS.attr();
    var Post = DS.Model.extend(invalidExtendObject);

    var store = createStore({ post: Post });

    expectAssertion(function() {
      run(function() {
        store.createRecord('post', {});
      });
    }, /is a reserved property name on DS.Model objects/);
  });
});

test("Pushing a record into the store should transition it to the loaded state", function() {
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = createStore({ person: Person });

  run(function() {
    var person = store.createRecord('person', { id: 1, name: 'TomHuda' });
    equal(person.get('isNew'), true, 'createRecord should put records into the new state');
    store.push('person', { id: 1, name: 'TomHuda' });
    equal(person.get('isNew'), false, 'push should put records into the loaded state');
  });
});

test("A subclass of DS.Model throws an error when calling create() directly", function() {
  throws(function() {
    Person.create();
  }, /You should not call `create` on a model/, "Throws an error when calling create() on model");
});

test('toJSON looks up the JSONSerializer using the store instead of using JSONSerializer.create', function() {
  var Person = DS.Model.extend({
    posts: DS.hasMany('post')
  });
  var Post = DS.Model.extend({
    person: DS.belongsTo('person')
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
    person = store.push('person', {
      id: 1
    });
  });
  var errorThrown = false;
  try {
    json = run(person, 'toJSON');
  } catch (e) {
    errorThrown = true;
  }

  ok(!errorThrown, 'error not thrown due to missing store');
  deepEqual(json, {});
});
