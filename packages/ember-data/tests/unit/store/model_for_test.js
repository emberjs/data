var container, store, app, SuperVillain;

module("unit/store/serializer_for - DS.Store#modelFor", {

  setup: function() {
    SuperVillain = DS.Model.extend();
    store = createStore({superVillain: SuperVillain});
    container = store.container;
  },

  teardown: function() {
    container.destroy();
    store.destroy();
  }
});

test("Calling modelFor looks up 'model:<type>' from the container", function() {
  equal(store.modelFor('superVillain'), SuperVillain, "model returned from modelFor is the registered Model class");
});

test("Calling modelFor warns if not camelized", function() {
  var oldWarn = Ember.warn;
  Ember.warn = function(message, test){
    ok(!test);
    equal("Model keys should be camelized. You provided 'super_villain' instead of 'superVillain'.", message);
  };
  try {
    expect(store.modelFor('super_villain'), SuperVillain, "normalizes and finds the model");
  }
  finally {
    Ember.warn = oldWarn;
  }
});

