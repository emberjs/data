var get = Ember.get, set = Ember.set;
var Person;

var array, store;

var testSerializer = DS.Serializer.create({
  primaryKey: function() {
    return 'id';
  }
});

var TestAdapter = DS.Adapter.extend({
  serializer: testSerializer
});

module("DS.arrayAttr", {
  setup: function() {
    array = [
              { id: '1', name: "Scumbag Dale", problems: ['booze'] }, 
              { id: '2', name: "Scumbag Katz", problems: ['skag'] }, 
              { id: '3', name: "Scumbag Bryn",}
            ];

    store = DS.Store.create({
      adapter: TestAdapter.create()
    });

    store.adapter.registerTransform('string[]', {
      fromJSON: function(serialized) {
        return serialized;
      },

      toJSON: function(deserialized) {
        return JSON.stringify(deserialized);
      }
    });

    Person = DS.Model.extend({
      name: DS.attr('string'),
      problems: DS.attr('string[]', {defaultValue: []})
    });

    store.loadMany(Person, [1,2,3], array);
  },

  teardown: function() {
    Person = null;
    set(DS, 'defaultStore', null);
  }
});

test('the record should become dirty when array properties change', function() {
  var dale = store.find(Person, 1);
  equal(get(dale, 'problems')[0], 'booze', 'the array has some values');

  equal(get(dale, 'isDirty'), false, 'the array is not dirty yet');

  get(dale, 'problems').pushObject('cash flow');
  equal(get(dale, 'problems.length'), 2, 'less money mo problems');
  equal(get(dale, 'isDirty'), true, 'the model should be dirty now.');

  var bryn = store.find(Person, 3);
  equal(get(bryn, 'isDirty'), false, 'Bryn should still be clean');
  get(bryn, 'problems').pushObject('laydeez');
  equal(get(bryn, 'problems')[0], 'laydeez', 'Default array should be present');
  ok(get(bryn, 'isDirty'), 'Pushing an object to the default should make it dirty');
});