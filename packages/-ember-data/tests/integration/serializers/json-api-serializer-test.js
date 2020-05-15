import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/serializers/json-api-serializer - JSONAPISerializer', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const User = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      title: DS.attr('string'),
      handles: DS.hasMany('handle', { async: true, polymorphic: true }),
      company: DS.belongsTo('company', { async: true }),
      reportsTo: DS.belongsTo('user', { async: true, inverse: null }),
    });

    const Handle = DS.Model.extend({
      user: DS.belongsTo('user', { async: true }),
    });

    const GithubHandle = Handle.extend({
      username: DS.attr('string'),
    });

    const TwitterHandle = Handle.extend({
      nickname: DS.attr('string'),
    });

    const Company = DS.Model.extend({
      name: DS.attr('string'),
      employees: DS.hasMany('user', { async: true }),
    });

    const Project = DS.Model.extend({
      'company-name': DS.attr('string'),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:handle', Handle);
    this.owner.register('model:github-handle', GithubHandle);
    this.owner.register('model:twitter-handle', TwitterHandle);
    this.owner.register('model:company', Company);
    this.owner.register('model:project', Project);

    this.owner.register('adapter:application', DS.JSONAPIAdapter.extend());
    this.owner.register('serializer:application', DS.JSONAPISerializer.extend());
  });

  test('Calling pushPayload works', function(assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function() {
      serializer.pushPayload(store, {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            'first-name': 'Yehuda',
            'last-name': 'Katz',
          },
          relationships: {
            company: {
              data: { type: 'companies', id: '2' },
            },
            handles: {
              data: [
                { type: 'github-handles', id: '3' },
                { type: 'twitter-handles', id: '4' },
              ],
            },
          },
        },
        included: [
          {
            type: 'companies',
            id: '2',
            attributes: {
              name: 'Tilde Inc.',
            },
          },
          {
            type: 'github-handles',
            id: '3',
            attributes: {
              username: 'wycats',
            },
          },
          {
            type: 'twitter-handles',
            id: '4',
            attributes: {
              nickname: '@wycats',
            },
          },
        ],
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
    let store = this.owner.lookup('service:store');
    let User = store.modelFor('user');

    var documentHash = {
      data: {
        type: 'UnknownType',
        id: '1',
        attributes: {
          foo: 'bar',
        },
      },
    };

    assert.expectWarning(function() {
      run(function() {
        store.serializerFor('user').normalizeResponse(store, User, documentHash, '1', 'findRecord');
      });
    }, /Encountered a resource object with type "UnknownType", but no model was found for model name "unknown-type"/);
  });

  testInDebug('Warns when normalizing payload with unknown type included', function(assert) {
    let store = this.owner.lookup('service:store');
    let User = store.modelFor('user');

    var documentHash = {
      data: {
        type: 'users',
        id: '1',
        attributes: {
          'first-name': 'Yehuda',
          'last-name': 'Katz',
        },
        relationships: {
          company: {
            data: { type: 'unknown-types', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'unknown-types',
          id: '2',
          attributes: {
            name: 'WyKittens',
          },
        },
      ],
    };

    assert.expectWarning(function() {
      run(function() {
        store.serializerFor('user').normalizeResponse(store, User, documentHash, '1', 'findRecord');
      });
    }, /Encountered a resource object with type "unknown-types", but no model was found for model name "unknown-type"/);
  });

  testInDebug('Warns but does not fail when pushing payload with unknown type included', function(assert) {
    let store = this.owner.lookup('service:store');

    var documentHash = {
      data: {
        type: 'users',
        id: '1',
        attributes: {
          'first-name': 'Yehuda',
          'last-name': 'Katz',
        },
      },
      included: [
        {
          type: 'unknown-types',
          id: '2',
          attributes: {
            name: 'WyKittens',
          },
        },
      ],
    };

    assert.expectWarning(function() {
      run(function() {
        store.pushPayload(documentHash);
      });
    }, /Encountered a resource object with type "unknown-types", but no model was found for model name "unknown-type"/);

    var user = store.peekRecord('user', 1);
    assert.equal(get(user, 'firstName'), 'Yehuda', 'firstName is correct');
  });

  testInDebug('Errors when pushing payload with unknown type included in relationship', function(assert) {
    let store = this.owner.lookup('service:store');

    var documentHash = {
      data: {
        type: 'users',
        id: '1',
        attributes: {
          'first-name': 'Yehuda',
          'last-name': 'Katz',
        },
        relationships: {
          company: {
            data: { type: 'unknown-types', id: '2' },
          },
        },
      },
    };

    assert.expectAssertion(function() {
      run(function() {
        store.pushPayload(documentHash);
      });
    }, /No model was found for 'unknown-type'/);
  });

  testInDebug('Warns when normalizing with type missing', function(assert) {
    let store = this.owner.lookup('service:store');
    let User = store.modelFor('user');

    var documentHash = {
      data: {
        id: '1',
        attributes: {
          foo: 'bar',
        },
      },
    };

    assert.expectAssertion(function() {
      run(function() {
        store.serializerFor('user').normalizeResponse(store, User, documentHash, '1', 'findRecord');
      });
    }, /Encountered a resource object with an undefined type/);
  });

  test('Serializer should respect the attrs hash when extracting attributes and relationships', function(assert) {
    this.owner.register(
      'serializer:user',
      DS.JSONAPISerializer.extend({
        attrs: {
          firstName: 'firstname_attribute_key',
          title: 'title_attribute_key',
          company: { key: 'company_relationship_key' },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let User = store.modelFor('user');

    var jsonHash = {
      data: {
        type: 'users',
        id: '1',
        attributes: {
          firstname_attribute_key: 'Yehuda',
          title_attribute_key: 'director',
        },
        relationships: {
          company_relationship_key: {
            data: { type: 'companies', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'companies',
          id: '2',
          attributes: {
            name: 'Tilde Inc.',
          },
        },
      ],
    };

    var user = store.serializerFor('user').normalizeResponse(store, User, jsonHash, '1', 'findRecord');

    assert.equal(user.data.attributes.firstName, 'Yehuda');
    assert.equal(user.data.attributes.title, 'director');
    assert.deepEqual(user.data.relationships.company.data, { id: '2', type: 'company' });
  });

  test('Serializer should respect the attrs hash when serializing attributes and relationships', function(assert) {
    this.owner.register(
      'serializer:user',
      DS.JSONAPISerializer.extend({
        attrs: {
          firstName: 'firstname_attribute_key',
          title: 'title_attribute_key',
          company: { key: 'company_relationship_key' },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    var company, user;

    run(function() {
      store.push({
        data: {
          type: 'company',
          id: '1',
          attributes: {
            name: 'Tilde Inc.',
          },
        },
      });
      company = store.peekRecord('company', 1);
      user = store.createRecord('user', {
        firstName: 'Yehuda',
        title: 'director',
        company: company,
      });
    });

    var payload = store.serializerFor('user').serialize(user._createSnapshot());

    assert.equal(payload.data.relationships['company_relationship_key'].data.id, '1');
    assert.equal(payload.data.attributes['firstname_attribute_key'], 'Yehuda');
    assert.equal(payload.data.attributes['title_attribute_key'], 'director');
  });

  test('Serializer should respect the attrs hash when extracting attributes with not camelized keys', function(assert) {
    this.owner.register(
      'serializer:project',
      DS.JSONAPISerializer.extend({
        attrs: {
          'company-name': 'company_name',
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let User = store.modelFor('user');

    var jsonHash = {
      data: {
        type: 'projects',
        id: '1',
        attributes: {
          company_name: 'Tilde Inc.',
        },
      },
    };

    var project = store.serializerFor('project').normalizeResponse(store, User, jsonHash, '1', 'findRecord');

    assert.equal(project.data.attributes['company-name'], 'Tilde Inc.');
  });

  test('Serializer should respect the attrs hash when serializing attributes with not camelized keys', function(assert) {
    this.owner.register(
      'serializer:project',
      DS.JSONAPISerializer.extend({
        attrs: {
          'company-name': 'company_name',
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let project = store.createRecord('project', { 'company-name': 'Tilde Inc.' });
    let payload = store.serializerFor('project').serialize(project._createSnapshot());

    assert.equal(payload.data.attributes['company_name'], 'Tilde Inc.');
  });

  test('options are passed to transform for serialization', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    this.owner.register(
      'transform:custom',
      DS.Transform.extend({
        serialize: function(deserialized, options) {
          assert.deepEqual(options, { custom: 'config' });
        },
      })
    );

    store.modelFor('user').reopen({
      myCustomField: DS.attr('custom', {
        custom: 'config',
      }),
    });

    let user = store.createRecord('user', { myCustomField: 'value' });

    store.serializerFor('user').serialize(user._createSnapshot());
  });

  testInDebug('Warns when defining extractMeta()', function(assert) {
    assert.expectWarning(function() {
      DS.JSONAPISerializer.extend({
        extractMeta() {},
      }).create();
    }, /You've defined 'extractMeta' in/);
  });

  test('a belongsTo relationship that is not set will not be in the relationships key', function(assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function() {
      serializer.pushPayload(store, {
        data: {
          type: 'handles',
          id: 1,
        },
      });

      let handle = store.peekRecord('handle', 1);

      let serialized = handle.serialize({ includeId: true });
      assert.deepEqual(serialized, {
        data: {
          type: 'handles',
          id: '1',
        },
      });
    });
  });

  test('a belongsTo relationship that is set to null will show as null in the relationships key', function(assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function() {
      serializer.pushPayload(store, {
        data: {
          type: 'handles',
          id: 1,
        },
      });

      let handle = store.peekRecord('handle', 1);
      handle.set('user', null);

      let serialized = handle.serialize({ includeId: true });
      assert.deepEqual(serialized, {
        data: {
          type: 'handles',
          id: '1',
          relationships: {
            user: {
              data: null,
            },
          },
        },
      });
    });
  });

  test('a belongsTo relationship set to a new record will not show in the relationships key', function(assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function() {
      serializer.pushPayload(store, {
        data: {
          type: 'handles',
          id: 1,
        },
      });

      let handle = store.peekRecord('handle', 1);
      let user = store.createRecord('user');
      handle.set('user', user);

      let serialized = handle.serialize({ includeId: true });
      assert.deepEqual(serialized, {
        data: {
          type: 'handles',
          id: '1',
        },
      });
    });
  });

  test('it should serialize a hasMany relationship', function(assert) {
    this.owner.register(
      'serializer:user',
      DS.JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function() {
      store.serializerFor('user').pushPayload(store, {
        data: {
          type: 'users',
          id: 1,
          relationships: {
            handles: {
              data: [
                { type: 'handles', id: 1 },
                { type: 'handles', id: 2 },
              ],
            },
          },
        },
        included: [
          { type: 'handles', id: 1 },
          { type: 'handles', id: 2 },
        ],
      });

      let user = store.peekRecord('user', 1);

      let serialized = user.serialize({ includeId: true });

      assert.deepEqual(serialized, {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            'first-name': null,
            'last-name': null,
            title: null,
          },
          relationships: {
            handles: {
              data: [
                { type: 'handles', id: '1' },
                { type: 'handles', id: '2' },
              ],
            },
          },
        },
      });
    });
  });

  test('it should not include new records when serializing a hasMany relationship', function(assert) {
    this.owner.register(
      'serializer:user',
      DS.JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function() {
      store.serializerFor('user').pushPayload(store, {
        data: {
          type: 'users',
          id: 1,
          relationships: {
            handles: {
              data: [
                { type: 'handles', id: 1 },
                { type: 'handles', id: 2 },
              ],
            },
          },
        },
        included: [
          { type: 'handles', id: 1 },
          { type: 'handles', id: 2 },
        ],
      });

      let user = store.peekRecord('user', 1);
      store.createRecord('handle', { user });

      let serialized = user.serialize({ includeId: true });

      assert.deepEqual(serialized, {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            'first-name': null,
            'last-name': null,
            title: null,
          },
          relationships: {
            handles: {
              data: [
                { type: 'handles', id: '1' },
                { type: 'handles', id: '2' },
              ],
            },
          },
        },
      });
    });
  });

  test('it should not include any records when serializing a hasMany relationship if they are all new', function(assert) {
    this.owner.register(
      'serializer:user',
      DS.JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function() {
      store.serializerFor('user').pushPayload(store, {
        data: {
          type: 'users',
          id: 1,
        },
      });

      let user = store.peekRecord('user', 1);
      store.createRecord('handle', { user });

      let serialized = user.serialize({ includeId: true });

      assert.deepEqual(serialized, {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            'first-name': null,
            'last-name': null,
            title: null,
          },
          relationships: {
            handles: {
              data: [],
            },
          },
        },
      });
    });
  });

  test('it should include an empty list when serializing an empty hasMany relationship', function(assert) {
    this.owner.register(
      'serializer:user',
      DS.JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function() {
      store.serializerFor('user').pushPayload(store, {
        data: {
          type: 'users',
          id: 1,
          relationships: {
            handles: {
              data: [
                { type: 'handles', id: 1 },
                { type: 'handles', id: 2 },
              ],
            },
          },
        },
        included: [
          { type: 'handles', id: 1 },
          { type: 'handles', id: 2 },
        ],
      });

      let user = store.peekRecord('user', 1);
      let handle1 = store.peekRecord('handle', 1);
      let handle2 = store.peekRecord('handle', 2);
      user.get('handles').removeObject(handle1);
      user.get('handles').removeObject(handle2);

      let serialized = user.serialize({ includeId: true });

      assert.deepEqual(serialized, {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            'first-name': null,
            'last-name': null,
            title: null,
          },
          relationships: {
            handles: {
              data: [],
            },
          },
        },
      });
    });
  });

  testInDebug('Asserts when combined with EmbeddedRecordsMixin', function(assert) {
    assert.expectAssertion(function() {
      DS.JSONAPISerializer.extend(DS.EmbeddedRecordsMixin).create();
    }, /You've used the EmbeddedRecordsMixin in/);
  });

  testInDebug('Allows EmbeddedRecordsMixin if isEmbeddedRecordsMixinCompatible is true', function(assert) {
    assert.expectNoAssertion(function() {
      DS.JSONAPISerializer.extend(DS.EmbeddedRecordsMixin, {
        isEmbeddedRecordsMixinCompatible: true,
      }).create();
    });
  });

  testInDebug('Asserts when normalized attribute key is not found in payload but original key is', function(assert) {
    let store = this.owner.lookup('service:store');
    let User = store.modelFor('user');

    var jsonHash = {
      data: {
        type: 'users',
        id: '1',
        attributes: {
          firstName: 'Yehuda',
        },
      },
    };

    assert.expectAssertion(function() {
      store.serializerFor('user').normalizeResponse(store, User, jsonHash, '1', 'findRecord');
    }, /Your payload for 'user' contains 'firstName', but your serializer is setup to look for 'first-name'/);
  });

  testInDebug('Asserts when normalized relationship key is not found in payload but original key is', function(assert) {
    let store = this.owner.lookup('service:store');
    let User = store.modelFor('user');

    var jsonHash = {
      data: {
        type: 'users',
        id: '1',
        relationships: {
          reportsTo: {
            data: null,
          },
        },
      },
    };

    assert.expectAssertion(function() {
      store.serializerFor('user').normalizeResponse(store, User, jsonHash, '1', 'findRecord');
    }, /Your payload for 'user' contains 'reportsTo', but your serializer is setup to look for 'reports-to'/);
  });
});
