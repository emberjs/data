import Ember from 'ember';

export default function warns(callback, regex) {
  var warnWasCalled = false;
  var oldWarn = Ember.warn;
  Ember.warn = function Ember_assertWarning(message, test) {
    if (!test) {
      warnWasCalled = true;
      if (regex) {
        ok(regex.test(message), 'the call to Ember.warn got an unexpected message: ' + message);
      }
    }
  };
  try {
    callback();
    ok(warnWasCalled, 'expected Ember.warn to warn, but was not called');
  } finally {
    Ember.warn = oldWarn;
  }
}

export function noWarns(callback) {
  var oldWarn = Ember.warn;
  var warnWasCalled = false;
  Ember.warn = function Ember_noWarn(message, test) {
    warnWasCalled = !test;
  };
  try {
    callback();
  } finally {
    ok(!warnWasCalled, 'Ember.warn warned when it should not have warned');
    Ember.warn = oldWarn;
  }
}
