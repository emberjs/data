import DS from 'ember-data';
import QUnit, { module } from 'qunit';
import testInDebug from 'dummy/tests/helpers/test-in-debug';

const AssertPrototype = QUnit.assert;

let errors;

module('unit/model/errors', {
  beforeEach() {
    errors = DS.Errors.create();
  }
});

function updateErrors(func) {
  window.expectWarning(func, 'Interacting with a record errors object will no longer change the record state.');
}

AssertPrototype.becameInvalid = function becameInvalid(eventName) {
  if (eventName === 'becameInvalid') {
    this.ok(true, 'becameInvalid send');
  } else {
    this.ok(false, eventName + ' is send instead of becameInvalid');
  }
}.bind(AssertPrototype);

AssertPrototype.becameValid = function becameValid(eventName) {
  if (eventName === 'becameValid') {
    this.ok(true, 'becameValid send');
  } else {
    this.ok(false, eventName + ' is send instead of becameValid');
  }
}.bind(AssertPrototype);

AssertPrototype.unexpectedSend = function unexpectedSend(eventName) {
  this.ok(false, 'unexpected send : ' + eventName);
}.bind(AssertPrototype);

testInDebug('add error', function(assert) {
  assert.expect(10);

  errors.trigger = assert.becameInvalid;
  updateErrors(() => errors.add('firstName', 'error'));
  errors.trigger = assert.unexpectedSend;
  assert.ok(errors.has('firstName'), 'it has firstName errors');
  assert.equal(errors.get('length'), 1, 'it has 1 error');
  updateErrors(() => errors.add('firstName', ['error1', 'error2']));
  assert.equal(errors.get('length'), 3, 'it has 3 errors');
  assert.ok(!errors.get('isEmpty'), 'it is not empty');
  updateErrors(() => errors.add('lastName', 'error'));
  updateErrors(() => errors.add('lastName', 'error'));
  assert.equal(errors.get('length'), 4, 'it has 4 errors');
});

testInDebug('get error', function(assert) {
  assert.expect(11);

  assert.ok(errors.get('firstObject') === undefined, 'returns undefined');
  errors.trigger = assert.becameInvalid;
  updateErrors(() => errors.add('firstName', 'error'));
  errors.trigger = assert.unexpectedSend;
  assert.ok(errors.get('firstName').length === 1, 'returns errors');
  assert.deepEqual(errors.get('firstObject'), { attribute: 'firstName', message: 'error' });
  updateErrors(() => errors.add('firstName', 'error2'));
  assert.ok(errors.get('firstName').length === 2, 'returns errors');
  updateErrors(() => errors.add('lastName', 'error3'));
  assert.deepEqual(errors.toArray(), [
    { attribute: 'firstName', message: 'error' },
    { attribute: 'firstName', message: 'error2' },
    { attribute: 'lastName', message: 'error3' }
  ]);
  assert.deepEqual(errors.get('firstName'), [
    { attribute: 'firstName', message: 'error' },
    { attribute: 'firstName', message: 'error2' }
  ]);
  assert.deepEqual(errors.get('messages'), ['error', 'error2', 'error3']);
});

testInDebug('remove error', function(assert) {
  assert.expect(8);

  errors.trigger = assert.becameInvalid;
  updateErrors(() => errors.add('firstName', 'error'));
  errors.trigger = assert.becameValid;
  updateErrors(() => errors.remove('firstName'));
  errors.trigger = assert.unexpectedSend;
  assert.ok(!errors.has('firstName'), 'it has no firstName errors');
  assert.equal(errors.get('length'), 0, 'it has 0 error');
  assert.ok(errors.get('isEmpty'), 'it is empty');
  updateErrors(() => errors.remove('firstName'));
});

testInDebug('remove same errors from different attributes', function(assert) {
  assert.expect(9);

  errors.trigger = assert.becameInvalid;
  updateErrors(() => errors.add('firstName', 'error'));
  updateErrors(() => errors.add('lastName', 'error'));
  errors.trigger = assert.unexpectedSend;
  assert.equal(errors.get('length'), 2, 'it has 2 error');
  updateErrors(() => errors.remove('firstName'));
  assert.equal(errors.get('length'), 1, 'it has 1 error');
  errors.trigger = assert.becameValid;
  updateErrors(() => errors.remove('lastName'));
  assert.ok(errors.get('isEmpty'), 'it is empty');
});

testInDebug('clear errors', function(assert) {
  assert.expect(8);

  errors.trigger = assert.becameInvalid;
  updateErrors(() => errors.add('firstName', ['error', 'error1']));
  assert.equal(errors.get('length'), 2, 'it has 2 errors');
  errors.trigger = assert.becameValid;
  updateErrors(() => errors.clear());
  errors.trigger = assert.unexpectedSend;
  assert.ok(!errors.has('firstName'), 'it has no firstName errors');
  assert.equal(errors.get('length'), 0, 'it has 0 error');
  updateErrors(() => errors.clear());
});
