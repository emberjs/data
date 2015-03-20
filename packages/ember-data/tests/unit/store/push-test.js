var env, store, Person, PhoneNumber, Post;
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var run = Ember.run;

module("unit/store/push - DS.Store#push", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number')
    });
    Person.toString = function() {
      return 'Person';
    };

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person')
    });
    PhoneNumber.toString = function() {
      return 'PhoneNumber';
    };

    Post = DS.Model.extend({
      postTitle: attr('string')
    });
    Post.toString = function() {
      return 'Post';
    };

    env = setupStore({
      post: Post,
      person: Person,
      "phone-number": PhoneNumber
    });

    store = env.store;

    env.registry.register('serializer:post', DS.ActiveModelSerializer);
  },

  teardown: function() {
    run(function() {
      store.destroy();
    });
  }
});

test("Calling push with a normalized hash returns a record", function() {
  expect(2);

  run(function() {
    var person = store.push('person', {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });
    store.find('person', 'wat').then(function(foundPerson) {
      equal(foundPerson, person, "record returned via load() is the same as the record returned from find()");
      deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
        id: 'wat',
        firstName: "Yehuda",
        lastName: "Katz"
      });
    });
  });
});

test("Supplying a model class for `push` is the same as supplying a string", function () {
  expect(1);

  var Programmer = Person.extend();
  env.registry.register('model:programmer', Programmer);

  run(function() {
    store.push(Programmer, {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });

    store.find('programmer', 'wat').then(function(foundProgrammer) {
      deepEqual(foundProgrammer.getProperties('id', 'firstName', 'lastName'), {
        id: 'wat',
        firstName: "Yehuda",
        lastName: "Katz"
      });
    });
  });
});

test("Calling push triggers `didLoad` even if the record hasn't been requested from the adapter", function() {
  expect(1);

  Person.reopen({
    didLoad: async(function() {
      ok(true, "The didLoad callback was called");
    })
  });

  run(function() {
    store.push('person', {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });
  });
});

test("Calling update should be deprecated", function() {
  expectDeprecation(function() {
    run(function() {
      store.update('person', { id: '1', firstName: 'Yehuda', lastName: 'Katz' });
    });
  });
});

test("Calling push with partial records updates just those attributes", function() {
  expect(2);

  run(function() {
    var person = store.push('person', {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });

    store.push('person', {
      id: 'wat',
      lastName: "Katz!"
    });

    store.find('person', 'wat').then(function(foundPerson) {
      equal(foundPerson, person, "record returned via load() is the same as the record returned from find()");
      deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
        id: 'wat',
        firstName: "Yehuda",
        lastName: "Katz!"
      });
    });
  });
});

test("Calling push on normalize allows partial updates with raw JSON", function () {
  env.registry.register('serializer:person', DS.RESTSerializer);
  var person;

  run(function() {
    person = store.push('person', {
      id: '1',
      firstName: "Robert",
      lastName: "Jackson"
    });

    store.push('person', store.normalize('person', {
      id: '1',
      firstName: "Jacquie"
    }));
  });

  equal(person.get('firstName'), "Jacquie", "you can push raw JSON into the store");
  equal(person.get('lastName'), "Jackson", "existing fields are untouched");
});

test("Calling push with partial records triggers observers for just those attributes that changed", function() {
  expect(1);
  var person;

  run(function() {
    person = store.push('person', {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });
  });

  person.addObserver('firstName', function() {
    ok(false, 'firstName observer should not be triggered');
  });

  person.addObserver('lastName', function() {
    ok(true, 'lastName observer should be triggered');
  });

  run(function() {
    store.push('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz!'
    });
  });
});

test("Calling push with a normalized hash containing related records returns a record", function() {
  var number1, number2, person;
  run(function() {
    number1 = store.push('phone-number', {
      id: 1,
      number: '5551212',
      person: 'wat'
    });

    number2 = store.push('phone-number', {
      id: 2,
      number: '5552121',
      person: 'wat'
    });

    person = store.push('person', {
      id: 'wat',
      firstName: 'John',
      lastName: 'Smith',
      phoneNumbers: [number1, number2]
    });
  });


  deepEqual(person.get('phoneNumbers').toArray(), [number1, number2], "phoneNumbers array is correct");
});

test("Calling push with a normalized hash containing IDs of related records returns a record", function() {
  expect(1);

  Person.reopen({
    phoneNumbers: hasMany('phone-number', { async: true })
  });

  env.adapter.find = function(store, type, id) {
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
    person = store.push('person', {
      id: 'wat',
      firstName: 'John',
      lastName: 'Smith',
      phoneNumbers: ["1", "2"]
    });
    person.get('phoneNumbers').then(function(phoneNumbers) {
      deepEqual(phoneNumbers.map(function(item) {
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

test("Calling pushPayload allows pushing raw JSON", function () {
  run(function() {
    store.pushPayload('post', {
      posts: [{
        id: '1',
        post_title: "Ember rocks"
      }]
    });
  });

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  run(function() {
    store.pushPayload('post', {
      posts: [{
        id: '1',
        post_title: "Ember rocks (updated)"
      }]
    });
  });

  equal(post.get('postTitle'), "Ember rocks (updated)", "You can update data in the store");
});

test("Calling pushPayload allows pushing singular payload properties", function () {
  run(function() {
    store.pushPayload('post', {
      post: {
        id: '1',
        post_title: "Ember rocks"
      }
    });
  });

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  run(function() {
    store.pushPayload('post', {
      post: {
        id: '1',
        post_title: "Ember rocks (updated)"
      }
    });
  });

  equal(post.get('postTitle'), "Ember rocks (updated)", "You can update data in the store");
});

test("Calling pushPayload should use the type's serializer for normalizing", function () {
  expect(4);
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    normalize: function(store, payload) {
      ok(true, "normalized is called on Post serializer");
      return this._super(store, payload);
    }
  }));
  env.registry.register('serializer:person', DS.RESTSerializer.extend({
    normalize: function(store, payload) {
      ok(true, "normalized is called on Person serializer");
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

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  var person = store.getById('person', 2);

  equal(person.get('firstName'), "Yehuda", "you can push raw JSON into the store");
});

test("Calling pushPayload without a type uses application serializer's pushPayload method", function () {
  expect(1);

  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    pushPayload: function(store, payload) {
      ok(true, "pushPayload is called on Application serializer");
      return this._super(store, payload);
    }
  }));

  run(function() {
    store.pushPayload({
      posts: [{ id: '1', postTitle: "Ember rocks" }]
    });
  });
});

test("Calling pushPayload without a type should use a model's serializer when normalizing", function () {
  expect(4);

  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    normalize: function(store, payload) {
      ok(true, "normalized is called on Post serializer");
      return this._super(store, payload);
    }
  }));

  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    normalize: function(store, payload) {
      ok(true, "normalized is called on Application serializer");
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

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  var person = store.getById('person', 2);

  equal(person.get('firstName'), "Yehuda", "you can push raw JSON into the store");
});

test("Calling pushPayload allows partial updates with raw JSON", function () {
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

  person = store.getById('person', 1);

  equal(person.get('firstName'), "Robert", "you can push raw JSON into the store");
  equal(person.get('lastName'), "Jackson", "you can push raw JSON into the store");

  run(function() {
    store.pushPayload('person', {
      people: [{
        id: '1',
        firstName: "Jacquie"
      }]
    });
  });

  equal(person.get('firstName'), "Jacquie", "you can push raw JSON into the store");
  equal(person.get('lastName'), "Jackson", "existing fields are untouched");
});

test('calling push without data argument as an object raises an error', function() {
  var invalidValues = [
    undefined,
    null,
    1,
    'string',
    Ember.Object.create(),
    Ember.Object.extend(),
    true
  ];

  expect(invalidValues.length);

  Ember.EnumerableUtils.forEach(invalidValues, function(invalidValue) {
    throws(function() {
      run(function() {
        store.push('person', invalidValue);
      });
    }, /object/);
  });
});

test('Calling push with a link for a non async relationship should warn', function() {
  Person.reopen({
    phoneNumbers: hasMany('phone-number', { async: false })
  });

  warns(function() {
    run(function() {
      store.push('person', {
        id: '1',
        links: {
          phoneNumbers: '/api/people/1/phone-numbers'
        }
      });
    });
  }, /You have pushed a record of type 'person' with 'phoneNumbers' as a link, but the association is not an async relationship./);
});

test('Calling push with a link containing an object throws an assertion error', function() {
  Person.reopen({
    phoneNumbers: hasMany('phone-number', { async: true })
  });

  expectAssertion(function() {
    run(function() {
      store.push('person', {
        id: '1',
        links: {
          phoneNumbers: {
            href: '/api/people/1/phone-numbers'
          }
        }
      });
    });
  }, "You have pushed a record of type 'person' with 'phoneNumbers' as a link, but the value of that link is not a string.");
});

test('Calling push with a link containing the value null', function() {
  run(function() {
    store.push('person', {
      id: '1',
      firstName: 'Tan',
      links: {
        phoneNumbers: null
      }
    });
  });

  var person = store.getById('person', 1);

  equal(person.get('firstName'), "Tan", "you can use links that contain null as a value");
});

test('calling push with hasMany relationship the value must be an array', function() {
  var invalidValues = [
    1,
    'string',
    Ember.Object.create(),
    Ember.Object.extend(),
    true
  ];

  expect(invalidValues.length);

  Ember.EnumerableUtils.forEach(invalidValues, function(invalidValue) {
    throws(function() {
      run(function() {
        store.push('person', { id: 1, phoneNumbers: invalidValue });
      });
    }, /must be an array/);
  });
});

test('calling push with missing or invalid `id` throws assertion error', function() {
  var invalidValues = [
    {},
    { id: null },
    { id: '' }
  ];

  expect(invalidValues.length);

  Ember.EnumerableUtils.forEach(invalidValues, function(invalidValue) {
    throws(function() {
      run(function() {
        store.push('person', invalidValue);
      });
    }, /You must include an `id`/);
  });
});

test('calling push with belongsTo relationship the value must not be an array', function() {
  throws(function() {
    run(function() {
      store.push('phone-number', { id: 1, person: [1] });
    });
  }, /must not be an array/);
});

test('calling push with an embedded relationship throws a useful error', function() {
  throws(function() {
    run(function() {
      store.push('person', {
        id: 1,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumbers: [
          { number: '5551212', person: 1 }
        ]
      });
    });
  }, /If this is an embedded relationship/);
});

test("Enabling Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS should warn on unknown keys", function() {
  run(function() {
    var originalFlagValue = Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS;
    try {
      Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS = true;
      warns(function() {
        store.push('person', {
          id: '1',
          firstName: 'Tomster',
          emailAddress: 'tomster@emberjs.com',
          isMascot: true
        });
      });
    } finally {
      Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS = originalFlagValue;
    }
  });
});

test("Calling push with unknown keys should not warn by default", function() {
  noWarns(function() {
    run(function() {
      store.push('person', {
        id: '1',
        firstName: 'Tomster',
        emailAddress: 'tomster@emberjs.com',
        isMascot: true
      });
    });
  }, /The payload for 'person' contains these unknown keys: \[emailAddress,isMascot\]. Make sure they've been defined in your model./);
});
