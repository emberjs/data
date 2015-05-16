var run = Ember.run;

var TestAdapter = DS.Adapter.extend();

module("Debug");

test("_debugInfo groups the attributes and relationships correctly", function() {
  var MaritalStatus = DS.Model.extend({
    name: DS.attr('string')
  });

  var Post = DS.Model.extend({
    title: DS.attr('string')
  });

  var User = DS.Model.extend({
    name: DS.attr('string'),
    isDrugAddict: DS.attr('boolean'),
    maritalStatus: DS.belongsTo('marital-status'),
    posts: DS.hasMany('post')
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

  equal(propertyInfo.groups.length, 4);
  deepEqual(propertyInfo.groups[0].properties, ['id', 'name', 'isDrugAddict']);
  deepEqual(propertyInfo.groups[1].properties, ['maritalStatus']);
  deepEqual(propertyInfo.groups[2].properties, ['posts']);
});
