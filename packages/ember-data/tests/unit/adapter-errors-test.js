module("unit/adapter/errors - DS.AdapterError");

test("DS.AdapterError", function() {
  var error = new DS.AdapterError();
  ok(error instanceof Error);
  ok(error instanceof Ember.Error);
});

test("DS.InvalidError", function() {
  var error = new DS.InvalidError();
  ok(error instanceof Error);
  ok(error instanceof DS.AdapterError);
});

test("DS.TimeoutError", function() {
  var error = new DS.TimeoutError();
  ok(error instanceof Error);
  ok(error instanceof DS.AdapterError);
});

test("DS.AbortError", function() {
  var error = new DS.AbortError();
  ok(error instanceof Error);
  ok(error instanceof DS.AdapterError);
});

var errorsHash = {
  name: ['is invalid', 'must be a string'],
  age: ['must be a number']
};

var errorsArray = [
  {
    title: 'Invalid Attribute',
    details: 'is invalid',
    source: { pointer: 'data/attributes/name' }
  },
  {
    title: 'Invalid Attribute',
    details: 'must be a string',
    source: { pointer: 'data/attributes/name' }
  },
  {
    title: 'Invalid Attribute',
    details: 'must be a number',
    source: { pointer: 'data/attributes/age' }
  }
];

test("errorsHashToArray", function() {
  var result = DS.errorsHashToArray(errorsHash);
  deepEqual(result, errorsArray);
});

test("errorsArrayToHash", function() {
  var result = DS.errorsArrayToHash(errorsArray);
  deepEqual(result, errorsHash);
});

test("DS.InvalidError will normalize errors hash with deprecation", function() {
  var error;

  expectDeprecation(function() {
    error = new DS.InvalidError({ name: ['is invalid'] });
  }, /expects json-api formatted errors/);

  deepEqual(error.errors, [
    {
      title: 'Invalid Attribute',
      details: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);
});
