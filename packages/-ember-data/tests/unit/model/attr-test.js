import { module, skip, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

module('unit/model/attr | attr syntax', function(hooks) {
  setupTest(hooks);

  let store;
  let owner;
  hooks.beforeEach(function() {
    owner = this.owner;
    store = owner.lookup('service:store');
  });

  test('attr can be used with classic syntax', async function(assert) {
    const User = Model.extend({
      name: attr(),
      nameWithTransform: attr('string'),
      nameWithOptions: attr({}),
      nameWithTransformAndOptions: attr('string', {}),
    });

    owner.register('model:user', User);

    let UserModel = store.modelFor('user');
    let attrs = UserModel.attributes;
    assert.true(attrs.has('name'), 'We have the attr: name');
    assert.true(attrs.has('nameWithTransform'), 'We have the attr: nameWithTransform');
    assert.true(attrs.has('nameWithOptions'), 'We have the attr: nameWithOptions');
    assert.true(attrs.has('nameWithTransformAndOptions'), 'We have the attr: nameWithTransformAndOptions');

    let userRecord = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          nameWithTransform: '@runspired',
          nameWithOptions: 'Contributor',
          nameWithTransformAndOptions: '@runspired contribution',
        },
      },
    });

    assert.strictEqual(userRecord.name, 'Chris', 'attr is correctly set: name');
    assert.strictEqual(userRecord.nameWithTransform, '@runspired', 'attr is correctly set: nameWithTransform');
    assert.strictEqual(userRecord.nameWithOptions, 'Contributor', 'attr is correctly set: nameWithOptions');
    assert.strictEqual(
      userRecord.nameWithTransformAndOptions,
      '@runspired contribution',
      'attr is correctly set: nameWithTransformAndOptions'
    );
  });

  test('attr can be used with native syntax decorator style', async function(assert) {
    class User extends Model {
      @attr() name;
      @attr('string') nameWithTransform;
      @attr({}) nameWithOptions;
      @attr('string', {}) nameWithTransformAndOptions;
    }

    owner.register('model:user', User);

    let UserModel = store.modelFor('user');
    let attrs = UserModel.attributes;
    assert.true(attrs.has('name'), 'We have the attr: name');
    assert.true(attrs.has('nameWithTransform'), 'We have the attr: nameWithTransform');
    assert.true(attrs.has('nameWithOptions'), 'We have the attr: nameWithOptions');
    assert.true(attrs.has('nameWithTransformAndOptions'), 'We have the attr: nameWithTransformAndOptions');

    let userRecord = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          nameWithTransform: '@runspired',
          nameWithOptions: 'Contributor',
          nameWithTransformAndOptions: '@runspired contribution',
        },
      },
    });

    assert.strictEqual(userRecord.name, 'Chris', 'attr is correctly set: name');
    assert.strictEqual(userRecord.nameWithTransform, '@runspired', 'attr is correctly set: nameWithTransform');
    assert.strictEqual(userRecord.nameWithOptions, 'Contributor', 'attr is correctly set: nameWithOptions');
    assert.strictEqual(
      userRecord.nameWithTransformAndOptions,
      '@runspired contribution',
      'attr is correctly set: nameWithTransformAndOptions'
    );
  });

  skip('attr cannot be used with native syntax prop style', async function(assert) {
    class User extends Model {
      name = attr();
      nameWithTransform = attr('string');
      nameWithOptions = attr({});
      nameWithTransformAndOptions = attr('string', {});
    }

    owner.register('model:user', User);

    let UserModel = store.modelFor('user');
    let attrs = UserModel.attributes;
    assert.true(attrs.has('name'), 'We have the attr: name');
    assert.true(attrs.has('nameWithTransform'), 'We have the attr: nameWithTransform');
    assert.true(attrs.has('nameWithOptions'), 'We have the attr: nameWithOptions');
    assert.true(attrs.has('nameWithTransformAndOptions'), 'We have the attr: nameWithTransformAndOptions');

    let userRecord = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
          nameWithTransform: '@runspired',
          nameWithOptions: 'Contributor',
          nameWithTransformAndOptions: '@runspired contribution',
        },
      },
    });

    assert.strictEqual(userRecord.name, 'Chris', 'attr is correctly set: name');
    assert.strictEqual(userRecord.nameWithTransform, '@runspired', 'attr is correctly set: nameWithTransform');
    assert.strictEqual(userRecord.nameWithOptions, 'Contributor', 'attr is correctly set: nameWithOptions');
    assert.strictEqual(
      userRecord.nameWithTransformAndOptions,
      '@runspired contribution',
      'attr is correctly set: nameWithTransformAndOptions'
    );
  });

  skip('attr can be used with native syntax decorator style without parens', async function(assert) {
    class User extends Model {
      @attr name;
    }

    owner.register('model:user', User);

    let UserModel = store.modelFor('user');
    let attrs = UserModel.attributes;
    assert.true(attrs.has('name'), 'We have the attr: name');

    let userRecord = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
      },
    });

    assert.strictEqual(userRecord.name, 'Chris', 'attr is correctly set: name');
  });

  skip('attr can not be used classic syntax without parens', async function(assert) {
    const User = Model.extend({
      name: attr,
    });

    owner.register('model:user', User);

    let UserModel = store.modelFor('user');
    let attrs = UserModel.attributes;
    assert.true(attrs.has('name'), 'We have the attr: name');

    let userRecord = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
      },
    });

    assert.strictEqual(userRecord.name, 'Chris', 'attr is correctly set: name');
  });
});
