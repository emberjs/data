var errors;

module('Errors test', {
  setup: function() {
    errors = DS.Errors.create();
  }
});

test('adding a new error for a property', function() {
  errors.add('firstName', "can't be blank");
  deepEqual(errors.get('firstName'), ["can't be blank"]);
  errors.add('firstName', "is invalid");
  deepEqual(errors.get('firstName'), ["can't be blank", 'is invalid']);
});

test("adding an array of errors", function() {
  errors.add('firstName', ["can't be blank"]);
  errors.add('firstName', ["and this", "and that"]);
  deepEqual(errors.get('firstName'), ["can't be blank", 'and this', 'and that']);
});

test('clears existing errors', function() {
  errors.add('firstName', "can't be blank");
  errors.add('lastName', "can't be blank");
  deepEqual(Object.keys(errors), ['firstName', 'lastName']);
  errors.clear();
  deepEqual(Object.keys(errors), []);
  errors.add('firstName', 'no good');
  deepEqual(errors.get('firstName'), ["no good"]);
});

test('clear error on some attribute', function() {
  errors.add('firstName', "can't be blank");
  errors.add('lastName', "can't be blank");
  errors.add('email', "can't be blank");
  deepEqual(Object.keys(errors), ['firstName', 'lastName', 'email']);
  errors.clear('firstName', 'email');
  deepEqual(Object.keys(errors), ['lastName']);
});
