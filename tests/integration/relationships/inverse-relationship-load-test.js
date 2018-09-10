import { module, test } from 'qunit';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import { setupTest } from 'ember-qunit';
import Store from 'ember-data/store';
import Model from 'ember-data/model';
import { resolve } from 'rsvp';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';

// // variants
// // many-to-one
// // many-to-many
// // BelongsTo one-to-one
// // belongsTo one-to-to-many

// person = DS.Model.extend({
//   dogs: hasMany('dog')
// })
// DS.Model.extend({
//   owners: hasMany('person')
// })

// person.get('dogs').should == ['1', '2']
// dog1.get('owners').should_include person1
// dog2.get('owners').should_include person1

// dog1.get('owners')

class Person extends Model {
  @attr('string')
  updateAt;
  @attr('string')
  name;
  @attr('string')
  firstName;
  @attr('string')
  lastName;
}

class Dog extends Model {
  @attr('string')
  name;
}

module('inverse relationship load test', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register('service:store', Store);
    store = owner.lookup('service:store');
    owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, payload) {
          return payload;
        },
      })
    );
  });

  test('findHasMany/implicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function(assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => resolve({ data: null }),
        findHasMany: () => {
          return resolve({
            data: [
              {
                id: 1,
                type: 'dog',
                attributes: {
                  name: 'Scooby',
                },
              },
              {
                id: 2,
                type: 'dog',
                attributes: {
                  name: 'Scrappy',
                },
              },
            ],
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: true,
      })
      person;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://example.com/person/1/dogs',
            },
          },
        },
      },
    });

    let dogs = await person.get('dogs');
    assert.equal(person.hasMany('dogs').hasManyRelationship.relationshipIsEmpty, false);

    assert.equal(dogs.get('length'), 2);
    let dog1 = dogs.get('firstObject');
    let dogPerson1 = await dog1.get('person');
    assert.equal(
      dogPerson1.get('id'),
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    let dogPerson2 = await dogs.objectAt(1).get('person');
    assert.equal(
      dogPerson2.get('id'),
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );

    await dog1.destroyRecord();
    assert.equal(dogs.get('length'), 1);
    assert.equal(dogs.get('firstObject.id'), '2');
  });

  test('findHasMany/null inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function(assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord() {
          return resolve({
            data: null,
          });
        },
        findHasMany: () => {
          return resolve({
            data: [
              {
                id: 1,
                type: 'dog',
                attributes: {
                  name: 'Scooby',
                },
              },
              {
                id: 2,
                type: 'dog',
                attributes: {
                  name: 'Scrappy',
                },
              },
            ],
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dogs', {
        inverse: null,
        async: true,
      })
      dogs;
      @attr
      name;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @attr
      name;
    }

    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://example.com/person/1/dogs',
            },
          },
        },
      },
    });

    let dogs = await person.get('dogs');
    assert.equal(person.hasMany('dogs').hasManyRelationship.relationshipIsEmpty, false);
    assert.equal(dogs.get('length'), 2);
    assert.deepEqual(dogs.mapBy('id'), ['1', '2']);

    let dog1 = dogs.get('firstObject');
    await dog1.destroyRecord();
    assert.equal(dogs.get('length'), '1');
    assert.equal(dogs.get('firstObject.id'), '2');
  });

  test('findHasMany/implicit inverse - silently fixes wrong relationship information from the payload and deprecates', async function(assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => resolve({ data: null }),
        findHasMany: () => {
          return resolve({
            data: [
              {
                id: 1,
                type: 'dog',
                attributes: {
                  name: 'Scooby',
                },
                relationships: {
                  person: {
                    data: {
                      id: '2',
                      type: 'person',
                    },
                  },
                },
              },
              {
                id: 2,
                type: 'dog',
                attributes: {
                  name: 'Scrappy',
                },
                relationships: {
                  person: {
                    data: {
                      id: '2',
                      type: 'person',
                    },
                  },
                },
              },
            ],
          });
        },
      })
    );

    class Person extends Model {
      @hasMany('dog', {
        async: true,
      })
      dogs;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @belongsTo('person', {
        async: true,
      })
      person;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://example.com/person/1/dogs',
            },
          },
        },
      },
    });

    let dogs = await person.get('dogs');
    assert.expectDeprecation(/Encountered mismatched relationship/);
    assert.equal(person.hasMany('dogs').hasManyRelationship.relationshipIsEmpty, false);
    assert.equal(dogs.get('length'), 2);

    let dog1 = dogs.get('firstObject');
    let dogPerson1 = await dog1.get('person');
    assert.equal(
      dogPerson1.get('id'),
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    let dogPerson2 = await dogs.objectAt(1).get('person');
    assert.equal(
      dogPerson2.get('id'),
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );

    await dog1.destroyRecord();
    assert.equal(dogs.get('length'), 1);
    assert.equal(dogs.get('firstObject.id'), '2');
  });

  test('findBelongsTo/implicit inverse - ensures inverse relationship is set up when payload does not return parent relationship info', async function(assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord() {
          return resolve({
            data: null,
          });
        },
        findBelongsTo() {
          return resolve({
            data: {
              id: 1,
              type: 'dog',
              attributes: {
                name: 'Scooby',
              },
            },
          });
        },
      })
    );

    class Person extends Model {
      @attr
      name;
      @belongsTo('dog', { async: true })
      favoriteDog;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @attr
      name;
      @belongsTo('person', { async: true })
      person;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://example.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    let favoriteDog = await person.get('favoriteDog');
    assert.equal(person.belongsTo('favoriteDog').belongsToRelationship.relationshipIsEmpty, false);
    assert.equal(favoriteDog.get('id'), '1', 'favoriteDog id is set correctly');
    let favoriteDogPerson = await favoriteDog.get('person');
    assert.equal(
      favoriteDogPerson.get('id'),
      '1',
      'favoriteDog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    await favoriteDog.destroyRecord();
    favoriteDog = await person.get('favoriteDog');
    assert.equal(favoriteDog, null);
  });

  test('findBelongsTo/null inverse - ensures inverse relationship is set up when payload does not return parent relationship info', async function(assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord() {
          return resolve({
            data: null,
          });
        },
        findBelongsTo() {
          return resolve({
            data: {
              id: 1,
              type: 'dog',
              attributes: {
                name: 'Scooby',
              },
            },
          });
        },
      })
    );

    class Person extends Model {
      @attr
      name;
      @belongsTo('dog', { async: true })
      favoriteDog;
    }
    owner.register('model:person', Person);

    class Dog extends Model {
      @attr
      name;
    }
    owner.register('model:dog', Dog);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://example.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    let favoriteDog = await person.get('favoriteDog');
    assert.equal(person.belongsTo('favoriteDog').belongsToRelationship.relationshipIsEmpty, false);
    assert.equal(favoriteDog.get('id'), '1', 'favoriteDog id is set correctly');
    await favoriteDog.destroyRecord();
    favoriteDog = await person.get('favoriteDog');
    assert.equal(favoriteDog, null);
  });
});
