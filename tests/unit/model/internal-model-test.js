import DS from 'ember-data';

import {module, test} from 'qunit';

module("unit/model/internal-model - Internal Model");

function MockModelFactory () { }

MockModelFactory._create = function() {
  return { trigger: function() {} };
};

MockModelFactory.eachRelationship = function() { };

test("Materializing a model twice errors out", function(assert) {
  assert.expect(1);
  var internalModel = new DS.InternalModel(MockModelFactory, null, { }, null);

  internalModel.materializeRecord();
  assert.expectAssertion(function() {
    internalModel.materializeRecord();
  }, /more than once/);
});
