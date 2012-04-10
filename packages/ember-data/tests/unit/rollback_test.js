var get = Ember.get, set = Ember.set, getPath = Ember.getPath;
var Person, store, array;

module("DS.Transaction rollback", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });
    store = DS.Store.create();
    store.loadMany(Person, array);
  },

  teardown: function() {
    store = null;
    Person = null;
  }
});

test("able to restore model after update", function() {
  var person = store.find(Person, 1);
  equal(get(person, 'name'), 'Scumbag Dale', "person have a name");
  equal(get(person, 'isDirty'), false, "is not Dirty");
  person.set('name', 'Scumbag Chavard');
  equal(get(person, 'isDirty'), true, "is Dirty");
  equal(get(person, 'name'), 'Scumbag Chavard', "name have changed");
  person.get('transaction').rollback();
  equal(get(person, 'isDirty'), false, "is not Dirty");
  equal(get(person, 'name'), 'Scumbag Dale', "restore name");

  /*
  equal(get(person, 'errors'), null, "have no errors");
  person.set('name', 123);
  equal(get(person, 'isDirty'), true, "is dirty");
  person.send('willCommit');
  store.recordWasInvalid(person, {name: 'should be a string'});
  equal(get(person, 'isValid'), false, "is not valid");
  equal(getPath(person, 'errors.name'), 'should be a string', "have errors");
  equal(get(person, 'name'), 123, "name have changed");
  person.get('transaction').rollback();
  equal(get(person, 'errors'), null, "no more errors");
  equal(get(person, 'name'), 'Scumbag Dale', "restore name");
  */
});

test("able to restore model after delete", function() {
  var person = store.find(Person, 1);
  equal(get(person, 'isDeleted'), false, "is not deleted");
  person.deleteRecord();
  equal(get(person, 'isDeleted'), true, "is deleted");
  equal(get(person, 'isDirty'), true, "is dirty");
  person.get('transaction').rollback();
  equal(get(person, 'isDeleted'), false, "is rolled back");
  equal(get(person, 'isDirty'), false, "is not dirty");
});

test("able to restore model after create", function() {
  var tryToFind;
  store.set('adapter', DS.Adapter.create({
    find: function() {
      tryToFind = true;
    }
  }));
  store.createRecord(Person, {id: 13, name: 'Toto'});
  var person = store.find(Person, 13);
  equal(get(person, 'name'), 'Toto', "person found and have a name");
  person.get('transaction').rollback();
  equal(get(person, 'isDestroyed'), true, "record destroyed");
  tryToFind = false;
  person = store.find(Person, 13);
  equal(tryToFind, true, 'person not found');
});
