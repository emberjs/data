var env, adapter;
module("unit/adapters/rest_adapter/path_for_type - DS.RESTAdapter#pathForType", {
  setup: function() {
    env = setupStore({
      adapter: DS.RESTAdapter
    });

    adapter = env.adapter;
  }
});

test('pathForType - works with camelized types', function() {
  equal(adapter.pathForType('superUser'), "superUsers");
});

test('pathForType - works with dasherized types', function() {
  equal(adapter.pathForType('super-user'), "superUsers");
});

test('pathForType - works with underscored types', function() {
  equal(adapter.pathForType('super_user'), "superUsers");
});
