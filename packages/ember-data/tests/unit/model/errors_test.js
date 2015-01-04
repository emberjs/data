var errors;
var ADAPTER_SOURCE = "ember-data:adapter";

module("unit/model/errors", {
  setup: function() {
    errors = DS.Errors.create();
  },

  teardown: function() {
  }
});

function becameInvalid(eventName) {
  if (eventName === 'becameInvalid') {
    ok(true, 'becameInvalid send');
  } else {
    ok(false, eventName + ' is send instead of becameInvalid');
  }
}

function becameValid(eventName) {
  if (eventName === 'becameValid') {
    ok(true, 'becameValid send');
  } else {
    ok(false, eventName + ' is send instead of becameValid');
  }
}

function unexpectedSend(eventName) {
  ok(false, 'unexpected send : ' + eventName);
}

test("add error", function() {
  expect(6);
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error', ADAPTER_SOURCE);
  errors.trigger = unexpectedSend;
  ok(errors.has('firstName', ADAPTER_SOURCE), 'it has firstName errors');
  equal(errors.get('length'), 1, 'it has 1 error');
  errors.add('firstName', ['error1', 'error2']);
  equal(errors.get('length'), 3, 'it has 3 errors');
  ok(!errors.get('isEmpty'), 'it is not empty');
  errors.add('lastName', 'error');
  errors.add('lastName', 'error');
  equal(errors.get('length'), 4, 'it has 4 errors');
});

test("get error", function() {
  expect(8);
  ok(errors.get('firstObject') === undefined, 'returns undefined');
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error', ADAPTER_SOURCE);
  errors.trigger = unexpectedSend;
  ok(errors.get('firstName').length === 1, 'returns errors');
  deepEqual(errors.get('firstObject'), { attribute: 'firstName', message: 'error', source: ADAPTER_SOURCE });
  errors.add('firstName', 'error2', ADAPTER_SOURCE);
  ok(errors.get('firstName').length === 2, 'returns errors');
  errors.add('lastName', 'error3', ADAPTER_SOURCE);
  deepEqual(errors.toArray(), [
    { attribute: 'firstName', message: 'error', source: ADAPTER_SOURCE },
    { attribute: 'firstName', message: 'error2', source: ADAPTER_SOURCE },
    { attribute: 'lastName', message: 'error3', source: ADAPTER_SOURCE }
  ]);
  deepEqual(errors.get('firstName'), [
    'error', 'error2'
  ]);
  deepEqual(errors.get('messages'), ['error', 'error2', 'error3']);
});

test("remove error", function() {
  expect(5);
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error', ADAPTER_SOURCE);
  errors.trigger = becameValid;
  errors.remove('firstName', ADAPTER_SOURCE);
  errors.trigger = unexpectedSend;
  ok(!errors.has('firstName', ADAPTER_SOURCE), 'it has no firstName errors');
  equal(errors.get('length'), 0, 'it has 0 error');
  ok(errors.get('isEmpty'), 'it is empty');
  errors.remove('firstName');
});

test("remove same errors from different attributes", function() {
  expect(5);
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error', ADAPTER_SOURCE);
  errors.add('lastName', 'error', ADAPTER_SOURCE);
  errors.trigger = unexpectedSend;
  equal(errors.get('length'), 2, 'it has 2 error');
  errors.remove('firstName', ADAPTER_SOURCE);
  equal(errors.get('length'), 1, 'it has 1 error');
  errors.trigger = becameValid;
  errors.remove('lastName', ADAPTER_SOURCE);
  ok(errors.get('isEmpty'), 'it is empty');
});

test("remove errors from given source only", function() {
  expect(4);
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error', ADAPTER_SOURCE);
  errors.add('lastName', 'error 1', 'another-source');
  errors.add('lastName', 'error 2', ADAPTER_SOURCE);
  errors.trigger = unexpectedSend;
  equal(errors.get('length'), 3, 'it has 3 error');
  errors.remove('lastName', 'another-source');
  equal(errors.get('length'), 2, 'it has 2 error');
  errors.trigger = becameValid;
  equal(errors.get('lastName.firstObject'), 'error 2', 'lastName has error');
});

test("clear errors", function() {
  expect(5);
  errors.trigger = becameInvalid;
  errors.add('firstName', ['error', 'error1'], ADAPTER_SOURCE);
  equal(errors.get('length'), 2, 'it has 2 errors');
  errors.trigger = becameValid;
  errors.clear();
  errors.trigger = unexpectedSend;
  ok(!errors.has('firstName'), 'it has no firstName errors');
  equal(errors.get('length'), 0, 'it has 0 error');
  errors.clear();
});

test("clear errors from given source", function() {
  expect(4);
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error', ADAPTER_SOURCE);
  errors.add('lastName', 'error', 'another-source');
  errors.trigger = unexpectedSend;
  equal(errors.get('length'), 2, 'it has 2 error');
  errors.clear('another-source');
  equal(errors.get('length'), 1, 'it has 1 error');
  equal(errors.get('firstName.firstObject'), 'error', 'firstName has error');
});
