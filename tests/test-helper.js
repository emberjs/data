import RSVP from 'rsvp';

import Application from '@ember/application';
import resolver from './helpers/resolver';
import {
  setResolver
} from '@ember/test-helpers';
import { start } from 'ember-qunit';

import QUnit from 'qunit';
import DS from 'ember-data';
import {
  wait,
  asyncEqual,
  invokeAsync
} from 'dummy/tests/helpers/async';
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
start({ setupTestIsolationValidation: true });
