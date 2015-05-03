var env, store, Person, PhoneNumber;
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var run = Ember.run;

module("unit/store/hasRecordForId - Store hasRecordForId", {
  setup: function() {

    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number')
    });
    Person.toString = function() {
      return 'Person';
    };

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person')
    });
    PhoneNumber.toString = function() {
      return 'PhoneNumber';
    };

    env = setupStore({
      person: Person,
      "phone-number": PhoneNumber
    });

    store = env.store;

  },

  teardown: function() {
    Ember.run(store, 'destroy');
  }
});

test("hasRecordForId should return false for records in the empty state ", function() {

  run(function() {
    store.push('person', {
      id: 1,
      firstName: "Yehuda",
      lastName: "Katz",
      phoneNumbers: [1]
    });

    equal(false, store.hasRecordForId('phone-number', 1), 'hasRecordForId only returns true for loaded records');

  });
});

test("hasRecordForId should return true for records in the loaded state ", function() {
  run(function() {
    store.push('person', {
      id: 1,
      firstName: "Yehuda",
      lastName: "Katz",
      phoneNumbers: [1]
    });

    equal(true, store.hasRecordForId('person', 1), 'hasRecordForId returns true for records loaded into the store');
  });
});
