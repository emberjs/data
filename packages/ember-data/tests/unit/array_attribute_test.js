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
    array = null;
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

module('DS.objectAttr', {
  setup: function() {
    array = [
      { id: '1', name: "Scumbag Dale", bio: {
          age: 80
        }
      },
      { id: '2', name: "Scumbag Katz", bio: {
          age: 75,
          nested: {
            tested: false
          }
        } 
      },
      { id: '3', name: "Scumbag Bryn", bio: {
        age: 99,
        nested: {
          array: ['one']
        }
      }}
    ];

    store = DS.Store.create({
      adapter: TestAdapter.create()
    });

    store.adapter.registerTransform('object', {
      fromJSON: function(serialized) {
        return serialized;
      },

      toJSON: function(deserialized) {
        return JSON.stringify(deserialized);
      }
    });

    Person = DS.Model.extend({
      name: DS.attr('string'),
      bio: DS.attr('object', {defaultValue: {}})
    });

    store.loadMany(Person, [1,2,3], array);
  },

  teardown: function() {
    Person = null;
    set(DS, 'defaultStore', null);
    array = null;
  }
});

test('Changes to nested objects cause the model to become dirty', function() {
  
  var dale = store.find(Person, 1);
  
  set(dale, 'bio.age', 17);
  equal(get(dale, 'bio.age'), 17, 'you can set a nested object value');
  ok(dale.get('isDirty'), 'modifying a nested object makes dale dirty');

  var katz = store.find(Person, 2);

  set(katz, 'bio.nested.tested', true);
  ok(get(katz, 'bio.nested.tested'), 'the deeper level has been set');
  ok(get(katz, 'isDirty'), 'dirty at deeper levels');

  var bryn = store.find(Person, 3);

  get(bryn, 'bio.nested.array').pushObject('two');
  ok(get(bryn, 'isDirty'), 'modifying an array in a nested object throws dirt');
  equal(get(bryn, 'bio.nested.array')[1], 'two', 'the changes appear in the array');

});