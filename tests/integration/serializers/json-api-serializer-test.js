import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import { isEnabled } from 'ember-data/-private';

import DS from 'ember-data';

var env, store, serializer;

var get = Ember.get;
var run = Ember.run;

var User, Handle, GithubHandle, TwitterHandle, Company, Project;

module('integration/serializers/json-api-serializer - JSONAPISerializer', {
  beforeEach() {
    User = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      title: DS.attr('string'),
      handles: DS.hasMany('handle', { async: true, polymorphic: true }),
      company: DS.belongsTo('company', { async: true }),
      reportsTo: DS.belongsTo('user', { async: true, inverse: null })
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

    Project = DS.Model.extend({
      'company-name': DS.attr('string')
    });

    env = setupStore({
      adapter: DS.JSONAPIAdapter,

      user: User,
      handle: Handle,
      'github-handle': GithubHandle,
      'twitter-handle': TwitterHandle,
      company: Company,
      project: Project
    });

    store = env.store;
    serializer = env.serializer;
  },

  afterEach() {
    run(env.store, 'destroy');
  }
});

test('Calling pushPayload works', function(assert) {
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

    assert.equal(get(user, 'firstName'), 'Yehuda', 'firstName is correct');
    assert.equal(get(user, 'lastName'), 'Katz', 'lastName is correct');
    assert.equal(get(user, 'company.name'), 'Tilde Inc.', 'company.name is correct');
    assert.equal(get(user, 'handles.firstObject.username'), 'wycats', 'handles.firstObject.username is correct');
    assert.equal(get(user, 'handles.lastObject.nickname'), '@wycats', 'handles.lastObject.nickname is correct');
  });
});

testInDebug('Warns when normalizing an unknown type', function(assert) {
  var documentHash = {
    data: {
      type: 'UnknownType',
      id: '1',
      attributes: {
        foo: 'bar'
      }
    }
  };

  assert.expectWarning(function() {
    run(function() {
      env.store.serializerFor('user').normalizeResponse(env.store, User, documentHash, '1', 'findRecord');
    });
  }, /Encountered a resource object with type "UnknownType", but no model was found for model name "unknown-type"/);
});

testInDebug('Warns when normalizing with type missing', function(assert) {
  var documentHash = {
    data: {
      id: '1',
      attributes: {
        foo: 'bar'
      }
    }
  };

  assert.throws(function() {
    run(function() {
      env.store.serializerFor('user').normalizeResponse(env.store, User, documentHash, '1', 'findRecord');
    });
  }, /Encountered a resource object with an undefined type/);
});

test('Serializer should respect the attrs hash when extracting attributes and relationships', function(assert) {
  env.registry.register("serializer:user", DS.JSONAPISerializer.extend({
    attrs: {
      firstName: 'firstname_attribute_key',
      title: "title_attribute_key",
      company: { key: 'company_relationship_key' }
    }
  }));

  var jsonHash = {
    data: {
      type: 'users',
      id: '1',
      attributes: {
        'firstname_attribute_key': 'Yehuda',
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

  assert.equal(user.data.attributes.firstName, 'Yehuda');
  assert.equal(user.data.attributes.title, "director");
  assert.deepEqual(user.data.relationships.company.data, { id: "2", type: "company" });
});

test('Serializer should respect the attrs hash when serializing attributes and relationships', function(assert) {
  env.registry.register("serializer:user", DS.JSONAPISerializer.extend({
    attrs: {
      firstName: 'firstname_attribute_key',
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

  assert.equal(payload.data.relationships['company_relationship_key'].data.id, "1");
  assert.equal(payload.data.attributes['firstname_attribute_key'], 'Yehuda');
  assert.equal(payload.data.attributes['title_attribute_key'], "director");
});

test('Serializer should respect the attrs hash when extracting attributes with not camelized keys', function(assert) {
  env.registry.register('serializer:project', DS.JSONAPISerializer.extend({
    attrs: {
      'company-name': 'company_name'
    }
  }));

  var jsonHash = {
    data: {
      type: 'projects',
      id: '1',
      attributes: {
        'company_name': 'Tilde Inc.'
      }
    }
  };

  var project = env.store.serializerFor('project').normalizeResponse(env.store, User, jsonHash, '1', 'findRecord');

  assert.equal(project.data.attributes['company-name'], 'Tilde Inc.');
});

test('Serializer should respect the attrs hash when serializing attributes with not camelized keys', function(assert) {
  env.registry.register('serializer:project', DS.JSONAPISerializer.extend({
    attrs: {
      'company-name': 'company_name'
    }
  }));
  var project;

  run(function() {
    project = env.store.createRecord('project', { 'company-name': 'Tilde Inc.' });
  });

  var payload = env.store.serializerFor('project').serialize(project._createSnapshot());

  assert.equal(payload.data.attributes['company_name'], 'Tilde Inc.');
});

test('options are passed to transform for serialization', function(assert) {
  assert.expect(1);

  env.registry.register('transform:custom', DS.Transform.extend({
    serialize: function(deserialized, options) {
      assert.deepEqual(options, { custom: 'config' });
    }
  }));

  User.reopen({
    myCustomField: DS.attr('custom', {
      custom: 'config'
    })
  });

  var user;
  run(function() {
    user = env.store.createRecord('user', { myCustomField: 'value' });
  });

  env.store.serializerFor('user').serialize(user._createSnapshot());
});

testInDebug('Warns when defining extractMeta()', function(assert) {
  assert.expectWarning(function() {
    DS.JSONAPISerializer.extend({
      extractMeta() {}
    }).create();
  }, /You've defined 'extractMeta' in/);
});

testInDebug('JSON warns when combined with EmbeddedRecordsMixin', function(assert) {
  assert.expectWarning(function() {
    DS.JSONAPISerializer.extend(DS.EmbeddedRecordsMixin).create();
  }, /The JSONAPISerializer does not work with the EmbeddedRecordsMixin/);
});

testInDebug('Asserts when normalized attribute key is not found in payload but original key is', function(assert) {
  var jsonHash = {
    data: {
      type: 'users',
      id: '1',
      attributes: {
        'firstName': 'Yehuda'
      }
    }
  };
  assert.expectAssertion(function() {
    env.store.serializerFor("user").normalizeResponse(env.store, User, jsonHash, '1', 'findRecord');
  }, /Your payload for 'user' contains 'firstName', but your serializer is setup to look for 'first-name'/);
});

testInDebug('Asserts when normalized relationship key is not found in payload but original key is', function(assert) {
  var jsonHash = {
    data: {
      type: 'users',
      id: '1',
      relationships: {
        'reportsTo': {
          data: null
        }
      }
    }
  };
  assert.expectAssertion(function() {
    env.store.serializerFor("user").normalizeResponse(env.store, User, jsonHash, '1', 'findRecord');
  }, /Your payload for 'user' contains 'reportsTo', but your serializer is setup to look for 'reports-to'/);
});

if (isEnabled("ds-payload-type-hooks")) {
  test('mapping of payload type can be customized via modelNameFromPayloadType', function(assert) {
    env.registry.register('serializer:user', DS.JSONAPISerializer.extend({
      modelNameFromPayloadType: function(payloadType) {
        return payloadType.replace("api::v1::", "");
      }
    }));

    let jsonHash = {
      data: {
        id: "1",
        type: "api::v1::user",
        relationships: {
          company: {
            data: {
              id: "1",
              type: "api::v1::company"
            }
          },
          handles: {
            data: [{
              id: "1",
              type: "api::v1::handle"
            }]
          }
        }
      }
    };

    assert.expectNoDeprecation();

    let user = env.store.serializerFor('user').normalizeResponse(env.store, User, jsonHash, '1', 'findRecord');

    assert.deepEqual(user, {
      data: {
        id: "1",
        type: "user",
        attributes: {},
        relationships: {
          company: {
            data: {
              id: "1",
              type: "company"
            }
          },
          handles: {
            data: [{
              id: "1",
              type: "handle"
            }]
          }
        }
      }
    });
  });

  testInDebug('DEPRECATED - mapping of payload type can be customized via modelNameFromPayloadKey', function(assert) {
    env.registry.register('serializer:user', DS.JSONAPISerializer.extend({
      modelNameFromPayloadKey: function(payloadType) {
        return payloadType.replace("api::v1::", "");
      }
    }));

    let jsonHash = {
      data: {
        id: "1",
        type: "api::v1::user",
        relationships: {
          company: {
            data: {
              id: "1",
              type: "api::v1::company"
            }
          },
          handles: {
            data: [{
              id: "1",
              type: "api::v1::handle"
            }]
          }
        }
      }
    };

    assert.expectDeprecation("You are using modelNameFromPayloadKey to normalize the type for a relationship. This has been deprecated in favor of modelNameFromPayloadType");

    let user = env.store.serializerFor('user').normalizeResponse(env.store, User, jsonHash, '1', 'findRecord');

    assert.deepEqual(user, {
      data: {
        id: "1",
        type: "user",
        attributes: {},
        relationships: {
          company: {
            data: {
              id: "1",
              type: "company"
            }
          },
          handles: {
            data: [{
              id: "1",
              type: "handle"
            }]
          }
        }
      }
    });
  });

  test('mapping of model name can be customized via payloadTypeFromModelName', function(assert) {
    env.registry.register("serializer:user", DS.JSONAPISerializer.extend({
      attrs: {
        handles: { serialize: true },
        firstName: { serialize: false },
        lastName: { serialize: false },
        title: { serialize: false },
        reportsTo: { serialize: false }
      },
      payloadTypeFromModelName: function(modelName) {
        return `api::v1::${modelName}`;
      }
    }));

    let user;

    run(function() {
      let company = env.store.push({
        data: {
          type: 'company',
          id: '1'
        }
      });

      let handle = env.store.push({
        data: {
          type: 'handle',
          id: '1'
        }
      });

      user = env.store.createRecord('user', {
        company,
        handles: [handle]
      });
    });

    assert.expectNoDeprecation();

    var payload = env.store.serializerFor("user").serialize(user._createSnapshot());

    assert.deepEqual(payload, {
      data: {
        type: 'api::v1::user',
        relationships: {
          company: {
            data: {
              id: '1',
              type: 'api::v1::company'
            }
          },
          handles: {
            data: [{
              id: '1',
              type: 'api::v1::handle'
            }]
          }
        }
      }
    });
  });

  testInDebug('DEPRECATED - mapping of model name can be customized via payloadKeyFromModelName', function(assert) {
    env.registry.register("serializer:user", DS.JSONAPISerializer.extend({
      attrs: {
        handles: { serialize: true },
        firstName: { serialize: false },
        lastName: { serialize: false },
        title: { serialize: false },
        reportsTo: { serialize: false }
      },
      payloadKeyFromModelName: function(modelName) {
        return `api::v1::${modelName}`;
      }
    }));

    let user;

    run(function() {
      let company = env.store.push({
        data: {
          type: 'company',
          id: '1'
        }
      });

      let handle = env.store.push({
        data: {
          type: 'handle',
          id: '1'
        }
      });

      user = env.store.createRecord('user', {
        company,
        handles: [handle]
      });
    });

    assert.expectDeprecation("You used payloadKeyFromModelName to customize how a type is serialized. Use payloadTypeFromModelName instead.");

    var payload = env.store.serializerFor("user").serialize(user._createSnapshot());

    assert.deepEqual(payload, {
      data: {
        type: 'api::v1::user',
        relationships: {
          company: {
            data: {
              id: '1',
              type: 'api::v1::company'
            }
          },
          handles: {
            data: [{
              id: '1',
              type: 'api::v1::handle'
            }]
          }
        }
      }
    });
  });
}
