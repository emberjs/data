var store = {};
var type = 'post';
var id = 1;
var snapshot = {};

module("unit/adapters/rest-adapter/deprecated-adapter-methods - ");

test("`findRecord` delegates to deprecated find method if it is supplied", function() {
  expect(2);

  var adapter = DS.RESTAdapter.extend({
    find: function() {
      ok(true, 'overridden `find` method should be called');
    }
  }).create();

  expectDeprecation(function() {
    adapter.findRecord(store, type, id, snapshot);
  }, /RestAdapter#find has been deprecated and renamed to `findRecord`./);
});


test("`query` delegates to deprecated findQuery method if it is supplied", function() {
  expect(2);

  var adapter = DS.RESTAdapter.extend({
    findQuery: function() {
      ok(true, 'overridden `findQuery` method should be called');
    }
  }).create();

  expectDeprecation(function() {
    adapter.query(store, type, id, snapshot);
  }, /RestAdapter#findQuery has been deprecated and renamed to `query`./);
});
