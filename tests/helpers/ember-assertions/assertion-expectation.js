import Ember from 'ember';
import MethodCallExpectation from './method-call-expectation';

export default function AssertExpectation(message, testAssert) {
  MethodCallExpectation.call(this, Ember, 'assert', testAssert);
  this.expectedMessage = message;
  this.testAssert = testAssert;
}

AssertExpectation.Error = function() {};
AssertExpectation.prototype = Object.create(MethodCallExpectation.prototype);
AssertExpectation.prototype.handleCall = function(message, test) {
  this.sawCall = true;
  if (test) { return; } // Only get message for failures
  this.actualMessage = message;
  // Halt execution
  throw new AssertExpectation.Error();
};
AssertExpectation.prototype.assert = function(fn) {
  try {
    this.runWithStub(fn);
  } catch (e) {
    if (!(e instanceof AssertExpectation.Error)) {
      throw e;
    }
  }

  // Run assertions in an order that is useful when debugging a test failure.
  //
  let assert = this.testAssert;
  if (!this.sawCall) {
    assert.ok(false, "Expected Ember.assert to be called (Not called with any value).");
  } else if (!this.actualMessage) {
    assert.ok(false, 'Expected a failing Ember.assert (Ember.assert called, but without a failing test).');
  } else {
    if (this.expectedMessage) {
      if (this.expectedMessage instanceof RegExp) {
        assert.ok(this.expectedMessage.test(this.actualMessage), "Expected failing Ember.assert: '" + this.expectedMessage + "', but got '" + this.actualMessage + "'.");
      } else {
        assert.equal(this.actualMessage, this.expectedMessage, "Expected failing Ember.assert: '" + this.expectedMessage + "', but got '" + this.actualMessage + "'.");
      }
    } else {
      // Positive assertion that assert was called
      assert.ok(true, 'Expected a failing Ember.assert.');
    }
  }
};

