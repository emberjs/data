import { get } from '@ember/object';
import QUnit, { module, test } from 'qunit';
import DS from 'ember-data';

const { assert } = QUnit;

let rootState, stateName;

module('unit/states - Flags for record states', {
  beforeEach() {
    rootState = DS.RootState;
  }
});

assert.flagIsTrue = function flagIsTrue(flag) {
  this.equal(get(rootState, stateName + '.' + flag), true, stateName + '.' + flag + ' should be true');
};

assert.flagIsFalse = function flagIsFalse(flag) {
  this.equal(get(rootState, stateName + '.' + flag), false, stateName + '.' + flag + ' should be false');
};

test('the empty state', function(assert) {
  stateName = 'empty';
  assert.flagIsFalse('isLoading');
  assert.flagIsFalse('isLoaded');
  assert.flagIsFalse('isDirty');
  assert.flagIsFalse('isSaving');
  assert.flagIsFalse('isDeleted');
});

test('the loading state', function(assert) {
  stateName = 'loading';
  assert.flagIsTrue('isLoading');
  assert.flagIsFalse('isLoaded');
  assert.flagIsFalse('isDirty');
  assert.flagIsFalse('isSaving');
  assert.flagIsFalse('isDeleted');
});

test('the loaded state', function(assert) {
  stateName = 'loaded';
  assert.flagIsFalse('isLoading');
  assert.flagIsTrue('isLoaded');
  assert.flagIsFalse('isDirty');
  assert.flagIsFalse('isSaving');
  assert.flagIsFalse('isDeleted');
});

test('the updated state', function(assert) {
  stateName = 'loaded.updated';
  assert.flagIsFalse('isLoading');
  assert.flagIsTrue('isLoaded');
  assert.flagIsTrue('isDirty');
  assert.flagIsFalse('isSaving');
  assert.flagIsFalse('isDeleted');
});

test('the saving state', function(assert) {
  stateName = 'loaded.updated.inFlight';
  assert.flagIsFalse('isLoading');
  assert.flagIsTrue('isLoaded');
  assert.flagIsTrue('isDirty');
  assert.flagIsTrue('isSaving');
  assert.flagIsFalse('isDeleted');
});

test('the deleted state', function(assert) {
  stateName = 'deleted';
  assert.flagIsFalse('isLoading');
  assert.flagIsTrue('isLoaded');
  assert.flagIsTrue('isDirty');
  assert.flagIsFalse('isSaving');
  assert.flagIsTrue('isDeleted');
});

test('the deleted.saving state', function(assert) {
  stateName = 'deleted.inFlight';
  assert.flagIsFalse('isLoading');
  assert.flagIsTrue('isLoaded');
  assert.flagIsTrue('isDirty');
  assert.flagIsTrue('isSaving');
  assert.flagIsTrue('isDeleted');
});

test('the deleted.saved state', function(assert) {
  stateName = 'deleted.saved';
  assert.flagIsFalse('isLoading');
  assert.flagIsTrue('isLoaded');
  assert.flagIsFalse('isDirty');
  assert.flagIsFalse('isSaving');
  assert.flagIsTrue('isDeleted');
});
