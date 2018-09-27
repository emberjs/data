import { module, test } from 'qunit';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import { setupTest } from 'ember-qunit';
import Store from 'ember-data/store';
import Model from 'ember-data/model';
import { resolve } from 'rsvp';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';

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

  test('one-to-many - findHasMany/implicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function(assert) {
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
    assert.equal(
      person.hasMany('dogs').hasManyRelationship.relationshipIsEmpty,
      false,
      'relationship state was set up correctly'
    );

    assert.equal(dogs.get('length'), 2, 'hasMany relationship has correct number of records');
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
    assert.equal(dogs.get('length'), 1, 'record removed from hasMany relationship after deletion');
    assert.equal(dogs.get('firstObject.id'), '2', 'hasMany relationship has correct records');
  });

  test('one-to-many - findHasMany/null inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function(assert) {
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

  test('one-to-one - findBelongsTo/implicit inverse - ensures inverse relationship is set up when payload does not return parent relationship info', async function(assert) {
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

  test('one-to-one - findBelongsTo/null inverse - ensures inverse relationship is set up when payload does not return parent relationship info', async function(assert) {
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

  test('many-to-many - findHasMany /implicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function(assert) {
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
      @hasMany('person', {
        async: true,
      })
      walkers;
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

    assert.equal(
      dogs.get('length'),
      2,
      'left hand side relationship is set up with correct number of records'
    );
    let [dog1, dog2] = dogs.toArray();
    let dog1Walkers = await dog1.get('walkers');
    assert.equal(
      dog1Walkers.length,
      1,
      'dog1.walkers inverse relationship includes correct number of records'
    );
    assert.equal(
      dog1Walkers.get('firstObject.id'),
      '1',
      'dog1.walkers inverse relationship is set up correctly'
    );

    let dog2Walkers = await dog2.get('walkers');
    assert.equal(
      dog2Walkers.length,
      1,
      'dog2.walkers inverse relationship includes correct number of records'
    );
    assert.equal(
      dog2Walkers.get('firstObject.id'),
      '1',
      'dog2.walkers inverse relationship is set up correctly'
    );

    await dog1.destroyRecord();
    assert.equal(dogs.get('length'), 1, 'person.dogs relationship was updated when record removed');
    assert.equal(
      dogs.get('firstObject.id'),
      '2',
      'person.dogs relationship has the correct records'
    );
  });

  test('many-to-one - findBelongsTo/implicit inverse - adds parent relationship information to the payload if it is not included/added by the serializer', async function(assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => resolve({ data: null }),
        findBelongsTo: () => {
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'John Churchill',
              },
            },
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

    let dog = store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: 'A Really Good Dog',
        },
        relationships: {
          person: {
            links: {
              related: 'http://example.com/person/1',
            },
          },
        },
      },
    });

    let person = await dog.get('person');
    assert.equal(
      dog.belongsTo('person').belongsToRelationship.relationshipIsEmpty,
      false,
      'belongsTo relationship state was populated'
    );
    assert.equal(person.get('id'), '1', 'dog.person relationship is correctly set up');

    let dogs = await person.get('dogs');

    assert.equal(
      dogs.get('length'),
      1,
      'person.dogs inverse relationship includes correct number of records'
    );
    let [dog1] = dogs.toArray();
    assert.equal(dog1.id, '1', 'dog1.person inverse relationship is set up correctly');

    await person.destroyRecord();
    dog = await dog.get('person');
    assert.equal(dog, null, 'record deleted removed from belongsTo relationship');
  });

  test('one-to-many - findHasMany/implicit inverse - silently fixes wrong relationship information from the payload and deprecates', async function(assert) {
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

  test('one-to-one - findBelongsTo/implicit inverse - silently fixes wrong relationship information from the payload and deprecates', async function(assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => resolve({ data: null }),
        findBelongsTo: () => {
          return resolve({
            data: {
              id: '1',
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
          });
        },
      })
    );

    class Person extends Model {
      @belongsTo('dog', {
        async: true,
      })
      dog;
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
          dog: {
            links: {
              related: 'http://example.com/person/1/dog',
            },
          },
        },
      },
    });

    let dog = await person.get('dog');
    assert.expectDeprecation(/Encountered mismatched relationship/);

    let dogFromStore = await store.peekRecord('dog', '1');

    // weirdly these pass
    assert.equal(dogFromStore.belongsTo('person').id(), '1');
    assert.equal(person.belongsTo('dog').id(), '1');
    assert.equal(dog.id, '1', 'dog.person relationship loaded correctly');

    // TODO: but this assertion fails. I don't think the relationship is empty considering the above and below assertions.
    assert.equal(
      person.belongsTo('dog').belongsToRelationship.relationshipIsEmpty,
      false,
      'relationship is not empty'
    );

    let dogPerson1 = await dog.get('person');
    assert.equal(
      dogPerson1.get('id'),
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );

    await dog.destroyRecord();
    dog = await person.get('dog');
    assert.equal(dog, null, 'record was removed from belongsTo relationship');
  });

  test('many-to-one - findBelongsTo/implicitInverse - silently fixes wrong relationship information from the payload and deprecates', async function(assert) {
    let { owner } = this;

    owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        deleteRecord: () => resolve({ data: null }),
        findBelongsTo: () => {
          return resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'John Churchill',
              },
              relationships: {
                dogs: {
                  data: [
                    {
                      id: '2',
                      type: 'dog',
                    },
                  ],
                },
              },
            },
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

    let dog = store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: 'A Really Good Dog',
        },
        relationships: {
          person: {
            links: {
              related: 'http://example.com/person/1',
            },
          },
        },
      },
    });

    let person = await dog.get('person');
    assert.expectDeprecation(/Encountered mismatched relationship/);
    let dogFromStore = await store.peekRecord('dog', '1');

    // TODO: weirdly these pass...
    assert.equal(
      dogFromStore.belongsTo('person').id(),
      '1',
      'dog relationship is set up correctly'
    );
    let dogPerson1 = await dog.get('person');
    assert.equal(
      dogPerson1.get('id'),
      '1',
      'dog.person inverse relationship is set up correctly when adapter does not include parent relationships in data.relationships'
    );
    // TODO: but this assertion fails. I don't think the relationship is empty considering the above and below assertions.
    assert.equal(
      person.hasMany('dogs').hasManyRelationship.relationshipIsEmpty,
      false,
      'relationship is not empty'
    );

    await dog.destroyRecord();
    dog = await person.get('dog');
    assert.equal(dog, null, 'record was removed from belongsTo relationship');
  });

  test('many-to-many - findHasMany/implicitInverse - silently fixes wrong relationship information from the payload and deprecates', async function(assert) {
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
                  walkers: {
                    data: [
                      {
                        id: '2',
                        type: 'person',
                      },
                    ],
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
                  walkers: {
                    data: [
                      {
                        id: '2',
                        type: 'person',
                      },
                    ],
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
      @hasMany('person', {
        async: true,
      })
      walkers;
    }
    owner.register('model:dog', Dog);

    let person1 = store.push({
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
    let person2 = store.push({
      data: {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Fond Memories',
        },
      },
    });

    let person1Dogs = await person1.get('dogs');

    assert.expectDeprecation(/Encountered mismatched relationship/);
    assert.equal(person1.hasMany('dogs').hasManyRelationship.relationshipIsEmpty, false);

    let dog1 = store.peekRecord('dog', '1');
    let dog2 = store.peekRecord('dog', '2');

    for (let person of [person1, person2]) {
      const dogs = await person.get('dogs');
      assert.equal(
        dogs.get('length'),
        2,
        'left hand side relationship is set up with correct number of records'
      );
      assert.ok(
        dogs.indexOf(dog1) >= 0,
        'relationship includes the parent even though it was not specified'
      );
      assert.ok(
        dogs.indexOf(dog2) >= 0,
        'relationship also includes records the payload specified'
      );

      for (let dog of [dog1, dog2]) {
        let walkers = await dog.get('walkers');
        assert.equal(
          walkers.length,
          2,
          'dog1.walkers inverse relationship includes correct number of records'
        );
        assert.ok(
          walkers.indexOf(person1) >= 0,
          'dog1Walkers includes the record that requested the relationship but was not specified in the relationships of the records in the response'
        );
        assert.ok(
          walkers.indexOf(person2) >= 0,
          'dog1Walkers includes records the response returned in data.relationships'
        );
      }
    }

    await dog1.destroyRecord();

    for (let person of [person1, person2]) {
      let dogs = await person.get('dogs');
      assert.equal(
        dogs.get('length'),
        1,
        'person1.dogs relationship was updated when record removed'
      );
      assert.equal(
        dogs.get('firstObject.id'),
        '2',
        'person.dogs relationship has the correct records'
      );
    }

    let dog2Walkers = await dog2.get('walkers');
    assert.equal(
      dog2Walkers.get('length'),
      2,
      'dog2 still has correct number of records for hasMany relationship'
    );
    assert.ok(
      dog2Walkers.indexOf(person1) >= 0,
      'dog2Walkers includes the record that requested the relationship but was not specified in the relationships of the records in the response'
    );
    assert.ok(
      dog2Walkers.indexOf(person2) >= 0,
      'dog2Walkers includes records the response returned in data.relationships'
    );

    // now delete another side of the many-to-many

    await person2.destroyRecord();

    let person1Dogs = await person1.get('dogs');

    assert.equal(person1Dogs.get('length'), 1, 'person1 has correct # of dogs');
    assert.equal(
      person1Dogs.get('firstObject.id'),
      dog2.get('id'),
      'person1 has dog2 in its hasMany relationship; dog1 is not present because it was destroyed.'
    );
    assert.equal(
      dog2Walkers.get('length'),
      1,
      'dog2 has correct # of records after record specified by server response is destroyed'
    );
    assert.equal(
      dog2Walkers.get('firstObject.id'),
      person1.get('id'),
      'dog2 has person1 in its hasMany relationship; person2 is not present because it was destroyed.'
    );

    // finally, destroy person1, the record that loaded all this data through the relationship

    await person1.destroyRecord();
    assert.equal(
      dog2Walkers.get('length'),
      0,
      'dog2 hasMany relationship is empty after all person records are destroyed'
    );
  });
});
