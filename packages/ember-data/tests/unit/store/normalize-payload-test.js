var env, store, Person, PhoneNumber, Post;
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var run = Ember.run;

module("unit/store/normalize-payload - DS.Store#normalizePayload", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number', { async: false })
    });
    Person.toString = function() {
      return 'Person';
    };

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person', { async: false })
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

    env.registry.register('serializer:post', DS.RESTSerializer);
  },

  teardown: function() {
    run(function() {
      store.destroy();
    });
  }
});

test("normalizePayload(modelName, payload)", function() {
  env.registry.register('serializer:application', DS.RESTSerializer.extend());

  var payload = {
    person: {
      id: 1,
      firstName: "first name",
      phoneNumbers: [1]
    },
    phoneNumbers: [
      { id: 1, number: "1234" }
    ]
  };
  var normalized = store.normalizePayload('person', payload);

  deepEqual(normalized, {
    data: {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'first name'
      },
      relationships: {
        phoneNumbers: {
          data: [
            { id: '1', type: 'phone-number' }
          ]
        }
      }
    },
    included: [
      {
        id: '1',
        type: 'phone-number',
        attributes: {
          number: '1234'
        },
        relationships: {}
      }
    ]
  });
});

test("normalizePayload(payload)", function() {
  env.registry.register('serializer:application', DS.RESTSerializer.extend());

  var payload = {
    person: {
      id: 1,
      firstName: "first name",
      phoneNumbers: [1]
    },
    phoneNumbers: [
      { id: 1, number: "1234" }
    ]
  };
  var normalized = store.normalizePayload(payload);

  deepEqual(normalized, {
    data: [
      {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'first name'
        },
        relationships: {
          phoneNumbers: {
            data: [
              { id: '1', type: 'phone-number' }
            ]
          }
        }
      },
      {
        id: '1',
        type: 'phone-number',
        attributes: {
          number: '1234'
        },
        relationships: {}
      }
    ],
    included: []
  });
});
