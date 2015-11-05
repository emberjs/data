import Ember from 'ember';

import DS from 'ember-data';

var get = Ember.get;
var run = Ember.run;

var Person, store, array, moreArray;

module("integration/peek-all - DS.Store#peekAll()", {
  setup: function() {
    array = {
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: "Scumbag Dale"
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: "Scumbag Katz"
        }
      }]
    };
    moreArray = {
      data: [{
        type: 'person',
        id: '3',
        attributes: {
          name: "Scumbag Bryn"
        }
      }]
    };

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
    store.push(array);
  });

  var all = store.peekAll('person');
  equal(get(all, 'length'), 2);

  run(function() {
    store.push(moreArray);
  });

  equal(get(all, 'length'), 3);
});

test("Calling store.peekAll() multiple times should update immediately inside the runloop", function() {
  expect(3);

  Ember.run(function() {
    equal(get(store.peekAll('person'), 'length'), 0, 'should initially be empty');
    store.createRecord('person', { name: "Tomster" });
    equal(get(store.peekAll('person'), 'length'), 1, 'should contain one person');
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tomster's friend"
        }
      }
    });
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
