var container, store, registry;

var camelize  = Ember.String.camelize;
var dasherize = Ember.String.dasherize;

var run = Ember.run;
var env;

module("unit/store/model_for - DS.Store#modelFor", {
  setup() {
    env = setupStore({
      blogPost: DS.Model.extend(),
      "blog.post": DS.Model.extend()
    });
    store = env.store;
    container = store.container;
    registry = env.registry;
  },

  teardown() {
    run(function() {
      container.destroy();
      store.destroy();
    });
  }
});

test("when fetching factory from string, sets a normalized key as modelName", function() {
  env.replaceContainerNormalize(function(key) {
    return dasherize(camelize(key));
  });

  equal(registry.normalize('some.post'), 'some-post', 'precond - container camelizes');
  equal(store.modelFor("blog.post").modelName, "blog.post", "modelName is normalized to dasherized");
});

test("when fetching factory from string and dashing normalizer, sets a normalized key as modelName", function() {
  env.replaceContainerNormalize(function(key) {
    return dasherize(camelize(key));
  });
  equal(registry.normalize('some.post'), 'some-post', 'precond - container dasherizes');
  equal(store.modelFor("blog.post").modelName, "blog.post", "modelName is normalized to dasherized");
});

test("when returning passed factory, sets a normalized key as modelName", function() {
  var factory = { modelName: 'some-thing' };
  equal(store.modelFor(factory).modelName, "some-thing", "modelName is normalized to dasherized");
});

test("when returning passed factory without modelName, allows it", function() {
  var factory = { modelName: undefined };
  equal(store.modelFor(factory).modelName, undefined, "modelName is undefined");
});

test("when fetching something that doesn't exist, throws error", function() {
  throws(function() {
    store.modelFor('wild-stuff');
  }, /No model was found/);
});
