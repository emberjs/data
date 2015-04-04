var container, store, registry;

var camelize  = Ember.String.camelize;
var dasherize = Ember.String.dasherize;

var run = Ember.run;
var env;

module("unit/store/model_for - DS.Store#modelFor", {
  setup: function() {
    env = setupStore({
      blogPost: DS.Model.extend(),
      "blog-post": DS.Model.extend()
    });
    store = env.store;
    container = store.container;
    registry = env.registry;
  },

  teardown: function() {
    run(function() {
      container.destroy();
      store.destroy();
    });
  }
});

test("when fetching factory from string, sets a normalized key as typeKey", function() {
  env.replaceContainerNormalize(camelize);

  equal(registry.normalize('some.post'), 'somePost', 'precond - container camelizes');
  equal(store.modelFor("blog.post").typeKey, "blogPost", "typeKey is normalized to camelCase");
});

test("when fetching factory from string and dashing normalizer, sets a normalized key as typeKey", function() {
  env.replaceContainerNormalize(function(fullName) {
    return dasherize(camelize(fullName));
  });

  equal(registry.normalize('some.post'), 'some-post', 'precond - container dasherizes');
  equal(store.modelFor("blog.post").typeKey, "blogPost", "typeKey is normalized to camelCase");
});

test("when returning passed factory, sets a normalized key as typeKey", function() {
  var factory = { typeKey: 'some-thing' };
  equal(store.modelFor(factory).typeKey, "someThing", "typeKey is normalized to camelCase");
});

test("when returning passed factory without typeKey, allows it", function() {
  var factory = { typeKey: undefined };
  equal(store.modelFor(factory).typeKey, undefined, "typeKey is undefined");
});

test("when fetching something that doesn't exist, throws error", function() {
  throws(function() {
    store.modelFor('wild-stuff');
  }, /No model was found/);
});
