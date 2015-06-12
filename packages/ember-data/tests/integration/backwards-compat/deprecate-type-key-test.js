var Post, env;
module('integration/backwards-compat/deprecate-type-key', {
  setup: function() {
    env = setupStore({
      post: DS.Model.extend()
    });
    Post = env.store.modelFor('post');
  },

  teardown: function() {
  }
});

if (Ember.platform.hasPropertyAccessors) {
  test('typeKey is deprecated', function() {
    expectDeprecation(function() {
      return Post.typeKey;
    });
  });

  test('setting typeKey is not allowed', function() {
    throws(function() {
      Post.typeKey = 'hello';
    });
  });
}
