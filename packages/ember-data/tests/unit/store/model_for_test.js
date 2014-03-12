var container, store;

module("unit/store/model_for - DS.Store#modelFor", {
  setup: function() {
    store = createStore({blogPost: DS.Model.extend()});
    container = store.container;
  },

  teardown: function() {
    container.destroy();
    store.destroy();
  }
});

test("sets a normalized key as typeKey", function() {
  container.normalize = function(fullName){
    return Ember.String.camelize(fullName);
  };

  ok(store.modelFor("blog.post").typeKey, "blogPost", "typeKey is normalized");
});
