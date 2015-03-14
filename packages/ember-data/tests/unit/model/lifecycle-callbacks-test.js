var get = Ember.get;
var run = Ember.run;

module("unit/model/lifecycle_callbacks - Lifecycle Callbacks");

test("a record receives a didLoad callback when it has finished loading", function() {
  expect(3);

  var Person = DS.Model.extend({
    name: DS.attr(),
    didLoad: function() {
      ok("The didLoad callback was called");
    }
  });

  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    }
  });

  var store = createStore({
    adapter: adapter
  });

  run(function() {
    store.find(Person, 1).then(function(person) {
      equal(person.get('id'), "1", "The person's ID is available");
      equal(person.get('name'), "Foo", "The person's properties are available");
    });
  });
});

test("a record receives a didUpdate callback when it has finished updating", function() {
  expect(5);

  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didUpdate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "didUpdate callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter
  });
  var asyncPerson;

  run(function() {
    asyncPerson = store.find(Person, 1);
  });
  equal(callCount, 0, "precond - didUpdate callback was not called yet");

  run(function() {
    asyncPerson.then(function(person) {
      return run(function() {
        person.set('bar', "Bar");
        return person.save();
      });
    }).then(function() {
      equal(callCount, 1, "didUpdate called after update");
    });
  });
});

test("a record receives a didCreate callback when it has finished updating", function() {
  expect(5);

  var callCount = 0;

  var Person = DS.Model.extend({
    didCreate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    createRecord: function(store, type, record) {
      equal(callCount, 0, "didCreate callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter
  });

  equal(callCount, 0, "precond - didCreate callback was not called yet");
  var person;

  run(function() {
    person = store.createRecord(Person, { id: 69, name: "Newt Gingrich" });
  });


  run(function() {
    person.save().then(function() {
      equal(callCount, 1, "didCreate called after commit");
    });
  });
});

test("a record receives a didDelete callback when it has finished deleting", function() {
  expect(5);

  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didDelete: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    deleteRecord: function(store, type, record) {
      equal(callCount, 0, "didDelete callback was not called until didSaveRecord is called");

      return Ember.RSVP.resolve();
    }
  });

  var store = createStore({
    adapter: adapter
  });
  var asyncPerson;

  run(function() {
    asyncPerson = store.find(Person, 1);
  });

  equal(callCount, 0, "precond - didDelete callback was not called yet");

  run(function() {
    asyncPerson.then(function(person) {
      return run(function() {
        person.deleteRecord();
        return person.save();
      });
    }).then(function() {
      equal(callCount, 1, "didDelete called after delete");
    });
  });
});

test("an uncommited record also receives a didDelete callback when it is deleted", function() {
  expect(4);

  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didDelete: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var store = createStore({
    adapter: DS.Adapter.extend()
  });

  var person;
  run(function() {
    person = store.createRecord(Person, { name: 'Tomster' });
  });

  equal(callCount, 0, "precond - didDelete callback was not called yet");

  run(function() {
    person.deleteRecord();
  });

  equal(callCount, 1, "didDelete called after delete");
});

test("a record receives a becameInvalid callback when it became invalid", function() {
  expect(5);

  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    becameInvalid: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), true, "record should be dirty");
    }
  });

  var adapter = DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "becameInvalid callback was not called until recordWasInvalid is called");

      return Ember.RSVP.reject(new DS.InvalidError({ bar: 'error' }));
    }
  });

  var store = createStore({
    adapter: adapter
  });
  var asyncPerson;

  run(function() {
    asyncPerson = store.find(Person, 1);
  });
  equal(callCount, 0, "precond - becameInvalid callback was not called yet");

  // Make sure that the error handler has a chance to attach before
  // save fails.
  run(function() {
    asyncPerson.then(function(person) {
      return run(function() {
        person.set('bar', "Bar");
        return person.save();
      });
    }).then(null, function() {
      equal(callCount, 1, "becameInvalid called after invalidating");
    });
  });
});

test("an ID of 0 is allowed", function() {
  var store = createStore();

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  run(function() {
    store.push(Person, { id: 0, name: "Tom Dale" });
  });

  equal(store.all(Person).objectAt(0).get('name'), "Tom Dale", "found record with id 0");
});
