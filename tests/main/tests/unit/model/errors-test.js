import QUnit, { module } from 'qunit';

import { Errors } from '@ember-data/model/-private';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

const AssertPrototype = QUnit.assert;

let errors;

module('unit/model/errors', function (hooks) {
  hooks.beforeEach(function () {
    errors = Errors.create({
      __record: {
        currentState: {
          notify() {},
        },
      },
    });
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

  testInDebug('add error', function (assert) {
    errors.trigger = assert.becameInvalid;
    errors.add('firstName', 'error');
    errors.trigger = assert.unexpectedSend;
    assert.ok(errors.has('firstName'), 'it has firstName errors');
    assert.strictEqual(errors.length, 1, 'it has 1 error');
    errors.add('firstName', ['error1', 'error2']);
    assert.strictEqual(errors.length, 3, 'it has 3 errors');
    assert.ok(!errors.isEmpty, 'it is not empty');
    errors.add('lastName', 'error');
    errors.add('lastName', 'error');
    assert.strictEqual(errors.length, 4, 'it has 4 errors');
  });

  testInDebug('get error', function (assert) {
    assert.ok(errors.objectAt(0) === undefined, 'returns undefined');
    errors.trigger = assert.becameInvalid;
    errors.add('firstName', 'error');
    errors.trigger = assert.unexpectedSend;
    assert.ok(errors.get('firstName').length === 1, 'returns errors');
    assert.deepEqual(errors.objectAt(0), { attribute: 'firstName', message: 'error' });
    errors.add('firstName', 'error2');
    assert.ok(errors.get('firstName').length === 2, 'returns errors');
    errors.add('lastName', 'error3');
    assert.deepEqual(errors.slice(), [
      { attribute: 'firstName', message: 'error' },
      { attribute: 'firstName', message: 'error2' },
      { attribute: 'lastName', message: 'error3' },
    ]);
    assert.deepEqual(errors.get('firstName'), [
      { attribute: 'firstName', message: 'error' },
      { attribute: 'firstName', message: 'error2' },
    ]);
    assert.deepEqual(errors.messages, ['error', 'error2', 'error3']);
  });

  testInDebug('remove error', function (assert) {
    errors.trigger = assert.becameInvalid;
    errors.add('firstName', 'error');
    errors.trigger = assert.becameValid;
    errors.remove('firstName');
    errors.trigger = assert.unexpectedSend;
    assert.ok(!errors.has('firstName'), 'it has no firstName errors');
    assert.strictEqual(errors.length, 0, 'it has 0 error');
    assert.ok(errors.isEmpty, 'it is empty');
    errors.remove('firstName');
  });

  testInDebug('remove same errors fromm different attributes', function (assert) {
    errors.trigger = assert.becameInvalid;
    errors.add('firstName', 'error');
    errors.add('lastName', 'error');
    errors.trigger = assert.unexpectedSend;
    assert.strictEqual(errors.length, 2, 'it has 2 error');
    errors.remove('firstName');
    assert.strictEqual(errors.length, 1, 'it has 1 error');
    errors.trigger = assert.becameValid;
    errors.remove('lastName');
    assert.ok(errors.isEmpty, 'it is empty');
  });

  testInDebug('clear errors', function (assert) {
    errors.trigger = assert.becameInvalid;
    errors.add('firstName', ['error', 'error1']);
    assert.strictEqual(errors.length, 2, 'it has 2 errors');
    errors.trigger = assert.becameValid;
    errors.clear();
    errors.trigger = assert.unexpectedSend;
    assert.ok(!errors.has('firstName'), 'it has no firstName errors');
    assert.strictEqual(errors.length, 0, 'it has 0 error');
    errors.clear();
  });
});
