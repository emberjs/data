var env, adapter;

module("unit/adapters/build-url-mixin/path-for-type - DS.BuildURLMixin#pathForType", {
  setup: function() {

    // test for overriden pathForType methods which return null path values
    var customPathForType = {
      pathForType: function(type) {
        if (type === 'rootModel') { return ''; }
        return this._super(type);
      }
    };

    var Adapter = DS.Adapter.extend(DS.BuildURLMixin, customPathForType);

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

test('buildURL - works with empty paths', function() {
  equal(adapter.buildURL('rootModel', 1), "/1");
});
