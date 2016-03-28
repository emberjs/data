import {module, test} from 'qunit';

import DS from 'ember-data';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { parseDate } from "ember-data/-private/ext/date";

module("unit/transform - DS.DateTransform");

var dateString = "2015-01-01T00:00:00.000Z";
var dateInMillis = parseDate(dateString);
var date = new Date(dateInMillis);
var run = Ember.run;

test("#serialize", function(assert) {
  var transform = new DS.DateTransform();

  assert.equal(transform.serialize(null), null);
  assert.equal(transform.serialize(undefined), null);

  assert.equal(transform.serialize(date), dateString);
});

test("#deserialize", function(assert) {
  var transform = new DS.DateTransform();

  // from String
  assert.equal(transform.deserialize(dateString).toISOString(), dateString);

  // from Number
  assert.equal(transform.deserialize(dateInMillis).valueOf(), dateInMillis);

  // from other
  assert.equal(transform.deserialize({}), null);

  // from none
  assert.equal(transform.deserialize(null), null);
  assert.equal(transform.deserialize(undefined), null);
});

testInDebug('Ember.Date.parse has been deprecated', function(assert) {
  run(function() {
    assert.expectDeprecation(function() {
      Ember.Date.parse(dateString);
    }, /Ember.Date.parse is deprecated/);
  });
});
