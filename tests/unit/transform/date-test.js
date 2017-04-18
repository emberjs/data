import {module, test} from 'qunit';

import DS from 'ember-data';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { parseDate } from 'ember-data/-private/ext/date';

module('unit/transform - DS.DateTransform');

let dateString = '2015-01-01T00:00:00.000Z';
let dateInMillis = parseDate(dateString);
let date = new Date(dateInMillis);

test('#serialize', function(assert) {
  let transform = new DS.DateTransform();

  assert.equal(transform.serialize(null), null);
  assert.equal(transform.serialize(undefined), null);
  assert.equal(transform.serialize(new Date('invalid')), null);

  assert.equal(transform.serialize(date), dateString);

  assert.equal(transform.serialize('2015-01-01'), '2015-01-01');
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

test('#deserialize with different offset formats', function(assert) {
  let transform = new DS.DateTransform();
  let dateString = '2003-05-24T23:00:00.000+0000';
  let dateStringColon = '2013-03-15T23:22:00.000+00:00';
  let dateStringShortOffset = '2016-12-02T17:30:00.000+00';

  assert.expect(6);

  let _dateUTC = Date.UTC;

  try {
    Date.UTC = function () {
      assert.equal(arguments.length, 7);
      return _dateUTC.apply(this, [].slice.call(arguments));
    };

    assert.equal(transform.deserialize(dateString).getTime(), 1053817200000);
    assert.equal(transform.deserialize(dateStringShortOffset).getTime(), 1480699800000);
    assert.equal(transform.deserialize(dateStringColon).getTime(), 1363389720000);
  } finally {
    Date.UTC = _dateUTC;
  }
});

testInDebug('Ember.Date.parse has been deprecated', function(assert) {
  assert.expectDeprecation(() => {
    Ember.Date.parse(dateString);
  }, /Ember.Date.parse is deprecated/);
});
