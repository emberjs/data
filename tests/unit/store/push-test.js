import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

import isEnabled from 'ember-data/-private/features';

var env, store, Person, PhoneNumber, Post;
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var run = Ember.run;

module("unit/store/push - DS.Store#push", {
  beforeEach() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number', { async: false })
    });

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person', { async: false })
    });

    Post = DS.Model.extend({
      postTitle: attr('string')
    });

    env = setupStore({
      post: Post,
      person: Person,
      "phone-number": PhoneNumber
    });

    store = env.store;

    env.registry.register('serializer:post', DS.RESTSerializer);
  },

  afterEach() {
    run(function() {
      store.destroy();
    });
  }
});

test('Changed attributes are reset when matching data is pushed', function(assert) {
  var person;

  run(function() {
    person = store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          firstName: 'original first name'
        }
      }
    });
  });

  assert.equal(person.get('firstName'), 'original first name');
  assert.equal(person.get('currentState.stateName'), 'root.loaded.saved');

  run(function() {
    person.set('firstName', 'updated first name');
  });

  assert.equal(person.get('firstName'), 'updated first name');
  assert.equal(person.get('lastName'), undefined);
  assert.equal(person.get('currentState.stateName'), 'root.loaded.updated.uncommitted');
  assert.deepEqual(person.changedAttributes().firstName, ['original first name', 'updated first name']);

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          firstName: 'updated first name'
        }
      }
    });
  });

  assert.equal(person.get('firstName'), 'updated first name');
  assert.equal(person.get('currentState.stateName'), 'root.loaded.saved');
  assert.ok(!person.changedAttributes().firstName);
});

test("Calling push with a normalized hash returns a record", function(assert) {
  assert.expect(2);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    var person = store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });
    store.findRecord('person', 'wat').then(function(foundPerson) {
      assert.equal(foundPerson, person, "record returned via load() is the same as the record returned from findRecord()");
      assert.deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
        id: 'wat',
        firstName: 'Yehuda',
        lastName: 'Katz'
      });
    });
  });
});

test("Supplying a model class for `push` is the same as supplying a string", function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  var Programmer = Person.extend();
  env.registry.register('model:programmer', Programmer);

  run(function() {
    store.push({
      data: {
        type: 'programmer',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });

    store.findRecord('programmer', 'wat').then(function(foundProgrammer) {
      assert.deepEqual(foundProgrammer.getProperties('id', 'firstName', 'lastName'), {
        id: 'wat',
        firstName: 'Yehuda',
        lastName: 'Katz'
      });
    });
  });
});

test("Calling push triggers `didLoad` even if the record hasn't been requested from the adapter", function(assert) {
  assert.expect(1);

  Person.reopen({
    didLoad: assert.wait(function() {
      assert.ok(true, "The didLoad callback was called");
    })
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });
  });
});

test("Calling push with partial records updates just those attributes", function(assert) {
  assert.expect(2);
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });
    var person = store.peekRecord('person', 'wat');

    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          lastName: "Katz!"
        }
      }
    });

    store.findRecord('person', 'wat').then(function(foundPerson) {
      assert.equal(foundPerson, person, "record returned via load() is the same as the record returned from findRecord()");
      assert.deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
        id: 'wat',
        firstName: 'Yehuda',
        lastName: "Katz!"
      });
    });
  });
});

test("Calling push on normalize allows partial updates with raw JSON", function(assert) {
  env.registry.register('serializer:person', DS.RESTSerializer);
  var person;

  run(function() {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: 'Robert',
          lastName: 'Jackson'
        }
      }
    });

    store.push(store.normalize('person', {
      id: '1',
      firstName: "Jacquie"
    }));
  });

  assert.equal(person.get('firstName'), "Jacquie", "you can push raw JSON into the store");
  assert.equal(person.get('lastName'), "Jackson", "existing fields are untouched");
});

test("Calling push with a normalized hash containing IDs of related records returns a record", function(assert) {
  assert.expect(1);

  Person.reopen({
    phoneNumbers: hasMany('phone-number', { async: true })
  });

  env.adapter.findRecord = function(store, type, id) {
    if (id === "1") {
      return Ember.RSVP.resolve({
        id: 1,
        number: '5551212',
        person: 'wat'
      });
    }

    if (id === "2") {
      return Ember.RSVP.resolve({
        id: 2,
        number: '5552121',
        person: 'wat'
      });
    }
  };
  var person;

  run(function() {
    person = store.push(store.normalize('person', {
      id: 'wat',
      firstName: 'John',
      lastName: 'Smith',
      phoneNumbers: ["1", "2"]
    }));
    person.get('phoneNumbers').then(function(phoneNumbers) {
      assert.deepEqual(phoneNumbers.map(function(item) {
        return item.getProperties('id', 'number', 'person');
      }), [{
        id: "1",
        number: '5551212',
        person: person
      }, {
        id: "2",
        number: '5552121',
        person: person
      }]);
    });
  });
});

test("Calling pushPayload allows pushing raw JSON", function(assert) {
  run(function() {
    store.pushPayload('post', {
      posts: [{
        id: '1',
        postTitle: "Ember rocks"
      }]
    });
  });

  var post = store.peekRecord('post', 1);

  assert.equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  run(function() {
    store.pushPayload('post', {
      posts: [{
        id: '1',
        postTitle: "Ember rocks (updated)"
      }]
    });
  });

  assert.equal(post.get('postTitle'), "Ember rocks (updated)", "You can update data in the store");
});

test("Calling pushPayload allows pushing singular payload properties", function(assert) {
  run(function() {
    store.pushPayload('post', {
      post: {
        id: '1',
        postTitle: "Ember rocks"
      }
    });
  });

  var post = store.peekRecord('post', 1);

  assert.equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  run(function() {
    store.pushPayload('post', {
      post: {
        id: '1',
        postTitle: "Ember rocks (updated)"
      }
    });
  });

  assert.equal(post.get('postTitle'), "Ember rocks (updated)", "You can update data in the store");
});

test("Calling pushPayload should use the type's serializer for normalizing", function(assert) {
  assert.expect(4);
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    normalize(store, payload) {
      assert.ok(true, "normalized is called on Post serializer");
      return this._super(store, payload);
    }
  }));
  env.registry.register('serializer:person', DS.RESTSerializer.extend({
    normalize(store, payload) {
      assert.ok(true, "normalized is called on Person serializer");
      return this._super(store, payload);
    }
  }));

  run(function() {
    store.pushPayload('post', {
      posts: [{
        id: 1,
        postTitle: "Ember rocks"
      }],
      people: [{
        id: 2,
        firstName: "Yehuda"
      }]
    });
  });

  var post = store.peekRecord('post', 1);

  assert.equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  var person = store.peekRecord('person', 2);

  assert.equal(person.get('firstName'), "Yehuda", "you can push raw JSON into the store");
});

test("Calling pushPayload without a type uses application serializer's pushPayload method", function(assert) {
  assert.expect(1);

  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    pushPayload(store, payload) {
      assert.ok(true, "pushPayload is called on Application serializer");
      return this._super(store, payload);
    }
  }));

  run(function() {
    store.pushPayload({
      posts: [{ id: '1', postTitle: "Ember rocks" }]
    });
  });
});

test("Calling pushPayload without a type should use a model's serializer when normalizing", function(assert) {
  assert.expect(4);

  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    normalize(store, payload) {
      assert.ok(true, "normalized is called on Post serializer");
      return this._super(store, payload);
    }
  }));

  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    normalize(store, payload) {
      assert.ok(true, "normalized is called on Application serializer");
      return this._super(store, payload);
    }
  }));

  run(function() {
    store.pushPayload({
      posts: [{
        id: '1',
        postTitle: "Ember rocks"
      }],
      people: [{
        id: '2',
        firstName: 'Yehuda'
      }]
    });
  });

  var post = store.peekRecord('post', 1);

  assert.equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  var person = store.peekRecord('person', 2);

  assert.equal(person.get('firstName'), "Yehuda", "you can push raw JSON into the store");
});

test("Calling pushPayload allows partial updates with raw JSON", function(assert) {
  env.registry.register('serializer:person', DS.RESTSerializer);

  var person;

  run(function() {
    store.pushPayload('person', {
      people: [{
        id: '1',
        firstName: "Robert",
        lastName: "Jackson"
      }]
    });
  });

  person = store.peekRecord('person', 1);

  assert.equal(person.get('firstName'), "Robert", "you can push raw JSON into the store");
  assert.equal(person.get('lastName'), "Jackson", "you can push raw JSON into the store");

  run(function() {
    store.pushPayload('person', {
      people: [{
        id: '1',
        firstName: "Jacquie"
      }]
    });
  });

  assert.equal(person.get('firstName'), "Jacquie", "you can push raw JSON into the store");
  assert.equal(person.get('lastName'), "Jackson", "existing fields are untouched");
});

test('calling push without data argument as an object raises an error', function(assert) {
  var invalidValues = [
    null,
    1,
    'string',
    Ember.Object.create(),
    Ember.Object.extend(),
    true
  ];

  assert.expect(invalidValues.length);

  invalidValues.forEach(function(invalidValue) {
    assert.throws(function() {
      run(function() {
        store.push('person', invalidValue);
      });
    }, /object/);
  });
});

testInDebug('Calling push with a link for a non async relationship should warn if no data', function(assert) {
  Person.reopen({
    phoneNumbers: hasMany('phone-number', { async: false })
  });

  assert.expectWarning(function() {
    run(function() {
      store.push({
        data: {
          type: 'person',
          id: '1',
          relationships: {
            phoneNumbers: {
              links: {
                related: '/api/people/1/phone-numbers'
              }
            }
          }
        }
      });
    });
  }, /You pushed a record of type 'person' with a relationship 'phoneNumbers' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload./);
});

testInDebug('Calling push with a link for a non async relationship should not warn when data is present', function(assert) {
  Person.reopen({
    phoneNumbers: hasMany('phone-number', { async: false })
  });

  assert.expectNoWarning(function() {
    run(function() {
      store.push({
        data: {
          type: 'person',
          id: '1',
          relationships: {
            phoneNumbers: {
              data: [
                { type: 'phone-number', id: '2' },
                { type: 'phone-number', id: '3' }
              ],
              links: {
                related: '/api/people/1/phone-numbers'
              }
            }
          }
        }
      });
    });
  });
});

testInDebug('Calling push with an unknown model name throws an assertion error', function(assert) {

  assert.expectAssertion(function() {
    run(function() {
      store.push({
        data: {
          id: '1',
          type: 'unknown'
        }
      });
    });
  }, /You tried to push data with a type 'unknown' but no model could be found with that name/);
});

test('Calling push with a link containing an object', function(assert) {
  Person.reopen({
    phoneNumbers: hasMany('phone-number', { async: true })
  });

  run(function() {
    store.push(store.normalize('person', {
      id: '1',
      firstName: 'Tan',
      links: {
        phoneNumbers: {
          href: '/api/people/1/phone-numbers'
        }
      }
    }));
  });

  var person = store.peekRecord('person', 1);

  assert.equal(person.get('firstName'), "Tan", "you can use links containing an object");
});

test('Calling push with a link containing the value null', function(assert) {
  run(function() {
    store.push(store.normalize('person', {
      id: '1',
      firstName: 'Tan',
      links: {
        phoneNumbers: null
      }
    }));
  });

  var person = store.peekRecord('person', 1);

  assert.equal(person.get('firstName'), "Tan", "you can use links that contain null as a value");
});

testInDebug('calling push with hasMany relationship the value must be an array', function(assert) {
  var invalidValues = [
    1,
    'string',
    Ember.Object.create(),
    Ember.Object.extend(),
    true
  ];

  assert.expect(invalidValues.length);

  invalidValues.forEach(function(invalidValue) {
    assert.throws(function() {
      run(function() {
        store.push({
          data: {
            type: 'person',
            id: '1',
            relationships: {
              phoneNumbers: {
                data: invalidValue
              }
            }
          }
        });
      });
    }, /must be an array/);
  });
});

testInDebug('calling push with missing or invalid `id` throws assertion error', function(assert) {
  var invalidValues = [
    {},
    { id: null },
    { id: '' }
  ];

  assert.expect(invalidValues.length);

  invalidValues.forEach(function(invalidValue) {
    assert.throws(function() {
      run(function() {
        store.push({
          data: invalidValue
        });
      });
    }, /You must include an 'id'/);
  });
});

testInDebug('calling push with belongsTo relationship the value must not be an array', function(assert) {
  assert.throws(function() {
    run(function() {
      store.push({
        data: {
          type: 'phone-number',
          id: '1',
          relationships: {
            person: {
              data: [1]
            }
          }
        }
      });
    });
  }, /must not be an array/);
});

testInDebug("Enabling Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS should warn on unknown attributes", function(assert) {
  run(function() {
    var originalFlagValue = Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS;
    try {
      Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS = true;
      assert.expectWarning(function() {
        store.push({
          data: {
            type: 'person',
            id: '1',
            attributes: {
              firstName: 'Tomster',
              emailAddress: 'tomster@emberjs.com',
              isMascot: true
            }
          }
        });
      }, "The payload for 'person' contains these unknown attributes: emailAddress,isMascot. Make sure they've been defined in your model.");
    } finally {
      Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS = originalFlagValue;
    }
  });
});

testInDebug("Enabling Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS should warn on unknown relationships", function(assert) {
  run(function() {
    var originalFlagValue = Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS;
    try {
      Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS = true;
      assert.expectWarning(function() {
        store.push({
          data: {
            type: 'person',
            id: '1',
            relationships: {
              phoneNumbers: {},
              emailAddresses: {},
              mascots: {}
            }
          }
        });
      }, "The payload for 'person' contains these unknown relationships: emailAddresses,mascots. Make sure they've been defined in your model.");
    } finally {
      Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS = originalFlagValue;
    }
  });
});

testInDebug("Calling push with unknown keys should not warn by default", function(assert) {
  assert.expectNoWarning(function() {
    run(function() {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Tomster',
            emailAddress: 'tomster@emberjs.com',
            isMascot: true
          }
        }
      });
    });
  }, /The payload for 'person' contains these unknown .*: .* Make sure they've been defined in your model./);
});

if (isEnabled('ds-pushpayload-return')) {
  test("Calling pushPayload returns records", function(assert) {
    env.registry.register('serializer:person', DS.RESTSerializer);

    var people;

    run(function() {
      people = store.pushPayload('person', {
        people: [{
          id: '1',
          firstName: "Robert",
          lastName: "Jackson"
        }, {
          id: '2',
          firstName: "Matthew",
          lastName: "Beale"
        }]
      });
    });

    assert.equal(people.length, 2, "both records were returned by `store.pushPayload`");

    assert.equal(people[0].get('firstName'), "Robert", "pushPayload returns pushed records");
    assert.equal(people[0].get('lastName'), "Jackson", "pushPayload returns pushed records");
    assert.equal(people[1].get('firstName'), "Matthew", "pushPayload returns pushed records");
    assert.equal(people[1].get('lastName'), "Beale", "pushPayload returns pushed records");
  });
}

test("_push returns an instance of InternalModel if an object is pushed", function(assert) {
  let pushResult;

  run(function() {
    pushResult = store._push({
      data: {
        id: 1,
        type: 'person'
      }
    });
  });

  assert.ok(pushResult instanceof DS.InternalModel);
  assert.notOk(pushResult.record, 'InternalModel is not materialized');
});

test("_push does not require a modelName to resolve to a modelClass", function(assert) {
  let originalCall = store.modelFor;
  store.modelFor = () => { assert.notOk('modelFor was triggered as a result of a call to store._push'); };

  run(function() {
    store._push({
      data: {
        id: 1,
        type: 'person'
      }
    });
  });

  store.modelFor = originalCall;
  assert.ok('We made it');
});

test("_push returns an array of InternalModels if an array is pushed", function(assert) {
  let pushResult;

  run(function() {
    pushResult = store._push({
      data: [{
        id: 1,
        type: 'person'
      }]
    });
  });

  assert.ok(pushResult instanceof Array);
  assert.ok(pushResult[0] instanceof DS.InternalModel);
  assert.notOk(pushResult[0].record, 'InternalModel is not materialized');
});


test("_push returns null if no data is pushed", function(assert) {
  let pushResult;

  run(function() {
    pushResult = store._push({
      data: null
    });
  });

  assert.strictEqual(pushResult, null);
});

module("unit/store/push - DS.Store#push with JSON-API", {
  beforeEach() {
    var Person = DS.Model.extend({
      name: DS.attr('string'),
      cars: DS.hasMany('car', { async: false })
    });

    var Car = DS.Model.extend({
      make: DS.attr('string'),
      model: DS.attr('string'),
      person: DS.belongsTo('person', { async: false })
    });

    env = setupStore({
      adapter: DS.Adapter,
      car: Car,
      person: Person
    });
    store = env.store;

  },

  afterEach() {
    run(function() {
      store.destroy();
    });
  }
});


test("Should support pushing multiple models into the store", function(assert) {
  assert.expect(2);

  run(function() {
    store.push({
      data: [{
        type: 'person',
        id: 1,
        attributes: {
          name: 'Tom Dale'
        }
      }, {
        type: 'person',
        id: 2,
        attributes: {
          name: "Tomster"
        }
      }]
    });
  });

  var tom = store.peekRecord('person', 1);
  assert.equal(tom.get('name'), 'Tom Dale', 'Tom should be in the store');

  var tomster = store.peekRecord('person', 2);
  assert.equal(tomster.get('name'), 'Tomster', 'Tomster should be in the store');
});


test("Should support pushing included models into the store", function(assert) {
  assert.expect(2);

  run(function() {
    store.push({
      data: [{
        type: 'person',
        id: 1,
        attributes: {
          name: 'Tomster'
        },
        relationships: {
          cars: [{
            data: {
              type: 'person', id: 1
            }
          }]
        }
      }],
      included: [{
        type: 'car',
        id: 1,
        attributes: {
          make: 'Dodge',
          model: 'Neon'
        },
        relationships: {
          person: {
            data: {
              id: 1, type: 'person'
            }
          }
        }
      }]
    });
  });

  var tomster = store.peekRecord('person', 1);
  assert.equal(tomster.get('name'), 'Tomster', 'Tomster should be in the store');

  var car = store.peekRecord('car', 1);
  assert.equal(car.get('model'), 'Neon', 'Tomster\'s car should be in the store');
});
