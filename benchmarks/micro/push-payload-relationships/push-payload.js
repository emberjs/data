var name = 'pushPayload relationship-simple';

function fn() {
  store.pushPayload('person', payload);
}

module.exports.fn    = fn;
module.exports.name  = name;
module.exports.setup = function() {
  function generateUsers(from, to) {
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
        cars:        [i + 1, i + 2, i + 3]
      });
    }

    return result;
  }

  if (!this.____setup)  {
    var Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName:  DS.attr(),
      cars: DS.hasMany('car', { async: true })
    });

    var Car = DS.Model.extend({
      make: DS.attr(),
      name: DS.attr(),
      person: DS.hasMany('person')
    });

    var container = new Ember.Container();

    container.register('store:main', DS.Store);
    container.register('model:person', Person);
    container.register('model:car', Car);
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
    people: generateUsers(0, this.distribution)
  };
}
