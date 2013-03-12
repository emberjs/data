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

  errors.add('age', 'is also error');

  equal(get(errors, 'length'), 3, "has three errors");
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

  var nameErrors = get(errors, 'name'),
      ageErrors = get(errors, 'age');

  equal(errors.has('name'), true, 'we have errors for name');
  equal(errors.has('toto'), false, 'we do not have errors for toto');
  equal(errors.has('name', 'is error'), true, 'we have "is error" for name');
  equal(errors.has('name', 'is error not in errors'), false, 'we do not have this error');

  equal(get(nameErrors, 'length'), 2, "has two name errors");
  equal(get(ageErrors, 'length'), 1, "has one age error");

  equal(nameErrors.objectAt(0), 'is error', "first name error message is 'is error'");

  equal(get(errors, 'length'), 3, "has three full messages");

  errors.remove('name');

  ageErrors = get(errors, 'age');

  equal(get(ageErrors, 'length'), 1, "still has one age error");
});
