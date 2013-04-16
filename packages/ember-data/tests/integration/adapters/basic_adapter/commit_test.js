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
  expect(6);

  Person.sync = {
    createRecord: function(passedRecord, process) {
      equal(passedRecord, person, "The person was passed through");
      process(passedRecord).save(function(json, process) {
        deepEqual(json, { firstName: "Igor", lastName: "Terzic", createdAt: null }, "The process method toJSON'ifies the record");
        json.id = '1';
        process(json).done();
      });
    }
  };

  var person = Person.createRecord({ firstName: "Igor", lastName: "Terzic" });
  equal(person.get('isNew'), true, 'record is new');
  equal(person.get('isDirty'), true, 'record is dirty');

  person.save();

  equal(person.get('id'), '1', 'record should have an id');
  equal(person.get('isDirty'), false, 'record should not be dirty');
});

test("After updating a record, calling `save` on it will save it using the BasicAdapter", function() {
  expect(7);

  var savedJSON = { id: 1, firstName: "Igor", lastName: "Terzicsta", createdAt: null };

  Person.sync = {
    updateRecord: function(passedRecord, process) {
      equal(passedRecord, person, "The person was passed through");
      process(passedRecord).save(function(json, done) {
        deepEqual(json, savedJSON, "The process method toJSON'ifies the record");
        done();
      });
    }
  };

  store.load(Person, { id: 1, firstName: "Igor", lastName: "Terzic" });
  var person = Person.find(1);
  person.set('lastName', "Terzicsta");

  equal(person.get('isDirty'), true, 'record is dirty');

  person.save();

  equal(person.get('isDirty'), false, 'record should not be dirty');

  person.set('lastName', "Terzicstaaaa");

  savedJSON.lastName = "Terzicstaaaa";

  person.save();

  equal(person.get('isDirty'), false, 'record should not be dirty');
});

test("After deleting a record, calling `save` on it will save it using the BasicAdapter", function() {
  expect(5);

  Person.sync = {
    deleteRecord: function(passedRecord, process) {
      equal(passedRecord, person, "The person was passed through");
      process(passedRecord).save(function(json, done) {
        deepEqual(json, { id: 1, firstName: "Igor", lastName: "Terzic", createdAt: null }, "The process method toJSON'ifies the record");
        done();
      });
    }
  };

  store.load(Person, { id: 1, firstName: "Igor", lastName: "Terzic" });
  var person = Person.find(1);
  person.deleteRecord();

  equal(person.get('isDirty'), true, 'record is dirty');
  equal(person.get('isDeleted'), true, 'record is deleted');

  person.save();

  equal(person.get('isDirty'), false, 'record should not be dirty');
});
