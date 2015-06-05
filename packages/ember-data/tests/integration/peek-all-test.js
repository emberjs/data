var get = Ember.get;
var run = Ember.run;

var Person, store, array, moreArray;

module("integration/peek_all - DS.Store#peekAll()", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }];
    moreArray = [{ id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });

    store = createStore({ person: Person });
  },
  teardown: function() {
    run(store, 'destroy');
    Person = null;
    array = null;
  }
});

test("store.peekAll('person') should return all records and should update with new ones", function() {
  run(function() {
    store.pushMany('person', array);
  });

  var all = store.peekAll('person');
  equal(get(all, 'length'), 2);

  run(function() {
    store.pushMany('person', moreArray);
  });

  equal(get(all, 'length'), 3);
});

test("Calling store.peekAll() multiple times should update immediately inside the runloop", function() {
  expect(3);

  Ember.run(function() {
    equal(get(store.peekAll('person'), 'length'), 0, 'should initially be empty');
    store.createRecord('person', { name: "Tomster" });
    equal(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
    store.push('person', { id: 1, name: "Tomster's friend" });
    equal(get(store.peekAll('person'), 'length'), 2, 'should contain two people');
  });
});

test("Calling store.peekAll() after creating a record should return correct data", function() {
  expect(1);

  Ember.run(function() {
    store.createRecord('person', { name: "Tomster" });
    equal(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
  });
});

test("store.all() is deprecated", function() {
  expectDeprecation(
    function() {
      run(function() {
        store.all('person');
      });
    },
    'Using store.all() has been deprecated. Use store.peekAll() to get all records by a given type without triggering a fetch.'
  );
});
