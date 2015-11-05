import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var run = Ember.run;

var TestAdapter = DS.Adapter.extend();

module("Debug");

test("_debugInfo groups the attributes and relationships correctly", function(assert) {
  var MaritalStatus = DS.Model.extend({
    name: DS.attr('string')
  });

  var Post = DS.Model.extend({
    title: DS.attr('string')
  });

  var User = DS.Model.extend({
    name: DS.attr('string'),
    isDrugAddict: DS.attr('boolean'),
    maritalStatus: DS.belongsTo('marital-status', { async: false }),
    posts: DS.hasMany('post', { async: false })
  });

  var store = createStore({
    adapter: TestAdapter.extend(),
    maritalStatus: MaritalStatus,
    post: Post,
    user: User
  });
  var record;

  run(function() {
    record = store.createRecord('user');
  });

  var propertyInfo = record._debugInfo().propertyInfo;

  assert.equal(propertyInfo.groups.length, 4);
  assert.deepEqual(propertyInfo.groups[0].properties, ['id', 'name', 'isDrugAddict']);
  assert.deepEqual(propertyInfo.groups[1].properties, ['maritalStatus']);
  assert.deepEqual(propertyInfo.groups[2].properties, ['posts']);
});
