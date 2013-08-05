var store, container, adapter, Person, PhoneNumber;
var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

module("DS.Store - push - unit/store/push_test", {
  setup: function() {
    Ember.assert = function(desc, test) { if (!test) { throw new Error(desc); } };
    container = new Ember.Container();
    adapter = DS.Adapter.create();

    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number')
    });

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person')
    });

    store = DS.Store.create({
      container: container,
      adapter: adapter
    });

    var DefaultSerializer = DS.NewJSONSerializer.extend({
      store: store
    });

    container.register('model:person', Person);
    container.register('model:phone-number', PhoneNumber);
    container.register('serializer:_default', DefaultSerializer);
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
      container.destroy();
    });
  }
});

test("Calling push with a normalized hash returns a record", function() {
  var person = store.push('person', {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });

  strictEqual(store.find('person', 'wat'), person, "record returned via load() is the same as the record returned from find()");
  deepEqual(person.getProperties('id', 'firstName', 'lastName'), {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });
});

test("Calling push with a normalized hash containing related records returns a record", function() {
  var number1 = store.push('phone-number', {
    id: 1,
    number: '5551212',
    person: 'wat'
  });

  var number2 = store.push('phone-number', {
    id: 2,
    number: '5552121',
    person: 'wat'
  });

  var person = store.push('person', {
    id: 'wat',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumbers: [number1, number2]
  });

  deepEqual(person.get('phoneNumbers').toArray(), [ number1, number2 ], "phoneNumbers array is correct");
});

test("Calling push with a normalized hash containing IDs of related records returns a record", function() {
  var person = store.push('person', {
    id: 'wat',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumbers: ["1", "2"]
  });

  adapter.find = function(store, type, id) {
    if (id === "1") {
      store.push('phone-number', {
        id: 1,
        number: '5551212',
        person: 'wat'
      });
    }

    if (id === "2") {
      store.push('phone-number', {
        id: 2,
        number: '5552121',
        person: 'wat'
      });
    }
  };

  var phoneNumbers = person.get('phoneNumbers');

  deepEqual(phoneNumbers.map(function(item) {
    return item.getProperties('id', 'number', 'person');
  }), [{
    id: "1",
    number: '5551212',
    person: person
  }, {
    id: "2",
    number: '5552121',
    person: person
  }]);
});
