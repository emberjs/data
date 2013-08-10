var get = Ember.get, set = Ember.set;

module("unit/model/lifecycle_callbacks - Lifecycle Callbacks");

asyncTest("a record receives a didLoad callback when it has finished loading", function() {
  var Person = DS.Model.extend({
    didLoad: function() {
      ok("The didLoad callback was called");
    }
  });

  var adapter = DS.Adapter.create({
    find: function(store, type, id) {
      store.push(Person, { id: 1, name: "Foo" });
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);

  person.then(function(resolvedPerson) {
    equal(resolvedPerson, person, "The resolved value is correct");
    start();
  });
});

test("a record receives a didUpdate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    didUpdate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.create({
    find: function(store, type, id) {
      store.push(Person, { id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "didUpdate callback was not called until didSaveRecord is called");

      store.didSaveRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - didUpdate callback was not called yet");

  person.set('bar', "Bar");
  store.commit();

  equal(callCount, 1, "didUpdate called after update");
});

test("a record receives a didCreate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    didCreate: function() {
      callCount++;
      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.create({
    createRecord: function(store, type, record) {
      equal(callCount, 0, "didCreate callback was not called until didSaveRecord is called");

      store.didSaveRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  equal(callCount, 0, "precond - didCreate callback was not called yet");

  store.createRecord(Person, { id: 69, name: "Newt Gingrich" });
  store.commit();

  equal(callCount, 1, "didCreate called after commit");
});

test("a record receives a didDelete callback when it has finished deleting", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    didDelete: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), false, "record should not be dirty");
    }
  });

  var adapter = DS.Adapter.create({
    find: function(store, type, id) {
      store.push(Person, { id: 1, name: "Foo" });
    },

    deleteRecord: function(store, type, record) {
      equal(callCount, 0, "didDelete callback was not called until didSaveRecord is called");

      store.didSaveRecord(record);
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - didDelete callback was not called yet");

  person.deleteRecord();
  store.commit();

  equal(callCount, 1, "didDelete called after delete");
});

test("a record receives a becameInvalid callback when it became invalid", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    bar: DS.attr('string'),

    becameInvalid: function() {
      callCount++;

      equal(get(this, 'isSaving'), false, "record should not be saving");
      equal(get(this, 'isDirty'), true, "record should be dirty");
    }
  });

  var adapter = DS.Adapter.create({
    find: function(store, type, id) {
      store.push(Person, { id: 1, name: "Foo" });
    },

    updateRecord: function(store, type, record) {
      equal(callCount, 0, "becameInvalid callback was not called untill recordWasInvalid is called");

      store.recordWasInvalid(record, {bar: 'error'});
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - becameInvalid callback was not called yet");

  person.set('bar', "Bar");
  store.commit();

  equal(callCount, 1, "becameInvalid called after invalidating");
});

test("an ID of 0 is allowed", function() {
  var store = DS.Store.create();

  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.push(Person, { id: 0, name: "Tom Dale" });
  equal(store.all(Person).objectAt(0).get('name'), "Tom Dale", "found record with id 0");
});
