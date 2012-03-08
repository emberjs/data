var get = Ember.get, set = Ember.set;

var errors;

module("DS.Errors", {
  setup: function() {
    errors = DS.Errors.create({
      record: Ember.Object.create({
        isValid: true,
        send: Ember.K
      })
    });
  },

  teardown: function() {
    errors.destroy();
    errors = null;
  }
});

test("add errors", function() {
  equal(get(errors, 'length'), 0, "has no errors");
  equal(get(errors, 'isEmpty'), true, "is empty");

  errors.add('name', 'is error');

  equal(get(errors, 'length'), 1, "has one error");

  errors.add('name', 'is another error');

  equal(get(errors, 'length'), 2, "has two errors");

  errors.add('name');

  equal(get(errors, 'length'), 3, "has three errors");

  errors.add('age', 'is also error');

  equal(get(errors, 'length'), 4, "has four errors");
  equal(get(errors, 'isEmpty'), false, "is not empty");
});

test("remove errors", function() {
  errors.add('name', 'is error');
  errors.add('name', 'is another error');
  errors.add('age', 'is also error');

  errors.remove('age');

  equal(get(errors, 'length'), 2, "has two errors");

  errors.remove('name');

  equal(get(errors, 'length'), 0, "has no errors");

  Ember.run.sync();
  equal(get(errors, 'isEmpty'), true, "is empty");

  errors.add('name', 'is error');
  errors.add('name', 'is another error');
  errors.add('age', 'is also error');

  errors.clear();

  equal(get(errors, 'length'), 0, "has no errors");
});

test("inspect errors", function() {
  errors.add('name', 'is error');
  errors.add('name', 'is another error');
  errors.add('age', 'is also error');
  errors.add('name');

  var nameErrors = get(errors, 'name'),
      ageErrors = get(errors, 'age'),
      fullMessages = get(errors, 'fullMessages');

  equal(errors.added('name'), true, 'we have errors for name');
  equal(errors.added('toto'), false, 'we do not have errors for toto');
  equal(errors.added('name', 'is error'), true, 'we have "is error" for name');
  equal(errors.added('name', 'is error not in errors'), false, 'we do not have this error');

  equal(get(nameErrors, 'length'), 3, "has three name errors");
  equal(get(ageErrors, 'length'), 1, "has one age error");

  equal(nameErrors.objectAt(0), 'is error', "first name error message is 'is error'");
  equal(nameErrors.objectAt(2), 'invalid', "last name error message is the default error");

  equal(errors.fullMessage('age', 'is error'), 'age is error', 'fullMessage method return default format for messages');

  equal(get(fullMessages, 'length'), 4, "has four full messages");

  equal(fullMessages.objectAt(0), 'name is error', "first name error message is 'is error'");
  equal(fullMessages.objectAt(2), 'name invalid', "last name error message is the default error");
  equal(fullMessages.objectAt(3), 'age is also error', "age error message is 'is also error'");

  errors.remove('name');

  ageErrors = get(errors, 'age');

  equal(get(ageErrors, 'length'), 1, "still has one age error");
});

var store, Person;

module('DS.Model error', {
  setup: function() {
    store = DS.Store.create({
      adapter: DS.Adapter.create({
        commit: function() {
          ok(false, "should never call adapter methods");
        }
      })
    });

    Person = DS.Model.extend({
      name: DS.attr('string'),
      foo: DS.attr('string')
    });
  },
  teardown: function() {
    store.destroy();
    store = null;
  }
});

test("send state transitions to record", function() {
  var store = DS.Store.create();

  var record = Person.createRecord();
  errors = get(record, 'errors');

  equal(get(record, 'isValid'), true, 'record is valid');

  store.recordWasInvalid(record, {name: 'is error', foo: 'is error'});

  equal(get(record, 'isValid'), false, 'record became invalid');

  record.valid();

  equal(get(record, 'isValid'), true, 'is valid');
});

test("should not go to error state from clean state", function() {
  store.load(Person, 1, {name: "Scumbag Paul"});

  var person = store.find(Person, 1);

  raises(function() {
    store.recordHasError(person, "500: server error");
  }, 'should rise and exception if trying to became error');
});

test("should not go to error state from dirty state", function() {
  var newPerson = Person.createRecord({
    name: "Scumbag Paul"
  });

  raises(function() {
    store.recordHasError(newPerson, "500: server error");
  }, 'should rise and exception if trying to became error');
});

test("created records in error state can retry to commit", function() {
  var transaction = store.transaction();

  var newPerson = transaction.createRecord(Person, {
    name: "Scumbag Paul"
  });

  equal(newPerson.get('isDirty'), true, "precond - Record is marked as dirty");
  equal(newPerson.get('isNew'), true, "precond - Record is marked as new");

  newPerson.send('willCommit');
  store.recordHasError(newPerson, "500: server error");

  equal(newPerson.get('isError'), true, "precond - Record is marked as error");
  equal(newPerson.getPath('errors.base.firstObject'), "500: server error", 'should have error message');

  newPerson.send('willCommit');

  equal(newPerson.get('isError'), false, "Record is no more marked as error");
  equal(newPerson.get('isSaving'), true, "Record is marked as saving");
  equal(newPerson.get('isNew'), true, "Record is marked as new");
});

test("created records in error state can rollback", function() {
  var transaction = store.transaction();

  var newPerson = transaction.createRecord(Person, {
    name: "Scumbag Paul"
  });

  equal(newPerson.get('isDirty'), true, "precond - Record is marked as dirty");
  equal(newPerson.get('isNew'), true, "precond - Record is marked as new");

  newPerson.send('willCommit');
  store.recordHasError(newPerson, "500: server error");

  equal(newPerson.get('isError'), true, "precond - Record is marked as error");
  equal(newPerson.getPath('errors.base.firstObject'), "500: server error", 'should have error message');

  transaction.rollback();

  equal(newPerson.get('isError'), false, "Record is no more marked as error");
  equal(newPerson.get('isSaving'), false, "Record is marked as saving");
  equal(newPerson.get('isNew'), false, "Record is marked as not new");
  equal(newPerson.get('isDeleted'), true, "Record is marked as deleted");
});

test("updated records in error state can retry to commit", function() {
  store.load(Person, 1, {name: "Scumbag Paul"});

  var updatedPerson = store.find(Person, 1);
  updatedPerson.set('name', 'Chavard Paul');

  equal(updatedPerson.get('isDirty'), true, "precond - Record is marked as dirty");

  updatedPerson.send('willCommit');
  store.recordHasError(updatedPerson, "500: server error");

  equal(updatedPerson.get('isError'), true, "precond - Record is marked as error");
  equal(updatedPerson.getPath('errors.base.firstObject'), "500: server error", 'should have error message');

  updatedPerson.send('willCommit');

  equal(updatedPerson.get('isError'), false, "Record is no more marked as error");
  equal(updatedPerson.get('isSaving'), true, "Record is marked as saving");
  equal(updatedPerson.get('isDirty'), true, "Record is marked as dirty");
});

test("updated records in error state can rollback", function() {
  store.load(Person, 1, {name: "Scumbag Paul"});

  var updatedPerson = store.find(Person, 1);
  updatedPerson.set('name', 'Chavard Paul');

  equal(updatedPerson.get('isDirty'), true, "precond - Record is marked as dirty");

  updatedPerson.send('willCommit');
  store.recordHasError(updatedPerson, "500: server error");

  equal(updatedPerson.get('isError'), true, "precond - Record is marked as error");
  equal(updatedPerson.getPath('errors.base.firstObject'), "500: server error", 'should have error message');

  updatedPerson.get('transaction').rollback();

  equal(updatedPerson.get('isError'), false, "Record is no more marked as error");
  equal(updatedPerson.get('isSaving'), false, "Record is marked as not saving");
  equal(updatedPerson.get('isDirty'), false, "Record is marked as not dirty");
  equal(updatedPerson.get('name'), 'Scumbag Paul', "Record name attribut should have initial value");
});

test("deleted records in error state can retry to commit", function() {
  store.load(Person, 1, {name: "Scumbag Paul"});

  var deletedPerson = store.find(Person, 1);
  deletedPerson.deleteRecord();

  equal(deletedPerson.get('isDirty'), true, "precond - Record is marked as dirty");
  equal(deletedPerson.get('isDeleted'), true, "precond - Record is marked as deleted");

  deletedPerson.send('willCommit');
  store.recordHasError(deletedPerson, "500: server error");

  equal(deletedPerson.get('isError'), true, "precond - Record is marked as error");
  equal(deletedPerson.getPath('errors.base.firstObject'), "500: server error", 'should have error message');

  deletedPerson.send('willCommit');

  equal(deletedPerson.get('isError'), false, "Record is no more marked as error");
  equal(deletedPerson.get('isSaving'), true, "Record is marked as saving");
  equal(deletedPerson.get('isDirty'), true, "Record is marked as dirty");
  equal(deletedPerson.get('isDeleted'), true, "Record is marked as deleted");
});

test("deleted records in error state can rollback", function() {
  store.load(Person, 1, {name: "Scumbag Paul"});

  var deletedPerson = store.find(Person, 1);
  deletedPerson.deleteRecord();

  equal(deletedPerson.get('isDirty'), true, "precond - Record is marked as dirty");
  equal(deletedPerson.get('isDeleted'), true, "precond - Record is marked as deleted");

  deletedPerson.send('willCommit');
  store.recordHasError(deletedPerson, "500: server error");

  equal(deletedPerson.get('isError'), true, "precond - Record is marked as error");
  equal(deletedPerson.getPath('errors.base.firstObject'), "500: server error", 'should have error message');

  deletedPerson.get('transaction').rollback();

  equal(deletedPerson.get('isError'), false, "Record is no more marked as error");
  equal(deletedPerson.get('isSaving'), false, "Record is marked as not saving");
  equal(deletedPerson.get('isDirty'), false, "Record is marked as not dirty");
  equal(deletedPerson.get('isDeleted'), false, "Record is marked as not deleted");
});
