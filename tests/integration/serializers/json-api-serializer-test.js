import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

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
    serializer = store.serializerFor('-json-api');
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


testInDebug('JSON warns when combined with EmbeddedRecordsMixin', function(assert) {
  assert.expectWarning(function() {
    DS.JSONAPISerializer.extend(DS.EmbeddedRecordsMixin).create();
  }, /The JSONAPISerializer does not work with the EmbeddedRecordsMixin/);
});
