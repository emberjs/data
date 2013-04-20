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
  expect(8);

  Person.sync = {
    createRecord: function(record, didSave) {
      equal(record, person, "The person was passed through");
      var json = record.toJSON();
      deepEqual(json, { firstName: "Igor", lastName: "Terzic", createdAt: null }, "It is possible to call toJSON on a record");
      json.id = "1";
      didSave(json);
    }
  };

  var person = Person.createRecord({ firstName: "Igor", lastName: "Terzic" });

  equal(person.get('isNew'), true, 'record is new');
  equal(person.get('isDirty'), true, 'record is dirty');

  person.save().then(async(function(p) {
    strictEqual(p, person);
    equal(person.get('isSaving'), false);
    equal(person.get('isDirty'), false, 'record should not be dirty');
    equal(person.get('id'), '1', 'record should have an id');
  }));
});

test("Calling `didSave` with a hash will update a newly created record", function() {
  expect(5);

  Person.sync = {
    createRecord: function(record, didSave) {
      equal(record, person, "The person was passed through");
      deepEqual(record.toJSON(), { firstName: "Igor", lastName: "Terzic", createdAt: null }, "It is possible to call toJSON on a record");
      didSave({ id: 1, firstName: "Igor", lastName: "Terzic", createdAt: new Date() });
    }
  };

  var person = Person.createRecord({ firstName: "Igor", lastName: "Terzic" });
  person.save().then(async(function(p) {
    strictEqual(p, person);
    equal(p.get('isSaving'), false);
    strictEqual(p.get('id'), "1");
  }));
});


test("After updating a record, calling `save` on it will save it using the BasicAdapter", function() {
  expect(10);

  var expectedJSON = { id: 1, firstName: "Igor", lastName: "Terzicsta", createdAt: null };

  Person.sync = {
    updateRecord: function(record, didSave) {
      equal(record, person, "The person was passed through");
      deepEqual(record.toJSON({ includeId: true }), expectedJSON, "The process method toJSON'ifies the record");
      didSave();
    }
  };

  store.load(Person, { id: 1, firstName: "Igor", lastName: "Terzic" });
  var person = Person.find(1);
  person.set('lastName', "Terzicsta");

  equal(person.get('isDirty'), true, 'record is dirty');

  person.save().then(async(function(p) {
    strictEqual(p, person, "the promise was resolved to the record");
    equal(person.get('isDirty'), false, 'record should not be dirty');
    equal(p.get('isSaving'), false);

    person.set('lastName', "Terzicstaaaa");
    expectedJSON.lastName = "Terzicstaaaa";

    return person.save();
  })).then(async(function() {
    equal(person.get('isDirty'), false, 'record should not be dirty');
    equal(person.get('isSaving'), false);
  }));
});

test("Calling `didSave` on a record will update an updated record", function() {
  expect(5);

  var d1 = new Date(new Date().valueOf()),
      d2 = new Date(d1.valueOf() + 10);

  Person.sync = {
    updateRecord: function(record, didSave) {
      equal(record, person, "The person was passed through");
      deepEqual(record.toJSON({ includeId: true }), { id: 1, firstName: "Igor", lastName: "Terzicsta", createdAt: DS.JSONTransforms.date.serialize(d1) }, "The process method toJSON'ifies the record");
      didSave({ id: 1, firstName: "Igor", lastName: "Terzic", createdAt: d2 });
    }
  };

  store.load(Person, { id: 1, firstName: "Igor", lastName: "Terzic", createdAt: d1 });
  var person = Person.find(1);
  person.set('lastName', "Terzicsta");

  person.save().then(async(function(p) {
    strictEqual(p, person);
    equal(p.get('isSaving'), false);
    equal(d2.valueOf(), p.get('createdAt').valueOf());
  }));
});


test("After deleting a record, calling `save` on it will save it using the BasicAdapter", function() {
  expect(7);

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

  equal(person.get('isDirty'), true, 'record is dirty');
  equal(person.get('isDeleted'), true, 'record is deleted');

  person.save().then(async(function(p) {
    strictEqual(p, person);
    equal(p.get('isSaving'), false);
    equal(person.get('isDirty'), false, 'record should not be dirty');
  }));
});
