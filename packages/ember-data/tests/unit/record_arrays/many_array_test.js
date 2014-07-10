var container, store, manyArray;
var ManyArray = DS.ManyArray;

module("unit/record_arrays/many_array - DS.ManyArray", {
  setup: function() {
    store = createStore({});
    container = store.container;

    manyArray = ManyArray.create({
      store: store
    });
  },

  teardown: function() {
    container.destroy();
    store.destroy();
  }
});

test("when calling arrangedContentDidChange on a manyArray where owner._suspendedRelationships is true, fetch is not called ", function() {
  expect(0)

  Ember.run(function(){
    manyArray.set('owner', { _suspendedRelationships: true });
    manyArray.fetch = function() { throw new Error("fetch should not be called"); }
    manyArray.arrangedContentDidChange();
  });
});

