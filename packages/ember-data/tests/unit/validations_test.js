var get = Ember.get, set = Ember.set, getPath = Ember.getPath;
var store, Person, record;

module("DS.Model");

test("halts commit when invalid", function() {
  var commitCalls = 0, validateCalls = 0;
  Person = DS.Model.extend({
    name: DS.attr('string'),
    foo: DS.attr('string'),
    validate: function() {
      validateCalls++;

      get(this, 'errors').add('name', "presence");
    }
  });

  store = DS.Store.create({
    adapter: DS.Adapter.create({
      createRecords: function(store, type, models) {
        if (type === Person && models.length > 0) {
          commitCalls++ ;
        }
      }
    })
  });

  record = store.createRecord(Person, {});

  store.commit();

  equal(validateCalls, 1, "validate was called when committing the store");
  equal(commitCalls, 0, "commit was not called when committing the store");

  equal(getPath(record, 'stateManager.currentState.name'), "invalid", "record is invalid");
});


test("validate presence", function() {
  var commitCalls = 0,
      validateCalls = 0;
  Person = DS.Model.extend({
    name: DS.attr('string'),
    foo: DS.attr('string', {
      validate: {
        presence:true
      }
    })
  });
  store = DS.Store.create({adapter: DS.Adapter.create({createRecords: function() {} })}),
  record = store.createRecord(Person, {});

  store.commit();
  equal(getPath(record, 'stateManager.currentState.name'), "invalid", "record is invalid");

  set(record, 'foo', "123");

  store.commit();

  equal(getPath(record, 'isValid'), true, "record is valid");
});

test("validate length", function() {
  var commitCalls = 0,
      validateCalls = 0;
  Person = DS.Model.extend({
    name: DS.attr('string', {
      validate: {
        length: {minimum: 3, maximum: 10}
      }
    })
  });
  store = DS.Store.create({adapter: DS.Adapter.create({createRecords: function() {} })}),
  record = store.createRecord(Person, {name: 'pa'});

  store.commit();

  equal(getPath(record, 'stateManager.currentState.name'), "invalid", "record is invalid when < 3");
  equal(getPath(record, 'isValid'), false, "record is not valid");

  set(record, 'name', 'paul');

  equal(getPath(record, 'isValid'), true, "record is valid");

  set(record, 'name', 'paulchavard');

  store.commit();

  equal(getPath(record, 'stateManager.currentState.name'), "invalid", "record is invalid when > 10");
  equal(getPath(record, 'isValid'), false, "record is not valid");

  set(record, 'name', 'chavard');

  equal(getPath(record, 'isValid'), true, "record is valid");
});
