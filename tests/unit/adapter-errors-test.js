import DS from 'ember-data';

module("unit/adapter-errors - DS.AdapterError");

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
    detail: 'is invalid',
    source: { pointer: '/data/attributes/name' }
  },
  {
    title: 'Invalid Attribute',
    detail: 'must be a string',
    source: { pointer: '/data/attributes/name' }
  },
  {
    title: 'Invalid Attribute',
    detail: 'must be a number',
    source: { pointer: '/data/attributes/age' }
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

test("errorsArrayToHash without trailing slash", function() {
  var result = DS.errorsArrayToHash([
    {
      detail: 'error message',
      source: { pointer: 'data/attributes/name' }
    }
  ]);
  deepEqual(result, { name: ['error message'] });
});

test("DS.InvalidError will normalize errors hash will assert", function() {
  var error;

  expectAssertion(function() {
    error = new DS.InvalidError({ name: ['is invalid'] });
  }, /expects json-api formatted errors/);
});
