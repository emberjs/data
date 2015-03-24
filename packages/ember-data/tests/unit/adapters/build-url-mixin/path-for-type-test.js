var env, adapter;

module("unit/adapters/build-url-mixin/path-for-type - DS.BuildURLMixin#pathForType", {
  setup: function() {
    var Adapter = DS.Adapter.extend(DS.BuildURLMixin);

    env = setupStore({
      adapter: Adapter
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
