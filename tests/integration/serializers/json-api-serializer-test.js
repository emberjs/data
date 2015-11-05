var env, store, serializer;

var get = Ember.get;
var run = Ember.run;

var User, Handle, GithubHandle, TwitterHandle, Company;

module('integration/serializers/json-api-serializer - JSONAPISerializer', {
  setup: function() {
    User = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      title: DS.attr('string'),
      handles: DS.hasMany('handle', { async: true, polymorphic: true }),
      company: DS.belongsTo('company', { async: true })
    });

    Handle = DS.Model.extend({
      user: DS.belongsTo('user', { async: true })
    });

    GithubHandle = Handle.extend({
      username: DS.attr('string')
    });

    TwitterHandle = Handle.extend({
      nickname: DS.attr('string')
    });

    Company = DS.Model.extend({
      name: DS.attr('string'),
      employees: DS.hasMany('user', { async: true })
    });

    env = setupStore({
      adapter: DS.JSONAPIAdapter,

      user: User,
      handle: Handle,
      'github-handle': GithubHandle,
      'twitter-handle': TwitterHandle,
      company: Company
    });

    store = env.store;
    serializer = store.serializerFor('-json-api');
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test('Calling pushPayload works', function() {
  run(function() {
    serializer.pushPayload(store, {
      data: {
        type: 'users',
        id: '1',
        attributes: {
          'first-name': 'Yehuda',
          'last-name': 'Katz'
        },
        relationships: {
          company: {
            data: { type: 'companies', id: '2' }
          },
          handles: {
            data: [
              { type: 'github-handles', id: '3' },
              { type: 'twitter-handles', id: '4' }
            ]
          }
        }
      },
      included: [{
        type: 'companies',
        id: '2',
        attributes: {
          name: 'Tilde Inc.'
        }
      }, {
        type: 'github-handles',
        id: '3',
        attributes: {
          username: 'wycats'
        }
      }, {
        type: 'twitter-handles',
        id: '4',
        attributes: {
          nickname: '@wycats'
        }
      }]
    });

    var user = store.peekRecord('user', 1);

    equal(get(user, 'firstName'), 'Yehuda', 'firstName is correct');
    equal(get(user, 'lastName'), 'Katz', 'lastName is correct');
    equal(get(user, 'company.name'), 'Tilde Inc.', 'company.name is correct');
    equal(get(user, 'handles.firstObject.username'), 'wycats', 'handles.firstObject.username is correct');
    equal(get(user, 'handles.lastObject.nickname'), '@wycats', 'handles.lastObject.nickname is correct');
  });
});

test('Warns when normalizing an unknown type', function() {
  var documentHash = {
    data: {
      type: 'UnknownType',
      id: '1',
      attributes: {
        foo: 'bar'
      }
    }
  };

  warns(function() {
    run(function() {
      env.store.serializerFor('user').normalizeResponse(env.store, User, documentHash, '1', 'findRecord');
    });
  }, /Encountered a resource object with type "UnknownType", but no model was found for model name "unknown-type"/);
});

test('Serializer should respect the attrs hash when extracting attributes and relationships', function() {
  env.registry.register("serializer:user", DS.JSONAPISerializer.extend({
    attrs: {
      title: "title_attribute_key",
      company: { key: 'company_relationship_key' }
    }
  }));

  var jsonHash = {
    data: {
      type: 'users',
      id: '1',
      attributes: {
        'title_attribute_key': 'director'
      },
      relationships: {
        'company_relationship_key': {
          data: { type: 'companies', id: '2' }
        }
      }
    },
    included: [{
      type: 'companies',
      id: '2',
      attributes: {
        name: 'Tilde Inc.'
      }
    }]
  };

  var user = env.store.serializerFor("user").normalizeResponse(env.store, User, jsonHash, '1', 'findRecord');

  equal(user.data.attributes.title, "director");
  deepEqual(user.data.relationships.company.data, { id: "2", type: "company" });
});

test('Serializer should respect the attrs hash when serializing attributes and relationships', function() {
  env.registry.register("serializer:user", DS.JSONAPISerializer.extend({
    attrs: {
      title: "title_attribute_key",
      company: { key: 'company_relationship_key' }
    }
  }));
  var company, user;

  run(function() {
    env.store.push({
      data: {
        type: 'company',
        id: '1',
        attributes: {
          name: "Tilde Inc."
        }
      }
    });
    company = env.store.peekRecord('company', 1);
    user = env.store.createRecord('user', { firstName: "Yehuda", title: "director", company: company });
  });

  var payload = env.store.serializerFor("user").serialize(user._createSnapshot());

  equal(payload.data.relationships['company_relationship_key'].data.id, "1");
  equal(payload.data.attributes['title_attribute_key'], "director");
});
