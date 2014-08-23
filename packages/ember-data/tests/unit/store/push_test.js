var env, store, Person, PhoneNumber, Post;
var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

module("unit/store/push - DS.Store#push", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number')
    });

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person')
    });

    Post = DS.Model.extend({
      postTitle: attr('string')
    });

    env = setupStore({"post": Post,
                      "person": Person,
                      "phone-number": PhoneNumber});

    store = env.store;

    env.container.register('serializer:post', DS.ActiveModelSerializer);
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    });
  }
});

test("Calling push with a normalized hash returns a record", function() {
  var person = store.push('person', {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });

  store.find('person', 'wat').then(async(function(foundPerson) {
    equal(foundPerson, person, "record returned via load() is the same as the record returned from find()");
    deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });
  }));
});

test("Supplying a model class for `push` is the same as supplying a string", function () {
  var Programmer = Person.extend();
  env.container.register('model:programmer', Programmer);

  var programmer = store.push(Programmer, {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });

  store.find('programmer', 'wat').then(async(function(foundProgrammer) {
    deepEqual(foundProgrammer.getProperties('id', 'firstName', 'lastName'), {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz"
    });
  }));
});

test("Calling push triggers `didLoad` even if the record hasn't been requested from the adapter", function() {
  Person.reopen({
    didLoad: async(function() {
      ok(true, "The didLoad callback was called");
    })
  });

  store.push('person', {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });
});

test("Calling update with partial records updates just those attributes", function() {
  var person = store.push('person', {
    id: 'wat',
    firstName: "Yehuda",
    lastName: "Katz"
  });

  store.update('person', {
    id: 'wat',
    lastName: "Katz!"
  });

  store.find('person', 'wat').then(async(function(foundPerson) {
    equal(foundPerson, person, "record returned via load() is the same as the record returned from find()");
    deepEqual(foundPerson.getProperties('id', 'firstName', 'lastName'), {
      id: 'wat',
      firstName: "Yehuda",
      lastName: "Katz!"
    });
  }));
});

test("Calling update on normalize allows partial updates with raw JSON", function () {
  env.container.register('serializer:person', DS.RESTSerializer);

  var person = store.push('person', {
    id: '1',
    firstName: "Robert",
    lastName: "Jackson"
  });

  store.update('person', store.normalize('person', {
    id: '1',
    firstName: "Jacquie"
  }));

  equal(person.get('firstName'), "Jacquie", "you can push raw JSON into the store");
  equal(person.get('lastName'), "Jackson", "existing fields are untouched");
});

test("Calling push with a normalized hash containing related records returns a record", function() {
  var number1 = store.push('phone-number', {
    id: 1,
    number: '5551212',
    person: 'wat'
  });

  var number2 = store.push('phone-number', {
    id: 2,
    number: '5552121',
    person: 'wat'
  });

  var person = store.push('person', {
    id: 'wat',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumbers: [number1, number2]
  });

  deepEqual(person.get('phoneNumbers').toArray(), [ number1, number2 ], "phoneNumbers array is correct");
});

test("Calling push with a normalized hash containing IDs of related records returns a record", function() {
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

  var person = store.push('person', {
    id: 'wat',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumbers: ["1", "2"]
  });

  person.get('phoneNumbers').then(async(function(phoneNumbers) {
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
  }));
});

test("Calling pushPayload allows pushing raw JSON", function () {
  store.pushPayload('post', {posts: [{
    id: '1',
    post_title: "Ember rocks"
  }]});

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  store.pushPayload('post', {posts: [{
    id: '1',
    post_title: "Ember rocks (updated)"
  }]});

  equal(post.get('postTitle'), "Ember rocks (updated)", "You can update data in the store");
});

test("Calling pushPayload allows pushing singular payload properties", function () {
  store.pushPayload('post', {post: {
    id: '1',
    post_title: "Ember rocks"
  }});

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  store.pushPayload('post', {post: {
    id: '1',
    post_title: "Ember rocks (updated)"
  }});

  equal(post.get('postTitle'), "Ember rocks (updated)", "You can update data in the store");
});

test("Calling pushPayload should use the type's serializer for normalizing", function () {
  expect(4);
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    normalize: function(store, payload) {
      ok(true, "normalized is called on Post serializer");
      return this._super(store, payload);
    }
  }));
  env.container.register('serializer:person', DS.RESTSerializer.extend({
    normalize: function(store, payload) {
      ok(true, "normalized is called on Person serializer");
      return this._super(store, payload);
    }
  }));

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

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  var person = store.getById('person', 2);

  equal(person.get('firstName'), "Yehuda", "you can push raw JSON into the store");
});

test("Calling pushPayload without a type uses application serializer's pushPayload method", function () {
  expect(1);

  env.container.register('serializer:application', DS.RESTSerializer.extend({
    pushPayload: function(store, payload) {
      ok(true, "pushPayload is called on Application serializer");
      return this._super(store, payload);
    }
  }));

  store.pushPayload({posts: [{
    id: '1',
    postTitle: "Ember rocks"
  }]});
});

test("Calling pushPayload without a type should use a model's serializer when normalizing", function () {
  expect(4);

  env.container.register('serializer:post', DS.RESTSerializer.extend({
    normalize: function(store, payload) {
      ok(true, "normalized is called on Post serializer");
      return this._super(store, payload);
    }
  }));

  env.container.register('serializer:application', DS.RESTSerializer.extend({
    normalize: function(store, payload) {
      ok(true, "normalized is called on Application serializer");
      return this._super(store, payload);
    }
  }));


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

  var post = store.getById('post', 1);

  equal(post.get('postTitle'), "Ember rocks", "you can push raw JSON into the store");

  var person = store.getById('person', 2);

  equal(person.get('firstName'), "Yehuda", "you can push raw JSON into the store");
});

test('calling push without data argument as an object raises an error', function(){
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

  Ember.EnumerableUtils.forEach(invalidValues, function(invalidValue){
    throws(function(){
      store.push('person', invalidValue);
    }, /object/);
  });
});
