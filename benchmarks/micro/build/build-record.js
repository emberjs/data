var name = 'buildRecord';
var counter = 1;

function fn() {
  store.buildRecord(type, id, attrs);
}

module.exports.fn    = fn;
module.exports.name  = name;
module.exports.setup = function() {
  if (!this.____setup)  {
    var Person = DS.Model.extend({

    });

    var container = new Ember.Container();

    container.register('store:main', DS.Store);
    container.register('model:person', Person);

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
  setup.store.typeMapFor('person').records.length = 0;
  //setup.store.typeMapFor(Person).records.length = 0;

  var data, id, type, store, attrs;
  if (this.distribution === 0) {
    id = setup.id ++;
    type = setup.Person;
    store = setup.store;
    attrs = {};
  } else if (this.distribution === 1) {
    id = setup.id ++;
    type = setup.Person;
    store = setup.store;
    attrs = {
      firstName: 'igor' 
    };
  } else if (this.distribution === 5) {
    id = setup.id ++;
    store = setup.store;
    type = setup.Person;
    attrs = {
      firstName: 'igor',
      lastName: 't',
      middleName: 'n/a',
      age: 6,
      preference: 'EPF'
    };
  }
}
