var name = 'pushPayload relationship-simple (complex-self)';

function fn() {
  store.pushPayload('person', payload);
}

module.exports.fn    = fn;
module.exports.name  = name;
module.exports.setup = function() {
  function generatePeople(from, to) {
    var result = [];

    for (var i = from; i < to; i++) {
      result.push({
        id:          i,
        firstName:   Math.random().toString(36).substring(7),
        lastName:    Math.random().toString(36).substring(7),
        age:         Math.random() * 100,
        born:        Math.random() * 1000,
        isInDebt:    Math.round(Math.random(0, 1)),
        description: Math.random().toString(36).substring(7),
        friends:     [i + 1, i + 2, i + 3, i + 4, i + 5, i +6, i + 7, to + i + 1, to + i + 2, to + i + 3, to + i + 4, to +i + 5]
      });
    }

    return result;
  }

  if (!this.____setup)  {
    var Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName:  DS.attr(),
      friends: DS.hasMany('person', { async: true })
    });

    var container = new Ember.Container();

    container.register('store:main', DS.Store);
    container.register('model:person', Person);
    container.register('serializer:application', DS.RESTSerializer);
    container.register('adapter:application', DS.RESTAdapter);

    var store = container.lookup('store:main');

    // ... TODO: why does benchmark JS do crazy shit
    Object.defineProperty(this, '____setup', {
      enumerable: false,
      value:{
        id: 0,
        Person: Person,
        container: container,
        store: store
      }}
                         );
  }

  var setup = this.____setup;
  var payload, id, type, attrs;
  var store = setup.store;

  store.typeMapFor('person').records.length = 0;

  payload = { 
    people: generatePeople(0, this.distribution)
  };
}
