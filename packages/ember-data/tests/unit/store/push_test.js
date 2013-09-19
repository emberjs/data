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

    env = setupStore();

    store = env.store;

    var DefaultSerializer = DS.JSONSerializer.extend({
      store: store
    });

    env.container.register('model:person', Person);
    env.container.register('model:phone-number', PhoneNumber);
    env.container.register('model:post', Post);
    env.container.register('serializer:_default', DefaultSerializer);
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
