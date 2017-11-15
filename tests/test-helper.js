/*
  babel@6 currently (6.24.0) puts `import 'foo'` (for side effects) at the
  end of the module dep list.  Unfortunately, for this to work `setup-ember-dev`
  must be evaluated before the `qunit` module is evaluated (because we change
  `QUnit.module`).
 */
import RSVP from 'rsvp';

import Application from '@ember/application';
import requiredWorkAroundBabelBug from 'dummy/tests/helpers/setup-ember-dev'; // eslint-disable-line
import resolver from './helpers/resolver';
import {
  setResolver
} from 'ember-qunit';
import QUnit from 'qunit';
import DS from 'ember-data';
import {
  wait,
  asyncEqual,
  invokeAsync
} from 'dummy/tests/helpers/async';
import Ember from 'ember';
import loadInitializers from 'ember-load-initializers';

setResolver(resolver);
loadInitializers(Application, 'dummy');

const { assert } = QUnit;
const transforms = {
  boolean: DS.BooleanTransform.create(),
  date:    DS.DateTransform.create(),
  number:  DS.NumberTransform.create(),
  string:  DS.StringTransform.create()
};

QUnit.begin(() => {
  RSVP.configure('onerror', reason => {
    // only print error messages if they're exceptions;
    // otherwise, let a future turn of the event loop
    // handle the error.
    if (reason && reason instanceof Error) {
      Ember.Logger.log(reason, reason.stack);
      throw reason;
    }
  });

  // Prevent all tests involving serialization to require a container
  DS.JSONSerializer.reopen({
    transformFor(attributeType) {
      return this._super(attributeType, true) || transforms[attributeType];
    }
  });

});

assert.wait = wait;
assert.asyncEqual = asyncEqual;
assert.invokeAsync = invokeAsync;
assert.assertClean = function(promise) {
  return promise.then(this.wait(record => {
    this.equal(record.get('hasDirtyAttributes'), false, 'The record is now clean');
    return record;
  }));
};

assert.contains = function(array, item) {
  this.ok(array.indexOf(item) !== -1, `array contains ${item}`);
};

assert.without = function(array, item)  {
  this.ok(array.indexOf(item) === -1, `array doesn't contain ${item}`);
};

QUnit.config.testTimeout = 2000;
QUnit.config.urlConfig.push({
  id: 'enableoptionalfeatures',
  label: 'Enable Opt Features'
});
