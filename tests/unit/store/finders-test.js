import { defer } from 'rsvp';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

module('unit/store/finders', {
  beforeEach() {
    this.Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
    });

    this.Dog = DS.Model.extend({
      name: DS.attr('string'),
    });

    this.env = setupStore({ person: this.Person, dog: this.Dog });
    this.store = this.env.store;
    this.adapter = this.env.adapter;
  },

  afterEach() {
    run(this.env.container, 'destroy');
  },
});

test('findRecord does not load a serializer until the adapter promise resolves', function(assert) {
  assert.expect(2);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findRecord: () => deferedFind.promise,
    })
  );

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'person') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => this.store.findRecord('person', 1));
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: { id: 1, type: 'person', attributes: { name: 'John Churchill' } },
    });
    return storePromise.then(() => {
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findMany does not load a serializer until the adapter promise resolves', function(assert) {
  assert.expect(2);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findMany: () => deferedFind.promise,
    })
  );

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'person') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    this.store.findRecord('person', 1);
    return this.store.findRecord('person', 2);
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: [
        { id: 1, type: 'person', attributes: { name: 'John Churchill' } },
        { id: 2, type: 'person', attributes: { name: 'Louis Joseph' } },
      ],
    });
    return storePromise.then(() => {
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findHasMany does not load a serializer until the adapter promise resolves', function(assert) {
  assert.expect(2);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findHasMany: () => deferedFind.promise,
    })
  );

  this.Person.reopen({
    dogs: DS.hasMany('dog', { async: true }),
  });

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'dog') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    this.env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://exmaple.com/person/1/dogs',
            },
          },
        },
      },
    });

    return this.store.peekRecord('person', 1).get('dogs');
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: [
        { id: 1, type: 'dog', attributes: { name: 'Scooby' } },
        { id: 2, type: 'dog', attributes: { name: 'Scrappy' } },
      ],
    });
    return storePromise.then(() => {
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findHasMany/explicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', function(assert) {
  assert.expect(5);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findHasMany: () => deferedFind.promise,
    })
  );

  this.Person.reopen({
    dogs: DS.hasMany('dog', { async: true }),
  });

  this.Dog.reopen({
    person: DS.belongsTo('person', { async: true }),
  });

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'dog') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    this.env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://exmaple.com/person/1/dogs',
            },
          },
        },
      },
    });

    return this.store.peekRecord('person', 1).get('dogs');
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: [
        { id: 1, type: 'dog', attributes: { name: 'Scooby' } },
        { id: 2, type: 'dog', attributes: { name: 'Scrappy' } },
      ],
    });
    return storePromise.then(dogs => {
      assert.equal(dogs.get('length'), 2);
      assert.equal(
        dogs.objectAt(0).get('person.id'),
        '1',
        'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(
        dogs.objectAt(1).get('person.id'),
        '1',
        'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findHasMany/implicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', function(assert) {
  assert.expect(7);
  const store = this.env.store;

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findHasMany: () => deferedFind.promise,
    })
  );

  this.Person.reopen({
    dogs: DS.hasMany('dog', { async: true }),
  });

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  store.serializerFor = modelName => {
    if (modelName === 'dog') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://exmaple.com/person/1/dogs',
            },
          },
        },
      },
    });

    return store.peekRecord('person', 1).get('dogs');
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: [
        { id: 1, type: 'dog', attributes: { name: 'Scooby' } },
        { id: 2, type: 'dog', attributes: { name: 'Scrappy' } },
      ],
    });

    return storePromise.then(dogs => {
      assert.equal(dogs.get('length'), 2);
      let person = store.peekRecord('person', '1');

      // TODO: need better way of asserting inverse relationship was set up correctly.
      function implicitPerson(dog, person) {
        let implicitRelationshipName = person.hasMany('dogs').hasManyRelationship
          .inverseKeyForImplicit;
        return dog._internalModel._implicitRelationships[implicitRelationshipName].members.list[0];
      }

      assert.equal(
        implicitPerson(dogs.objectAt(0), person).id,
        '1',
        'dog.person inverse relationship ID is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(
        implicitPerson(dogs.objectAt(0), person).modelName,
        'person',
        'dog.person inverse relationship type is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(
        implicitPerson(dogs.objectAt(1), person).id,
        '1',
        'dog.person inverse relationship ID is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(
        implicitPerson(dogs.objectAt(1), person).modelName,
        'person',
        'dog.person inverse relationship type is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findHasMany/explicit null inverse - adds parent relationship information to the payload if it is not included/added by the serializer', function(assert) {
  assert.expect(7);
  const store = this.env.store;

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findHasMany: () => deferedFind.promise,
    })
  );

  this.Person.reopen({
    dogs: DS.hasMany('dog', { async: true, inverse: null }),
  });

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  store.serializerFor = modelName => {
    if (modelName === 'dog') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://exmaple.com/person/1/dogs',
            },
          },
        },
      },
    });

    return store.peekRecord('person', 1).get('dogs');
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: [
        { id: 1, type: 'dog', attributes: { name: 'Scooby' } },
        { id: 2, type: 'dog', attributes: { name: 'Scrappy' } },
      ],
    });

    return storePromise.then(dogs => {
      assert.equal(dogs.get('length'), 2);
      let person = store.peekRecord('person', '1');

      // TODO: need better way of asserting inverse relationship was set up correctly.
      function implicitPerson(dog, person) {
        let implicitRelationshipName = person.hasMany('dogs').hasManyRelationship
          .inverseKeyForImplicit;
        return dog._internalModel._implicitRelationships[implicitRelationshipName].members.list[0];
      }

      assert.equal(
        implicitPerson(dogs.objectAt(0), person).id,
        '1',
        'dog.person inverse relationship ID is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(
        implicitPerson(dogs.objectAt(0), person).modelName,
        'person',
        'dog.person inverse relationship type is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(
        implicitPerson(dogs.objectAt(1), person).id,
        '1',
        'dog.person inverse relationship ID is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(
        implicitPerson(dogs.objectAt(1), person).modelName,
        'person',
        'dog.person inverse relationship type is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findBelongsTo/explicit inverse - ensures inverse relationship is set up when payload does not return parent relationship info', function(assert) {
  assert.expect(4);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findBelongsTo: () => deferedFind.promise,
    })
  );

  this.Person.reopen({
    favoriteDog: DS.belongsTo('dog', { async: true }),
  });

  this.Dog.reopen({
    person: DS.belongsTo('person', { async: true }),
  });

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'dog') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    this.env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://exmaple.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    return this.store.peekRecord('person', 1).get('favoriteDog');
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({ data: { id: 1, type: 'dog', attributes: { name: 'Scooby' } } });
    return storePromise.then(favoriteDog => {
      assert.equal(favoriteDog.get('id'), '1', 'favoriteDog id is set correctly');
      assert.equal(
        favoriteDog.get('person.id'),
        '1',
        'favoriteDog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findBelongsTo/implicit inverse - ensures inverse relationship is set up when payload does not return parent relationship info', function(assert) {
  assert.expect(4);

  let deferedFind = defer();
  let store = this.env.store;

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findBelongsTo: () => deferedFind.promise,
    })
  );

  this.Person.reopen({
    favoriteDog: DS.belongsTo('dog', { async: true }),
  });

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  store.serializerFor = modelName => {
    if (modelName === 'dog') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://exmaple.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    return store.peekRecord('person', 1).get('favoriteDog');
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({ data: { id: 1, type: 'dog', attributes: { name: 'Scooby' } } });
    return storePromise.then(favoriteDog => {
      let person = store.peekRecord('person', '1');

      assert.equal(favoriteDog.get('id'), '1', 'favoriteDog id is set correctly');
      // TODO: need better way of asserting inverse relationship was set up correctly.
      function implicitPerson(dog, person) {
        let implicitRelationshipName = person.belongsTo('favoriteDog').belongsToRelationship
          .inverseKeyForImplicit;
        return dog._internalModel._implicitRelationships[implicitRelationshipName].members.list[0];
      }

      assert.equal(
        implicitPerson(favoriteDog, person).id,
        '1',
        'favoriteDog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findBelongsTo/explicit null inverse - ensures inverse relationship is set up when payload does not return parent relationship info', function(assert) {
  assert.expect(4);

  let deferedFind = defer();
  let store = this.env.store;

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findBelongsTo: () => deferedFind.promise,
    })
  );

  this.Person.reopen({
    favoriteDog: DS.belongsTo('dog', { async: true, inverse: null }),
  });

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  store.serializerFor = modelName => {
    if (modelName === 'dog') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://exmaple.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    return store.peekRecord('person', 1).get('favoriteDog');
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({ data: { id: 1, type: 'dog', attributes: { name: 'Scooby' } } });
    return storePromise.then(favoriteDog => {
      let person = store.peekRecord('person', '1');

      assert.equal(favoriteDog.get('id'), '1', 'favoriteDog id is set correctly');
      // TODO: need better way of asserting inverse relationship was set up correctly.
      function implicitPerson(dog, person) {
        let implicitRelationshipName = person.belongsTo('favoriteDog').belongsToRelationship
          .inverseKeyForImplicit;
        return dog._internalModel._implicitRelationships[implicitRelationshipName].members.list[0];
      }

      assert.equal(
        implicitPerson(favoriteDog, person).id,
        '1',
        'favoriteDog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
      );
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findBelongsTo does not load a serializer until the adapter promise resolves', function(assert) {
  assert.expect(2);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findBelongsTo: () => deferedFind.promise,
    })
  );

  this.Person.reopen({
    favoriteDog: DS.belongsTo('dog', { async: true }),
  });

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'dog') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => {
    this.env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://exmaple.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    return this.store.peekRecord('person', 1).get('favoriteDog');
  });
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({ data: { id: 1, type: 'dog', attributes: { name: 'Scooby' } } });
    return storePromise.then(() => {
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('findAll does not load a serializer until the adapter promise resolves', function(assert) {
  assert.expect(2);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      findAll: () => deferedFind.promise,
    })
  );

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'person') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => this.store.findAll('person'));
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: [{ id: 1, type: 'person', attributes: { name: 'John Churchill' } }],
    });
    return storePromise.then(() => {
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('query does not load a serializer until the adapter promise resolves', function(assert) {
  assert.expect(2);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      query: () => deferedFind.promise,
    })
  );

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'person') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() => this.store.query('person', { first_duke_of_marlborough: true }));
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: [{ id: 1, type: 'person', attributes: { name: 'John Churchill' } }],
    });
    return storePromise.then(() => {
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});

test('queryRecord does not load a serializer until the adapter promise resolves', function(assert) {
  assert.expect(2);

  let deferedFind = defer();

  this.env.registry.register(
    'adapter:person',
    DS.Adapter.extend({
      queryRecord: () => deferedFind.promise,
    })
  );

  let serializerLoaded = false;
  let serializerFor = this.store.serializerFor;
  this.store.serializerFor = modelName => {
    if (modelName === 'person') {
      serializerLoaded = true;
    }
    return serializerFor.call(this.store, modelName);
  };

  let storePromise = run(() =>
    this.store.queryRecord('person', { first_duke_of_marlborough: true })
  );
  assert.equal(false, serializerLoaded, 'serializer is not eagerly loaded');

  return run(() => {
    deferedFind.resolve({
      data: { id: 1, type: 'person', attributes: { name: 'John Churchill' } },
    });
    return storePromise.then(() => {
      assert.equal(true, serializerLoaded, 'serializer is loaded');
    });
  });
});
