var Person, adapter, serializer, store;

module("Prematerialized Data", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    Person.reopen({
      bestBud: DS.belongsTo(Person),
      drugDealers: DS.hasMany(Person)
    });

    adapter = DS.Adapter.create(),
    serializer = adapter.serializer,
    store = DS.Store.create({ adapter: adapter });

    serializer.extractAttribute = function(type, data, name) {
      return data[name];
    };

    serializer.keyForAttributeName = function(type, name) {
      return name;
    };
  },

  teardown: function() {
    store.destroy();
  }
});

test("after loading a record, a subsequent find materializes the record through the serializer", function() {
  expect(1);

  serializer.extractId = function(type, data) {
    ok(false, "extraction is skipped since the id was already provided");
  };

  store.load(Person, { id: 1, firstName: "Yehuda", lastName: "Katz" }, { id: 1 });

  var person = store.find(Person, 1);
  equal(person.get('firstName'), "Yehuda", "getting an attribute returned the right value");
});

test("after loading a record with prematerialized attributes, a subsequent find materializes the record through the serializer", function() {
  expect(1);

  serializer.extractId = function(type, data) {
    ok(false, "extraction is skipped since the id was already provided");
  };

  store.load(Person, {}, { id: 1, firstName: "Yehuda", lastName: "Katz" });

  var person = store.find(Person, 1);
  equal(person.get('firstName'), "Yehuda", "getting an attribute returned the right value");
});

test("after loading a record with a prematerialized belongsTo relationship, a subsequent find materializes the record through the serializer", function() {
  store.load(Person, {}, { id: 1, firstName: "Tom", lastName: "Dale", bestBud: 2 });
  store.load(Person, {}, { id: 2, firstName: "Yehuda", lastName: "Katz", bestBud: 1 });

  var tom = store.find(Person, 1);
  equal(tom.get('firstName'), "Tom", "attributes are materialized correctly");
  var wycats = tom.get('bestBud');

  equal(wycats.get('firstName'), "Yehuda", "related record was found successfully");
});

test("after loading a record with a prematerialized hasMany relationship, a subsequent find materializes the record through the serializer", function() {
  store.load(Person, {}, { id: 1, firstName: "Peter", lastName: "Wagenet" });
  store.load(Person, {}, { id: 2, firstName: "Tom", lastName: "Dale" });
  store.load(Person, {}, { id: 3, firstName: "Yehuda", lastName: "Katz", drugDealers: [1, 2]  });

  var wycats = store.find(Person, 3);
  equal(wycats.get('firstName'), "Yehuda", "attributes are materialized correctly");

  var drugDealers = wycats.get('drugDealers');

  equal(drugDealers.objectAt(0).get('firstName'), "Peter", "first drug dealer is found");
  equal(drugDealers.objectAt(1).get('firstName'), "Tom", "second drug dealer is found");
});

asyncTest("if a record is found through store.find(), its prematerialized attributes are loaded once the adapter returns", function() {
  expect(1);

  serializer.extractId = function(type, data) {
    ok(false, "extraction is skipped since the id was already provided");
  };

  adapter.find = function(store, type, id) {
    setTimeout(function() {
      store.load(Person, {}, { id: 1, firstName: "Yehuda", lastName: "Katz" });
      equal(person.get('firstName'), "Yehuda", "getting an attribute returned the right value");
      start();
    });
  };
  var person = store.find(Person, 1);
});

asyncTest("if a record is found through store.find(), its prematerialized belongsTo is loaded once the adapter returns", function() {
  adapter.find = function(store, type, id) {
    setTimeout(function() {
      store.load(Person, {}, { id: 1, firstName: "Tom", lastName: "Dale", bestBud: 2 });
      store.load(Person, {}, { id: 2, firstName: "Yehuda", lastName: "Katz", bestBud: 1 });

      var tom = store.find(Person, 1);
      equal(tom.get('firstName'), "Tom", "attributes are materialized correctly");
      var wycats = tom.get('bestBud');

      equal(wycats.get('firstName'), "Yehuda", "related record was found successfully");
      start();
    });
  };
  var person = store.find(Person, 1);
});

asyncTest("if a record is found through store.find(), its prematerialized hasMany is loaded once the adapter returns", function() {
  adapter.find = function(store, type, id) {
    setTimeout(function() {
      store.load(Person, {}, { id: 1, firstName: "Peter", lastName: "Wagenet" });
      store.load(Person, {}, { id: 2, firstName: "Tom", lastName: "Dale" });
      store.load(Person, {}, { id: 3, firstName: "Yehuda", lastName: "Katz", drugDealers: [1, 2]  });

      var wycats = store.find(Person, 3);
      equal(wycats.get('firstName'), "Yehuda", "attributes are materialized correctly");

      var drugDealers = wycats.get('drugDealers');

      equal(drugDealers.objectAt(0).get('firstName'), "Peter", "first drug dealer is found");
      equal(drugDealers.objectAt(1).get('firstName'), "Tom", "second drug dealer is found");

      start();
    });
  };
  var person = store.find(Person, 3);
});
