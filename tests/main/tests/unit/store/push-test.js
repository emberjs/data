import EmberObject from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer from '@ember-data/serializer/rest';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/store/push - Store#push', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    class Person extends Model {
      @attr firstName;
      @attr lastName;
      @hasMany('phone-number', { async: false, inverse: 'person' }) phoneNumbers;
      @hasMany('person', { async: false, inverse: 'friends' }) friends; // many to many
    }
    this.owner.register('model:person', Person);

    class PhoneNumber extends Model {
      @attr number;
      @belongsTo('person', { async: false, inverse: 'phoneNumbers' }) person;
    }
    this.owner.register('model:phone-number', PhoneNumber);

    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('Changed attributes are reset when matching data is pushed', function (assert) {
    const store = this.owner.lookup('service:store');
    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: 'original first name',
        },
      },
    });

    assert.strictEqual(person.firstName, 'original first name', 'initial first name is correct');
    assert.strictEqual(person.currentState.stateName, 'root.loaded.saved', 'initial state name is correct');

    person.set('firstName', 'updated first name');

    assert.strictEqual(person.firstName, 'updated first name', 'mutated first name is correct');
    assert.strictEqual(
      person.currentState.stateName,
      'root.loaded.updated.uncommitted',
      'stateName after mutation is correct'
    );
    assert.true(person.currentState.isDirty, 'currentState isDirty after mutation');
    assert.deepEqual(
      person.changedAttributes().firstName,
      ['original first name', 'updated first name'],
      'changed attributes are correct'
    );

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: 'updated first name',
        },
      },
    });

    assert.strictEqual(person.firstName, 'updated first name');
    assert.strictEqual(person.currentState.stateName, 'root.loaded.saved');
    assert.false(person.currentState.isDirty, 'currentState is not Dirty after push');
    assert.notOk(person.changedAttributes().firstName);
  });

  test('Calling push with a normalized hash returns a record', function (assert) {
    assert.expect(2);
    const store = this.owner.lookup('service:store');

    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    return run(() => {
      let person = store.push({
        data: {
          type: 'person',
          id: 'wat',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz',
          },
        },
      });

      return store.findRecord('person', 'wat').then((foundPerson) => {
        assert.strictEqual(
          foundPerson,
          person,
          'record returned via load() is the same as the record returned from findRecord()'
        );
        assert.deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
          id: 'wat',
          firstName: 'Yehuda',
          lastName: 'Katz',
        });
      });
    });
  });

  test('Calling push with partial records updates just those attributes', function (assert) {
    assert.expect(2);
    const store = this.owner.lookup('service:store');

    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    return run(() => {
      store.push({
        data: {
          type: 'person',
          id: 'wat',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz',
          },
        },
      });

      let person = store.peekRecord('person', 'wat');

      store.push({
        data: {
          type: 'person',
          id: 'wat',
          attributes: {
            lastName: 'Katz!',
          },
        },
      });

      return store.findRecord('person', 'wat').then((foundPerson) => {
        assert.strictEqual(
          foundPerson,
          person,
          'record returned via load() is the same as the record returned from findRecord()'
        );
        assert.deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
          id: 'wat',
          firstName: 'Yehuda',
          lastName: 'Katz!',
        });
      });
    });
  });

  test('Calling push on normalize allows partial updates with raw JSON', function (assert) {
    this.owner.register('serializer:person', RESTSerializer);
    let person;
    const store = this.owner.lookup('service:store');

    run(() => {
      person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Robert',
            lastName: 'Jackson',
          },
        },
      });

      store.push(
        store.normalize('person', {
          id: '1',
          firstName: 'Jacquie',
        })
      );
    });

    assert.strictEqual(person.firstName, 'Jacquie', 'you can push raw JSON into the store');
    assert.strictEqual(person.lastName, 'Jackson', 'existing fields are untouched');
  });

  test('Calling push with a normalized hash containing IDs of related records returns a record', function (assert) {
    assert.expect(1);
    const store = this.owner.lookup('service:store');

    class Person extends Model {
      @attr firstName;
      @attr lastName;
      @hasMany('phone-number', { async: true, inverse: 'person' }) phoneNumbers;
      @hasMany('person', { async: false, inverse: 'friends' }) friends; // many to many
    }
    this.owner.register('model:person', Person);

    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id) {
      if (id === '1') {
        return resolve({
          data: {
            id: '1',
            type: 'phone-number',
            attributes: { number: '5551212' },
            relationships: {
              person: {
                data: { id: 'wat', type: 'person' },
              },
            },
          },
        });
      }

      if (id === '2') {
        return resolve({
          data: {
            id: '2',
            type: 'phone-number',
            attributes: { number: '5552121' },
            relationships: {
              person: {
                data: { id: 'wat', type: 'person' },
              },
            },
          },
        });
      }
    };

    return run(() => {
      let normalized = store.normalize('person', {
        id: 'wat',
        type: 'person',
        attributes: {
          'first-name': 'John',
          'last-name': 'Smith',
        },
        relationships: {
          'phone-numbers': {
            data: [
              { id: '1', type: 'phone-number' },
              { id: '2', type: 'phone-number' },
            ],
          },
        },
      });
      let person = store.push(normalized);

      return person.phoneNumbers.then((phoneNumbers) => {
        let items = phoneNumbers.map((item) => {
          return item ? item.getProperties('id', 'number', 'person') : null;
        });
        assert.deepEqual(items, [
          {
            id: '1',
            number: '5551212',
            person: person,
          },
          {
            id: '2',
            number: '5552121',
            person: person,
          },
        ]);
      });
    });
  });

  testInDebug('calling push without data argument as an object raises an error', function (assert) {
    const store = this.owner.lookup('service:store');
    let invalidValues = [null, 1, 'string', EmberObject.create(), EmberObject.extend(), true];

    assert.expect(invalidValues.length);

    invalidValues.forEach((invalidValue) => {
      assert.expectAssertion(() => {
        run(() => {
          store.push('person', invalidValue);
        });
      }, /object/);
    });
  });

  testInDebug('Calling push with a link for a non async relationship should warn if no data', function (assert) {
    const store = this.owner.lookup('service:store');
    assert.expectWarning(() => {
      run(() => {
        store.push({
          data: {
            type: 'person',
            id: '1',
            relationships: {
              phoneNumbers: {
                links: {
                  related: '/api/people/1/phone-numbers',
                },
              },
            },
          },
        });
      });
    }, /You pushed a record of type 'person' with a relationship 'phoneNumbers' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty./);
  });

  testInDebug(
    'Calling push with a link for a non async relationship should not warn when data is present',
    function (assert) {
      const store = this.owner.lookup('service:store');
      assert.expectNoWarning(() => {
        run(() => {
          store.push({
            data: {
              type: 'person',
              id: '1',
              relationships: {
                phoneNumbers: {
                  data: [
                    { type: 'phone-number', id: '2' },
                    { type: 'phone-number', id: '3' },
                  ],
                  links: {
                    related: '/api/people/1/phone-numbers',
                  },
                },
              },
            },
          });
        });
      });
    }
  );

  testInDebug(
    'Calling push with a link for a non async relationship should not reset an existing relationship',
    function (assert) {
      const store = this.owner.lookup('service:store');
      // GET /persons/1?include=phone-numbers
      store.push({
        data: {
          type: 'person',
          id: '1',
          relationships: {
            phoneNumbers: {
              data: [{ type: 'phone-number', id: '2' }],
              links: {
                related: '/api/people/1/phone-numbers',
              },
            },
          },
        },
        included: [
          {
            type: 'phone-number',
            id: '2',
            attributes: {
              number: '1-800-DATA',
            },
          },
        ],
      });

      let person = store.peekRecord('person', 1);

      assert.strictEqual(person.phoneNumbers.length, 1);
      assert.strictEqual(person.phoneNumbers.at(0).number, '1-800-DATA');

      // GET /persons/1
      assert.expectNoWarning(() => {
        store.push({
          data: {
            type: 'person',
            id: '1',
            relationships: {
              phoneNumbers: {
                links: {
                  related: '/api/people/1/phone-numbers',
                },
              },
            },
          },
        });
      });

      assert.strictEqual(person.phoneNumbers.length, 1);
      assert.strictEqual(person.phoneNumbers.at(0).number, '1-800-DATA');
    }
  );

  testInDebug('Calling push with an unknown model name throws an assertion error', function (assert) {
    const store = this.owner.lookup('service:store');
    assert.expectAssertion(() => {
      run(() => {
        store.push({
          data: {
            id: '1',
            type: 'unknown',
          },
        });
      });
    }, /You tried to push data with a type 'unknown' but no model could be found with that name/);
  });

  test('Calling push with a link containing an object', function (assert) {
    class Person extends Model {
      @attr firstName;
      @attr lastName;
      @hasMany('phone-number', { async: true, inverse: 'person' }) phoneNumbers;
      @hasMany('person', { async: false, inverse: 'friends' }) friends; // many to many
    }
    this.owner.register('model:person', Person);
    const store = this.owner.lookup('service:store');

    run(() => {
      store.push(
        store.normalize('person', {
          id: '1',
          type: 'person',
          attributes: {
            'first-name': 'Tan',
          },
          relationships: {
            'phone-numbers': {
              links: { related: '/api/people/1/phone-numbers' },
            },
          },
        })
      );
    });

    let person = store.peekRecord('person', 1);

    assert.strictEqual(person.firstName, 'Tan', 'you can use links containing an object');
  });

  test('Calling push with a link containing the value null', function (assert) {
    const store = this.owner.lookup('service:store');
    run(() => {
      store.push(
        store.normalize('person', {
          id: '1',
          type: 'person',
          attributes: {
            'first-name': 'Tan',
          },
          relationships: {
            'phone-numbers': {
              links: {
                related: null,
              },
            },
          },
        })
      );
    });

    let person = store.peekRecord('person', 1);

    assert.strictEqual(person.firstName, 'Tan', 'you can use links that contain null as a value');
  });

  testInDebug('calling push with hasMany relationship the value must be an array', function (assert) {
    const store = this.owner.lookup('service:store');
    assert.expectAssertion(() => {
      run(() => {
        store.push({
          data: {
            type: 'person',
            id: '1',
            relationships: {
              phoneNumbers: {
                data: 1,
              },
            },
          },
        });
      });
    });
  });

  testInDebug('calling push with missing or invalid `id` throws assertion error', function (assert) {
    const store = this.owner.lookup('service:store');
    let invalidValues = [{}, { id: null }, { id: '' }];

    assert.expect(invalidValues.length);

    invalidValues.forEach((invalidValue) => {
      assert.expectAssertion(() => {
        run(() => {
          store.push({
            data: invalidValue,
          });
        });
      }, /You must include an 'id'/);
    });
  });

  testInDebug('calling push with belongsTo relationship the value must not be an array', function (assert) {
    const store = this.owner.lookup('service:store');
    assert.expectAssertion(() => {
      run(() => {
        store.push({
          data: {
            type: 'phone-number',
            id: '1',
            relationships: {
              person: {
                data: [1],
              },
            },
          },
        });
      });
    }, /must not be an array/);
  });

  testInDebug('Calling push with unknown keys should not warn by default', function (assert) {
    const store = this.owner.lookup('service:store');
    assert.expectNoWarning(() => {
      run(() => {
        store.push({
          data: {
            type: 'person',
            id: '1',
            attributes: {
              firstName: 'Tomster',
              emailAddress: 'tomster@emberjs.com',
              isMascot: true,
            },
          },
        });
      });
    }, /The payload for 'person' contains these unknown .*: .* Make sure they've been defined in your model./);
  });

  test('_push returns an identifier if an object is pushed', function (assert) {
    const store = this.owner.lookup('service:store');
    let pushResult = store._push({
      data: {
        id: '1',
        type: 'person',
      },
    });

    assert.strictEqual(pushResult, store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' }));
    assert.notOk(store._instanceCache.peek(pushResult, { bucket: 'record' }), 'record is not materialized');
  });

  test('_push does not require a modelName to resolve to a modelClass', function (assert) {
    const store = this.owner.lookup('service:store');
    let originalCall = store.modelFor;
    store.modelFor = function () {
      assert.notOk('modelFor was triggered as a result of a call to store._push');
    };

    run(() => {
      store._push({
        data: {
          id: '1',
          type: 'person',
        },
      });
    });

    store.modelFor = originalCall;
    assert.ok('We made it');
  });

  test('_push returns an array of identifiers if an array is pushed', function (assert) {
    const store = this.owner.lookup('service:store');
    let pushResult;

    run(() => {
      pushResult = store._push({
        data: [
          {
            id: '1',
            type: 'person',
          },
        ],
      });
    });

    assert.ok(pushResult instanceof Array);
    assert.strictEqual(pushResult[0], store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' }));
    assert.notOk(store._instanceCache.peek(pushResult[0], { bucket: 'record' }), 'record is not materialized');
  });

  test('_push returns null if no data is pushed', function (assert) {
    const store = this.owner.lookup('service:store');
    let pushResult;

    run(() => {
      pushResult = store._push({
        data: null,
      });
    });

    assert.strictEqual(pushResult, null);
  });
});

module('unit/store/push - Store#pushPayload', function (hooks) {
  setupTest(hooks);
  hooks.beforeEach(function () {
    class Post extends Model {
      @attr postTitle;
    }
    this.owner.register('model:post', Post);
    this.owner.register('serializer:post', RESTSerializer.extend());
  });

  test('Calling pushPayload allows pushing raw JSON', function (assert) {
    const store = this.owner.lookup('service:store');
    run(() => {
      store.pushPayload('post', {
        posts: [
          {
            id: '1',
            postTitle: 'Ember rocks',
          },
        ],
      });
    });

    let post = store.peekRecord('post', 1);

    assert.strictEqual(post.postTitle, 'Ember rocks', 'you can push raw JSON into the store');

    run(() => {
      store.pushPayload('post', {
        posts: [
          {
            id: '1',
            postTitle: 'Ember rocks (updated)',
          },
        ],
      });
    });

    assert.strictEqual(post.postTitle, 'Ember rocks (updated)', 'You can update data in the store');
  });

  test('Calling pushPayload allows pushing singular payload properties', function (assert) {
    const store = this.owner.lookup('service:store');

    run(() => {
      store.pushPayload('post', {
        post: {
          id: '1',
          postTitle: 'Ember rocks',
        },
      });
    });

    let post = store.peekRecord('post', 1);

    assert.strictEqual(post.postTitle, 'Ember rocks', 'you can push raw JSON into the store');

    run(() => {
      store.pushPayload('post', {
        post: {
          id: '1',
          postTitle: 'Ember rocks (updated)',
        },
      });
    });

    assert.strictEqual(post.postTitle, 'Ember rocks (updated)', 'You can update data in the store');
  });

  test(`Calling pushPayload should use the type's serializer for normalizing`, function (assert) {
    assert.expect(4);
    this.owner.register(
      'model:person',
      class extends Model {
        @attr firstName;
      }
    );
    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        normalize() {
          assert.ok(true, 'normalized is called on Post serializer');
          return this._super(...arguments);
        },
      })
    );

    this.owner.register(
      'serializer:person',
      RESTSerializer.extend({
        normalize() {
          assert.ok(true, 'normalized is called on Person serializer');
          return this._super(...arguments);
        },
      })
    );

    const store = this.owner.lookup('service:store');

    run(() => {
      store.pushPayload('post', {
        posts: [
          {
            id: '1',
            postTitle: 'Ember rocks',
          },
        ],
        people: [
          {
            id: '2',
            firstName: 'Yehuda',
          },
        ],
      });
    });

    let post = store.peekRecord('post', '1');

    assert.strictEqual(post.postTitle, 'Ember rocks', 'you can push raw JSON into the store');

    let person = store.peekRecord('person', '2');

    assert.strictEqual(person.firstName, 'Yehuda', 'you can push raw JSON into the store');
  });

  test(`Calling pushPayload without a type uses application serializer's pushPayload method`, function (assert) {
    assert.expect(1);

    this.owner.register(
      'serializer:application',
      RESTSerializer.extend({
        pushPayload() {
          assert.ok(true, `pushPayload is called on Application serializer`);
          return this._super(...arguments);
        },
      })
    );
    const store = this.owner.lookup('service:store');

    run(() => {
      store.pushPayload({
        posts: [{ id: '1', postTitle: 'Ember rocks' }],
      });
    });
  });

  test(`Calling pushPayload without a type should use a model's serializer when normalizing`, function (assert) {
    assert.expect(4);
    this.owner.register(
      'model:person',
      class extends Model {
        @attr firstName;
      }
    );

    this.owner.register(
      'serializer:post',
      RESTSerializer.extend({
        normalize() {
          assert.ok(true, 'normalized is called on Post serializer');
          return this._super(...arguments);
        },
      })
    );

    this.owner.register(
      'serializer:application',
      RESTSerializer.extend({
        normalize() {
          assert.ok(true, 'normalized is called on Application serializer');
          return this._super(...arguments);
        },
      })
    );

    const store = this.owner.lookup('service:store');
    run(() => {
      store.pushPayload({
        posts: [
          {
            id: '1',
            postTitle: 'Ember rocks',
          },
        ],
        people: [
          {
            id: '2',
            firstName: 'Yehuda',
          },
        ],
      });
    });

    var post = store.peekRecord('post', 1);

    assert.strictEqual(post.postTitle, 'Ember rocks', 'you can push raw JSON into the store');

    var person = store.peekRecord('person', 2);

    assert.strictEqual(person.firstName, 'Yehuda', 'you can push raw JSON into the store');
  });

  test('Calling pushPayload allows partial updates with raw JSON', function (assert) {
    this.owner.register('serializer:person', RESTSerializer);
    this.owner.register(
      'model:person',
      class extends Model {
        @attr firstName;
        @attr lastName;
      }
    );

    const store = this.owner.lookup('service:store');
    run(() => {
      store.pushPayload('person', {
        people: [
          {
            id: '1',
            firstName: 'Robert',
            lastName: 'Jackson',
          },
        ],
      });
    });

    let person = store.peekRecord('person', 1);

    assert.strictEqual(person.firstName, 'Robert', 'you can push raw JSON into the store');
    assert.strictEqual(person.lastName, 'Jackson', 'you can push raw JSON into the store');

    run(() => {
      store.pushPayload('person', {
        people: [
          {
            id: '1',
            firstName: 'Jacquie',
          },
        ],
      });
    });

    assert.strictEqual(person.firstName, 'Jacquie', 'you can push raw JSON into the store');
    assert.strictEqual(person.lastName, 'Jackson', 'existing fields are untouched');
  });

  testInDebug(
    'Calling pushPayload with a record does not reorder the hasMany it is in when a many-many relationship',
    function (assert) {
      class Person extends Model {
        @attr firstName;
        @attr lastName;
        @hasMany('person', { async: false, inverse: 'friends' }) friends; // many to many
      }
      this.owner.register('model:person', Person);
      this.owner.register('serializer:application', class extends JSONAPISerializer {});
      // one person with two friends
      // if we push a change to a friend, the
      // person's friends should be in the same order
      // at the end
      const store = this.owner.lookup('service:store');

      store.pushPayload({
        data: [
          {
            id: '1',
            type: 'person',
            attributes: {
              'first-name': 'Robert',
              'last-name': 'Jackson',
            },
            relationships: {
              friends: {
                data: [
                  { id: '2', type: 'person' },
                  { id: '3', type: 'person' },
                ],
              },
            },
          },
        ],
        included: [
          {
            id: '2',
            type: 'person',
            attributes: {
              'first-name': 'Friend',
              'last-name': 'One',
            },
          },
          {
            id: '3',
            type: 'person',
            attributes: {
              'first-name': 'Friend',
              'last-name': 'Two',
            },
          },
        ],
      });

      store.pushPayload({
        data: [
          {
            id: '2',
            type: 'person',
            relationships: {
              friends: {
                data: [{ id: '1', type: 'person' }],
              },
            },
          },
        ],
      });

      let robert = store.peekRecord('person', '1');

      const friends = robert.friends;
      assert.strictEqual(friends.at(0).id, '2', 'first object is unchanged');
      assert.strictEqual(friends.at(-1).id, '3', 'last object is unchanged');
    }
  );
});

module('unit/store/push - Store#push with JSON-API', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend({
      name: attr('string'),
      cars: hasMany('car', { async: false, inverse: 'person' }),
    });

    const Car = Model.extend({
      make: attr('string'),
      model: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'cars' }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:car', Car);

    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('Should support pushing multiple models into the store', function (assert) {
    assert.expect(2);
    const store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tom Dale',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Tomster',
            },
          },
        ],
      });
    });

    let tom = store.peekRecord('person', 1);
    assert.strictEqual(tom.name, 'Tom Dale', 'Tom should be in the store');

    let tomster = store.peekRecord('person', 2);
    assert.strictEqual(tomster.name, 'Tomster', 'Tomster should be in the store');
  });

  test('Should support pushing included models into the store', function (assert) {
    assert.expect(2);
    const store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tomster',
            },
            relationships: {
              cars: [
                {
                  data: {
                    type: 'person',
                    id: '1',
                  },
                },
              ],
            },
          },
        ],
        included: [
          {
            type: 'car',
            id: '1',
            attributes: {
              make: 'Dodge',
              model: 'Neon',
            },
            relationships: {
              person: {
                data: {
                  id: '1',
                  type: 'person',
                },
              },
            },
          },
        ],
      });
    });

    let tomster = store.peekRecord('person', 1);
    assert.strictEqual(tomster.name, 'Tomster', 'Tomster should be in the store');

    let car = store.peekRecord('car', 1);
    assert.strictEqual(car.model, 'Neon', "Tomster's car should be in the store");
  });
});
