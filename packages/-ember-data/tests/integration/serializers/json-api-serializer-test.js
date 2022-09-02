import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import Transform from '@ember-data/serializer/transform';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/serializers/json-api-serializer - JSONAPISerializer', function (hooks) {
  setupTest(hooks);

  class User extends Model {
    @attr('string') firstName;
    @attr('string') lastName;
    @attr('string') title;
    @hasMany('handle', { async: true, polymorphic: true, inverse: 'user' }) handles;
    @belongsTo('company', { async: true, inverse: 'employees' }) company;
    @belongsTo('user', { async: true, inverse: null }) reportsTo;
  }

  class Handle extends Model {
    @belongsTo('user', { async: true, inverse: 'handles', as: 'handle' }) user;
  }

  class GithubHandle extends Model {
    @attr('string') username;
    @belongsTo('user', { async: true, inverse: 'handles', as: 'handle' }) user;
  }

  class TwitterHandle extends Model {
    @attr('string') nickname;
    @belongsTo('user', { async: true, inverse: 'handles', as: 'handle' }) user;
  }

  class Company extends Model {
    @attr('string') name;
    @hasMany('user', { async: true, inverse: 'company' }) employees;
  }

  class Project extends Model {
    @attr 'company-name';
  }

  hooks.beforeEach(function () {
    this.owner.register('model:user', User);
    this.owner.register('model:handle', Handle);
    this.owner.register('model:github-handle', GithubHandle);
    this.owner.register('model:twitter-handle', TwitterHandle);
    this.owner.register('model:company', Company);
    this.owner.register('model:project', Project);

    this.owner.register('adapter:application', class extends JSONAPIAdapter {});
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('Calling pushPayload works', async function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

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

    const user = store.peekRecord('user', 1);
    const company = await user.company;
    const handles = await user.handles;

    assert.strictEqual(user.firstName, 'Yehuda', 'firstName is correct');
    assert.strictEqual(user.lastName, 'Katz', 'lastName is correct');
    assert.strictEqual(company.name, 'Tilde Inc.', 'company.name is correct');
    assert.strictEqual(handles.at(0).username, 'wycats', 'handles.at(0).username is correct');
    assert.strictEqual(handles.at(-1).nickname, '@wycats', 'handles.at(-1).nickname is correct');
  });

  testInDebug('Warns when normalizing an unknown type', function (assert) {
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

    assert.expectWarning(function () {
      run(function () {
        store.serializerFor('user').normalizeResponse(store, User, documentHash, '1', 'findRecord');
      });
    }, /Encountered a resource object with type "UnknownType", but no model was found for model name "unknown-type"/);
  });

  testInDebug('Warns when normalizing payload with unknown type included', function (assert) {
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

    assert.expectWarning(function () {
      run(function () {
        store.serializerFor('user').normalizeResponse(store, User, documentHash, '1', 'findRecord');
      });
    }, /Encountered a resource object with type "unknown-types", but no model was found for model name "unknown-type"/);
  });

  testInDebug('Warns but does not fail when pushing payload with unknown type included', function (assert) {
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

    assert.expectWarning(function () {
      run(function () {
        store.pushPayload(documentHash);
      });
    }, /Encountered a resource object with type "unknown-types", but no model was found for model name "unknown-type"/);

    var user = store.peekRecord('user', 1);
    assert.strictEqual(get(user, 'firstName'), 'Yehuda', 'firstName is correct');
  });

  testInDebug('Errors when pushing payload with unknown type included in relationship', function (assert) {
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

    assert.expectAssertion(function () {
      run(function () {
        store.pushPayload(documentHash);
      });
    }, /No model was found for 'unknown-type'/);
  });

  testInDebug('Warns when normalizing with type missing', function (assert) {
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

    assert.expectAssertion(function () {
      run(function () {
        store.serializerFor('user').normalizeResponse(store, User, documentHash, '1', 'findRecord');
      });
    }, /Encountered a resource object with an undefined type/);
  });

  test('Serializer should respect the attrs hash when extracting attributes and relationships', function (assert) {
    this.owner.register(
      'serializer:user',
      JSONAPISerializer.extend({
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

    assert.strictEqual(user.data.attributes.firstName, 'Yehuda');
    assert.strictEqual(user.data.attributes.title, 'director');
    assert.deepEqual(user.data.relationships.company.data, { id: '2', type: 'company' });
  });

  test('Serializer should respect the attrs hash when serializing attributes and relationships', function (assert) {
    this.owner.register(
      'serializer:user',
      JSONAPISerializer.extend({
        attrs: {
          firstName: 'firstname_attribute_key',
          title: 'title_attribute_key',
          company: { key: 'company_relationship_key' },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    var company, user;

    run(function () {
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

    assert.strictEqual(payload.data.relationships['company_relationship_key'].data.id, '1');
    assert.strictEqual(payload.data.attributes['firstname_attribute_key'], 'Yehuda');
    assert.strictEqual(payload.data.attributes['title_attribute_key'], 'director');
  });

  test('Serializer should respect the attrs hash when extracting attributes with not camelized keys', function (assert) {
    this.owner.register(
      'serializer:project',
      JSONAPISerializer.extend({
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

    assert.strictEqual(project.data.attributes['company-name'], 'Tilde Inc.');
  });

  test('Serializer should respect the attrs hash when serializing attributes with not camelized keys', function (assert) {
    this.owner.register(
      'serializer:project',
      JSONAPISerializer.extend({
        attrs: {
          'company-name': 'company_name',
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let project = store.createRecord('project', { 'company-name': 'Tilde Inc.' });
    let payload = store.serializerFor('project').serialize(project._createSnapshot());

    assert.strictEqual(payload.data.attributes['company_name'], 'Tilde Inc.');
  });

  test('options are passed to transform for serialization', function (assert) {
    assert.expect(1);

    const User = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      title: attr('string'),
      handles: hasMany('handle', { async: true, polymorphic: true, inverse: 'user' }),
      company: belongsTo('company', { async: true, inverse: 'employees' }),
      reportsTo: belongsTo('user', { async: true, inverse: null }),
      myCustomField: attr('custom', {
        custom: 'config',
      }),
    });

    this.owner.register('model:user', User);

    let store = this.owner.lookup('service:store');
    let user = store.createRecord('user', { myCustomField: 'value' });

    this.owner.register(
      'transform:custom',
      Transform.extend({
        serialize: function (deserialized, options) {
          assert.deepEqual(options, { custom: 'config' }, 'we have the right options');
        },
      })
    );

    store.serializerFor('user').serialize(user._createSnapshot());
  });

  testInDebug('Warns when defining extractMeta()', function (assert) {
    assert.expectWarning(function () {
      JSONAPISerializer.extend({
        extractMeta() {},
      }).create();
    }, /You've defined 'extractMeta' in/);
  });

  test('a belongsTo relationship that is not set will not be in the relationships key', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      serializer.pushPayload(store, {
        data: {
          type: 'handles',
          id: '1',
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

  test('a belongsTo relationship that is set to null will show as null in the relationships key', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    serializer.pushPayload(store, {
      data: {
        type: 'handles',
        id: '1',
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

  test('a belongsTo relationship set to a new record will not show in the relationships key', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    run(function () {
      serializer.pushPayload(store, {
        data: {
          type: 'handles',
          id: '1',
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

  test('it should serialize a hasMany relationship', function (assert) {
    this.owner.register(
      'serializer:user',
      JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function () {
      store.serializerFor('user').pushPayload(store, {
        data: {
          type: 'users',
          id: '1',
          relationships: {
            handles: {
              data: [
                { type: 'handles', id: '1' },
                { type: 'handles', id: '2' },
              ],
            },
          },
        },
        included: [
          { type: 'handles', id: '1' },
          { type: 'handles', id: '2' },
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

  test('it should not include new records when serializing a hasMany relationship', function (assert) {
    this.owner.register(
      'serializer:user',
      JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function () {
      store.serializerFor('user').pushPayload(store, {
        data: {
          type: 'users',
          id: '1',
          relationships: {
            handles: {
              data: [
                { type: 'handles', id: '1' },
                { type: 'handles', id: '2' },
              ],
            },
          },
        },
        included: [
          { type: 'handles', id: '1' },
          { type: 'handles', id: '2' },
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

  test('it should not include any records when serializing a hasMany relationship if they are all new', function (assert) {
    this.owner.register(
      'serializer:user',
      JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function () {
      store.serializerFor('user').pushPayload(store, {
        data: {
          type: 'users',
          id: '1',
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

  test('it should include an empty list when serializing an empty hasMany relationship', async function (assert) {
    this.owner.register(
      'serializer:user',
      JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    store.serializerFor('user').pushPayload(store, {
      data: {
        type: 'users',
        id: '1',
        relationships: {
          handles: {
            data: [
              { type: 'handles', id: '1' },
              { type: 'handles', id: '2' },
            ],
          },
        },
      },
      included: [
        { type: 'handles', id: '1' },
        { type: 'handles', id: '2' },
      ],
    });

    let user = store.peekRecord('user', '1');
    let handle1 = store.peekRecord('handle', '1');
    let handle2 = store.peekRecord('handle', '2');

    const handles = await user.handles;
    handles.splice(handles.indexOf(handle1), 1);
    handles.splice(handles.indexOf(handle2), 1);

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

  testInDebug('Asserts when combined with EmbeddedRecordsMixin', function (assert) {
    assert.expectAssertion(function () {
      JSONAPISerializer.extend(EmbeddedRecordsMixin).create();
    }, /You've used the EmbeddedRecordsMixin in/);
  });

  testInDebug('Allows EmbeddedRecordsMixin if isEmbeddedRecordsMixinCompatible is true', function (assert) {
    assert.expectNoAssertion(function () {
      JSONAPISerializer.extend(EmbeddedRecordsMixin, {
        isEmbeddedRecordsMixinCompatible: true,
      }).create();
    });
  });

  testInDebug('Asserts when normalized attribute key is not found in payload but original key is', function (assert) {
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

    assert.expectAssertion(function () {
      store.serializerFor('user').normalizeResponse(store, User, jsonHash, '1', 'findRecord');
    }, /Your payload for 'user' contains 'firstName', but your serializer is setup to look for 'first-name'/);
  });

  testInDebug(
    'Asserts when normalized relationship key is not found in payload but original key is',
    function (assert) {
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

      assert.expectAssertion(function () {
        store.serializerFor('user').normalizeResponse(store, User, jsonHash, '1', 'findRecord');
      }, /Your payload for 'user' contains 'reportsTo', but your serializer is setup to look for 'reports-to'/);
    }
  );
});
