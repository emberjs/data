import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var get = Ember.get;

var rootState, stateName;

module("unit/states - Flags for record states", {
  beforeEach: function() {
    rootState = DS.RootState;
  }
});

var isTrue = function(flag) {
  assert.equal(get(rootState, stateName + "." + flag), true, stateName + "." + flag + " should be true");
};

var isFalse = function(flag) {
  assert.equal(get(rootState, stateName + "." + flag), false, stateName + "." + flag + " should be false");
};

test("the empty state", function(assert) {
  stateName = "empty";
  isFalse("isLoading");
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
});

test("the loading state", function(assert) {
  stateName = "loading";
  isTrue("isLoading");
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
});

test("the loaded state", function(assert) {
  stateName = "loaded";
  isFalse("isLoading");
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
});

test("the updated state", function(assert) {
  stateName = "loaded.updated";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
});

test("the saving state", function(assert) {
  stateName = "loaded.updated.inFlight";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isFalse("isDeleted");
});

test("the deleted state", function(assert) {
  stateName = "deleted";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
});

test("the deleted.saving state", function(assert) {
  stateName = "deleted.inFlight";
  isFalse("isLoading");
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isTrue("isDeleted");
});

test("the deleted.saved state", function(assert) {
  stateName = "deleted.saved";
  isFalse("isLoading");
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
});
