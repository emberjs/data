var get = Ember.get, set = Ember.set;
var attr = DS.attr;
var Person, env;

module("integration/serialize - Serializing Records", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string')
    });

    Person.typeKey = 'person';
    Person.toString = function() { return "Person"; };

    env = setupStore({ person: Person });

    env.container.register('serializer:personWithName', DS.JSONSerializer.extend({
      serialize: function(post, options) {
        var json = this._super(post, options);
        var firstName = get(post, 'firstName');
        var lastName  = get(post, 'lastName');

        json.name = firstName + ' ' + lastName;

        return json;
      }
    }));
  },

  teardown: function() {
    env.container.destroy();
  }
});

test('serialize', function() {
  var person = env.store.createRecord(Person, {
    firstName: 'Homura',
    lastName: 'Akemi'
  });
  deepEqual(person.serialize(), {
    firstName: 'Homura',
    lastName: 'Akemi'
  });
});

test('serialize with serializer specification', function() {
  var person = env.store.createRecord(Person, {
    firstName: 'Homura',
    lastName: 'Akemi'
  });

  deepEqual(person.serialize({serializer: 'personWithName'}), {
    firstName: 'Homura',
    lastName: 'Akemi',
    name: 'Homura Akemi'
  });
});
