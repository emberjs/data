var env, store, serializer;

var get = Ember.get;
var run = Ember.run;

var User, Handle, GithubHandle, TwitterHandle, Company;

module('integration/serializers/json-api-serializer - JSONAPISerializer', {
  setup: function() {
    User = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
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

test('normalizePayload(modelName, payload)', function() {
  var payload = {
    data: {
      type: 'user',
      id: '1',
      relationships: {
        company: {
          data: { type: 'company', id: '2' }
        }
      }
    },
    included: [{
      type: 'company',
      id: '2',
      attributes: {
        name: 'Tilde Inc.'
      }
    }]
  };

  var normalizedPayload = env.store.normalizePayload('user', payload);
  deepEqual(normalizedPayload, payload);
});

test('normalizePayload(payload)', function() {
  var payload = {
    data: {
      type: 'user',
      id: '1',
      relationships: {
        company: {
          data: { type: 'company', id: '2' }
        }
      }
    },
    included: [{
      type: 'company',
      id: '2',
      attributes: {
        name: 'Tilde Inc.'
      }
    }]
  };

  var normalizedPayload = env.store.normalizePayload('user', payload);
  deepEqual(normalizedPayload, payload);
});
