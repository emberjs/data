import Ember from 'ember';
import AssertionExpectation from './ember-assertions/assertion-expectation';
import deprecations from './ember-assertions/deprecations';

// Looks for an exception raised within the fn.
//
// expectAssertion(function(){
//   Ember.assert("Homie don't roll like that");
// } /* , optionalMessageStringOrRegex */);
//
export function expectAssertion(fn, message) {
  (new AssertionExpectation(message, this)).assert(fn);
}

// Expects no deprecation to happen from the time of calling until
// the end of the test.
//
// expectNoDeprecation(/* optionalStringOrRegex */);
// Ember.deprecate("Old And Busted");
//
export function expectNoDeprecation(message) {
  if (Ember.isArray(deprecations.expecteds)) {
    throw new Error("No deprecation was expected after expectDeprecation was called!");
  }
  deprecations.stubEmber();
  deprecations.expecteds = deprecations.NONE;
}

// Expect a deprecation to happen within a function, or if no function
// is pass, from the time of calling until the end of the test. Can be called
// multiple times to assert deprecations with different specific messages
// were fired.
//
// expectDeprecation(function(){
//   Ember.deprecate("Old And Busted");
// }, /* optionalStringOrRegex */);
//
// expectDeprecation(/* optionalStringOrRegex */);
// Ember.deprecate("Old And Busted");
//
export function expectDeprecation(fn, message) {
  if (deprecations.expecteds === deprecations.NONE) {
    throw("A deprecation was expected after expectNoDeprecation was called!");
  }
  deprecations.stubEmber();
  deprecations.expecteds = deprecations.expecteds || [];
  if (fn && typeof fn !== 'function') {
    // fn is a message
    deprecations.expecteds.push(fn);
  } else {
    deprecations.expecteds.push(message || /.*/);
    if (fn) {
      fn();
      this.assertDeprecation();
    }
  }
}

// Forces an assert the deprecations occurred, and resets the globals
// storing asserts for the next run.
//
// expectNoDeprecation(/Old/);
// setTimeout(function(){
//   Ember.deprecate("Old And Busted");
//   assertDeprecation();
// });
//
// assertDeprecation is called after each test run to catch any expectations
// without explicit asserts.
//
export function assertDeprecation() {
  var expecteds = deprecations.expecteds;
  var actuals   = deprecations.actuals || [];
  if (!expecteds) {
    deprecations.actuals = null;
    return;
  }

  deprecations.restoreEmber();
  deprecations.actuals = null;
  deprecations.expecteds = null;

  if (expecteds === deprecations.NONE) {
    var actualMessages = [];
    for (var _actual in actuals) {
      actualMessages.push(_actual[0]);
    }
    this.ok(actuals.length === 0, "Expected no deprecation call, got: "+actualMessages.join(', '));
  } else {
    for (var o=0;o < expecteds.length; o++) {
      var expected = expecteds[o];
      var match, actual;
      for (var i = 0; i < actuals.length; i++) {
        actual = actuals[i];
        if (!actual[1]) {
          if (expected instanceof RegExp) {
            if (expected.test(actual[0])) {
              match = actual;
              break;
            }
          } else {
            if (expected === actual[0]) {
              match = actual;
              break;
            }
          }
        }
      }

      if (!actual) {
        this.ok(false, "Recieved no deprecate calls at all, expecting: " + expected);
      } else if (match && !match[1]) {
        this.ok(true, "Recieved failing deprecation with message: " + match[0]);
      } else if (match && match[1]) {
        this.ok(false, "Expected failing deprecation, got succeeding with message: " + match[0]);
      } else if (actual[1]) {
        this.ok(false, "Did not receive failing deprecation matching '" + expected + "', last was success with '" + actual[0] + "'");
      } else if (!actual[1]) {
        this.ok(false, "Did not receive failing deprecation matching '" + expected + "', last was failure with '" + actual[0] + "'");
      }
    }
  }
}

export default function addEmberAssertions(assertPrototype) {
  Ember.merge(assertPrototype, {
    expectAssertion,
    expectNoDeprecation,
    expectDeprecation,
    assertDeprecation
  });
}
