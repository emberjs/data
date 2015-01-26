var container, store;

var camelize  = Ember.String.camelize;
var capitalize = Ember.String.capitalize;

var run = Ember.run;
var env;

function containerNormalize(string) {
  return container.normalize('model:'+string).slice(6);
}

module("unit/store/model_for - DS.Store#modelFor", {
  setup: function() {
    env = setupStore({
      "blog.post": DS.Model.extend(),
      "blog_post": DS.Model.extend(),
      "blogPost": DS.Model.extend(),
      "BlogPost": DS.Model.extend()
    });
    store = env.store;
    container = store.container;
  },

  teardown: function() {
    run(function() {
      container.destroy();
      store.destroy();
    });
  }
});

// In this test, the normalizer is nothing at all. This is the default for
// containers, most notably in unit tests. Note that the Ember application
// container *does* have normalization logic, and that is tested in the next
// test.
test("when fetching factory from string, sets a normalized key as typeKey", function() {
  equal(containerNormalize('some.post'), 'some.post', 'precond - container does nothing to dots');
  equal(store.modelFor("blog.post").typeKey, "blog.post", "typeKey is normalized");
  equal(store.modelFor("blog_post").typeKey, "blog_post", "typeKey is normalized");
  equal(store.modelFor("blogPost").typeKey, "blogPost", "typeKey is normalized");
});

// Test a container similar to the Ember application container- one with
// normalization.
test("when fetching factory from string and non-default normalizer, sets a normalized key as typeKey", function() {
  env.replaceContainerNormalize(function(fullName) {
    return 'model:'+capitalize(camelize(fullName.slice(6)));
  });

  equal(containerNormalize('some.post'), 'SomePost', 'precond - container titlizes');
  equal(store.modelFor("blog.post").typeKey, "BlogPost", "typeKey is normalized");
  equal(store.modelFor("blog_post").typeKey, "BlogPost", "typeKey is normalized");
  equal(store.modelFor("blog-post").typeKey, "BlogPost", "typeKey is normalized");
});

test("when returning passed factory, sets a normalized key as typeKey", function() {
  env.replaceContainerNormalize(function(fullName) {
    return 'model:'+capitalize(camelize(fullName.slice(6)));
  });

  var factory = { typeKey: 'some-thing' };
  equal(store.modelFor(factory).typeKey, "SomeThing", "typeKey is normalized");
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
