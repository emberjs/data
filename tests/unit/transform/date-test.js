import {module, test} from 'qunit';

import DS from 'ember-data';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';

module('unit/transform - DS.DateTransform');

let dateString = '2015-01-01T00:00:00.000Z';
let dateInMillis = Date.parse(dateString);
let date = new Date(dateString);

test('#serialize', function(assert) {
  let transform = new DS.DateTransform();

  assert.equal(transform.serialize(null), null);
  assert.equal(transform.serialize(undefined), null);
  assert.equal(transform.serialize(new Date('invalid')), null);

  assert.equal(transform.serialize(date), dateString);
});

test('#deserialize', function(assert) {
  let transform = new DS.DateTransform();

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

testInDebug('#deserialize with different offset formats', function(assert) {
  let transform = new DS.DateTransform();
  let dateString = '2003-05-24T23:00:00.000+0000';
  let dateStringColon = '2013-03-15T23:22:00.000+00:00';
  let dateStringShortOffset = '2016-12-02T17:30:00.000+00';

  assert.expect(4);

  let deserialized;
  assert.expectDeprecation(() => {
    deserialized = transform.deserialize(dateStringShortOffset).getTime();
  }, /The ECMA2015 Spec for ISO 8601 dates does not allow for shorthand timezone offsets such as \+00/);

  assert.equal(transform.deserialize(dateString).getTime(), 1053817200000, 'date-strings with no-colon offsets are ok');
  assert.equal(deserialized, 1480699800000, 'This test can be removed once the deprecation is removed');
  assert.equal(transform.deserialize(dateStringColon).getTime(), 1363389720000,  'date-strings with colon offsets are ok');
});

testInDebug('Ember.Date.parse has been deprecated', function(assert) {
  assert.expectDeprecation(() => {
    Ember.Date.parse(dateString);
  }, /Ember.Date.parse is deprecated/);
});
