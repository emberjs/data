import DS from 'ember-data';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module } from 'qunit';

module("unit/model/internal-model - Internal Model");

function MockModelFactory () { }

MockModelFactory._create = function() {
  return { trigger() {} };
};

MockModelFactory.eachRelationship = function() { };

testInDebug("Materializing a model twice errors out", function(assert) {
  assert.expect(1);
  var internalModel = new DS.InternalModel(MockModelFactory, null, { }, null);

  internalModel.materializeRecord();
  assert.expectAssertion(function() {
    internalModel.materializeRecord();
  }, /more than once/);
});
