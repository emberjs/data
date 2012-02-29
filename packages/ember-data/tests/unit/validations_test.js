var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

module("DS.Model");

test("halts commit when invalid", function() {
  var commitCalls = 0, validateCalls = 0;
  var Person = DS.Model.extend({
    name: DS.attr('string'),
    foo: DS.attr('string'),
    validate: function(){
      validateCalls++;
      set(this, 'errors', {name: "presence"})
    }
  });

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      createRecords: function(store, type, models) {
        if( type == Person && models.length > 0){
          commitCalls++ ;  
        }
      }
    })
  });

  var record = store.createRecord(Person, {});

  store.commit();
  equal(validateCalls, 1, "validate was called when committing the store");
  equal(commitCalls, 0, "commit was not called when committing the store");

  equal(getPath(record, 'stateManager.currentState.name'), "invalid", "record is invalid");
});


test("validate presence", function() {
  var commitCalls = 0, 
      validateCalls = 0,
      Person = DS.Model.extend({
        name: DS.attr('string'),
        foo: DS.attr('string', {validations: {presence:true}}),
      }),
      store = DS.Store.create({adapter: DS.Adapter.create({createRecords: function() {} })}),
      record = store.createRecord(Person, {});

  store.commit();
  equal(getPath(record, 'stateManager.currentState.name'), "invalid", "record is invalid");

  set(record, 'foo', "123");

  store.commit();
  equal(getPath(record, 'isValid'), true, "record is valid");
});