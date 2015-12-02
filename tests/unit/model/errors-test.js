import DS from 'ember-data';
import QUnit, {module, test} from 'qunit';

const AssertPrototype = QUnit.assert;

var errors;

module("unit/model/errors", {
  beforeEach() {
    errors = DS.Errors.create();
  },

  afterEach() {
  }
});

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

test("add error", function(assert) {
  assert.expect(6);
  errors.trigger = assert.becameInvalid;
  errors.add('firstName', 'error');
  errors.trigger = assert.unexpectedSend;
  assert.ok(errors.has('firstName'), 'it has firstName errors');
  assert.equal(errors.get('length'), 1, 'it has 1 error');
  errors.add('firstName', ['error1', 'error2']);
  assert.equal(errors.get('length'), 3, 'it has 3 errors');
  assert.ok(!errors.get('isEmpty'), 'it is not empty');
  errors.add('lastName', 'error');
  errors.add('lastName', 'error');
  assert.equal(errors.get('length'), 4, 'it has 4 errors');
});

test("get error", function(assert) {
  assert.expect(8);
  assert.ok(errors.get('firstObject') === undefined, 'returns undefined');
  errors.trigger = assert.becameInvalid;
  errors.add('firstName', 'error');
  errors.trigger = assert.unexpectedSend;
  assert.ok(errors.get('firstName').length === 1, 'returns errors');
  assert.deepEqual(errors.get('firstObject'), { attribute: 'firstName', message: 'error' });
  errors.add('firstName', 'error2');
  assert.ok(errors.get('firstName').length === 2, 'returns errors');
  errors.add('lastName', 'error3');
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

test("remove error", function(assert) {
  assert.expect(5);
  errors.trigger = assert.becameInvalid;
  errors.add('firstName', 'error');
  errors.trigger = assert.becameValid;
  errors.remove('firstName');
  errors.trigger = assert.unexpectedSend;
  assert.ok(!errors.has('firstName'), 'it has no firstName errors');
  assert.equal(errors.get('length'), 0, 'it has 0 error');
  assert.ok(errors.get('isEmpty'), 'it is empty');
  errors.remove('firstName');
});

test("remove same errors from different attributes", function(assert) {
  assert.expect(5);
  errors.trigger = assert.becameInvalid;
  errors.add('firstName', 'error');
  errors.add('lastName', 'error');
  errors.trigger = assert.unexpectedSend;
  assert.equal(errors.get('length'), 2, 'it has 2 error');
  errors.remove('firstName');
  assert.equal(errors.get('length'), 1, 'it has 1 error');
  errors.trigger = assert.becameValid;
  errors.remove('lastName');
  assert.ok(errors.get('isEmpty'), 'it is empty');
});

test("clear errors", function(assert) {
  assert.expect(5);
  errors.trigger = assert.becameInvalid;
  errors.add('firstName', ['error', 'error1']);
  assert.equal(errors.get('length'), 2, 'it has 2 errors');
  errors.trigger = assert.becameValid;
  errors.clear();
  errors.trigger = assert.unexpectedSend;
  assert.ok(!errors.has('firstName'), 'it has no firstName errors');
  assert.equal(errors.get('length'), 0, 'it has 0 error');
  errors.clear();
});
