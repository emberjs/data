var container, store;

var camelize  = Ember.String.camelize,
    dasherize = Ember.String.dasherize;

module("unit/store/model_for - DS.Store#modelFor", {
  setup: function() {
    store = createStore({
      blogPost: DS.Model.extend(),
      "blog-post": DS.Model.extend()
    });
    container = store.container;
  },

  teardown: function() {
    container.destroy();
    store.destroy();
  }
});

test("when fetching factory from string, sets a normalized key as typeKey", function() {
  container.normalize = function(fullName){
    return camelize(fullName);
  };

  equal(container.normalize('some.post'), 'somePost', 'precond - container camelizes');
  equal(store.modelFor("blog.post").typeKey, "blogPost", "typeKey is normalized to camelCase");
});

test("when fetching factory from string and dashing normalizer, sets a normalized key as typeKey", function() {
  container.normalize = function(fullName){
    return dasherize(camelize(fullName));
  };

  equal(container.normalize('some.post'), 'some-post', 'precond - container dasherizes');
  equal(store.modelFor("blog.post").typeKey, "blogPost", "typeKey is normalized to camelCase");
});

test("when returning passed factory, sets a normalized key as typeKey", function() {
  var factory = {typeKey: 'some-thing'};
  equal(store.modelFor(factory).typeKey, "someThing", "typeKey is normalized to camelCase");
});

test("when returning passed factory without typeKey, allows it", function() {
  var factory = {typeKey: undefined};
  equal(store.modelFor(factory).typeKey, undefined, "typeKey is undefined");
});
