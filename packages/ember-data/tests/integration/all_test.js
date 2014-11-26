var get = Ember.get;

var Person, store, array, moreArray;

module("integration/all - DS.Store#all()", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }];
    moreArray = [{ id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });

    store = createStore({ person: Person });
  },
  teardown: function() {
    store.destroy();
    Person = null;
    array = null;
  }
});

test("store.all('person') should return all records and should update with new ones", function() {
  store.pushMany('person', array);

  var all = store.all('person');
  equal(get(all, 'length'), 2);

  store.pushMany('person', moreArray);

  equal(get(all, 'length'), 3);
});
