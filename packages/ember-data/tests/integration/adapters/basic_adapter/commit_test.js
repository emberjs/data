var get = Ember.get;

var store, adapter, Person, PhoneNumber;
module("Basic Adapter - Saving", {
  setup: function() {
    adapter = DS.BasicAdapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      createdAt: attr('date')
    });

    PhoneNumber = DS.Model.extend({
      areaCode: attr('number'),
      number: attr('number'),
      person: belongsTo(Person)
    });

    Person.reopen({
      phoneNumbers: hasMany(PhoneNumber)
    });

    DS.registerTransforms('test', {
      date: {
        serialize: function(value) {
          return value.toString();
        },

        deserialize: function(string) {
          return new Date(string);
        }
      }
    });
  },

  teardown: function() {
    Ember.run(function() {
      DS.clearTransforms();
      store.destroy();
      adapter.destroy();
    });
  }
});

test("After creating a record, calling `save` on it will save it using the BasicAdapter", function() {
  Person.sync = {
    createRecord: function(passedRecord, process) {
      equal(passedRecord, person, "The person was passed through");
      process(passedRecord).save(function(json) {
        deepEqual(json, { firstName: "Igor", lastName: "Terzic", createdAt: null }, "The process method toJSON'ifies the record");
      });
    }
  };

  var person = Person.createRecord({ firstName: "Igor", lastName: "Terzic" });
  person.save();
});
