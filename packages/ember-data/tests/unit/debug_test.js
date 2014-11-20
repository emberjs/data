var store;

var TestAdapter = DS.Adapter.extend();

module("Debug", {
  setup: function() {
    store = DS.Store.create({
      adapter: TestAdapter.extend()
    });
  },

  teardown: function() {
    store.destroy();
    store = null;
  }
});

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
    maritalStatus: DS.belongsTo(MaritalStatus),
    posts: DS.hasMany(Post)
  });

  var record = store.createRecord(User);

  var propertyInfo = record._debugInfo().propertyInfo;

  equal(propertyInfo.groups.length, 4);
  deepEqual(propertyInfo.groups[0].properties, ['id', 'name', 'isDrugAddict']);
  deepEqual(propertyInfo.groups[1].properties, ['maritalStatus']);
  deepEqual(propertyInfo.groups[2].properties, ['posts']);
});
