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
  expect(4);

  Person.sync = {
    createRecord: function(record, didSave) {
      equal(record, person, "The person was passed through");
      deepEqual(record.toJSON(), { firstName: "Igor", lastName: "Terzic", createdAt: null }, "It is possible to call toJSON on a record");
      didSave();
    }
  };

  var person = Person.createRecord({ firstName: "Igor", lastName: "Terzic" });
  person.save().then(async(function(p) {
    strictEqual(p, person);
    equal(p.get('isSaving'), false);
  }));
});

test("After updating a record, calling `save` on it will save it using the BasicAdapter", function() {
  expect(4);

  Person.sync = {
    updateRecord: function(record, didSave) {
      equal(record, person, "The person was passed through");
      deepEqual(record.toJSON({ includeId: true }), { id: 1, firstName: "Igor", lastName: "Terzicsta", createdAt: null }, "The process method toJSON'ifies the record");
      didSave();
    }
  };

  store.load(Person, { id: 1, firstName: "Igor", lastName: "Terzic" });
  var person = Person.find(1);
  person.set('lastName', "Terzicsta");

  person.save().then(async(function(p) {
    strictEqual(p, person);
    equal(p.get('isSaving'), false);
  }));
});

test("After deleting a record, calling `save` on it will save it using the BasicAdapter", function() {
  expect(4);

  Person.sync = {
    deleteRecord: function(record, didSave) {
      equal(record, person, "The person was passed through");
      deepEqual(person.toJSON({ includeId: true }), { id: 1, firstName: "Igor", lastName: "Terzic", createdAt: null }, "The process method toJSON'ifies the record");
      didSave();
    }
  };

  store.load(Person, { id: 1, firstName: "Igor", lastName: "Terzic" });
  var person = Person.find(1);
  person.deleteRecord();
  person.save().then(async(function(p) {
    strictEqual(p, person);
    equal(p.get('isSaving'), false);
  }));
});
