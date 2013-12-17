var get = Ember.get, set = Ember.set;
var store, Record;

module("unit/store/createRecord - Store creating records", {
  setup: function() {
    store = createStore({ adapter: DS.Adapter.extend()});

    Record = DS.Model.extend({
      title: DS.attr('string')
    });
  }
});

test("doesn't modify passed in properties hash", function(){
  var attributes = { foo: 'bar' },
      record1 = store.createRecord(Record, attributes),
      record2 = store.createRecord(Record, attributes);

  deepEqual(attributes, { foo: 'bar' }, "The properties hash is not modified");
});
