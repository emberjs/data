import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

module('unit/model/attr | attr syntax', function (hooks) {
  setupTest(hooks);

  let store;
  let owner;
  hooks.beforeEach(function () {
    owner = this.owner;
    store = owner.lookup('service:store');
  });

  test('attr can be used with classic syntax', async function (assert) {
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

  test('attr can be used with native syntax decorator style', async function (assert) {
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

  test('attr cannot be used with native syntax prop style', async function (assert) {
    // TODO it would be nice if this syntax error'd but it currently doesn't
    class User extends Model {
      name = attr();
      nameWithTransform = attr('string');
      nameWithOptions = attr({});
      nameWithTransformAndOptions = attr('string', {});
    }

    owner.register('model:user', User);

    let UserModel = store.modelFor('user');
    let attrs = UserModel.attributes;
    assert.false(attrs.has('name'), 'We have the attr: name');
    assert.false(attrs.has('nameWithTransform'), 'We have the attr: nameWithTransform');
    assert.false(attrs.has('nameWithOptions'), 'We have the attr: nameWithOptions');
    assert.false(attrs.has('nameWithTransformAndOptions'), 'We have the attr: nameWithTransformAndOptions');

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

    assert.notStrictEqual(userRecord.name, 'Chris', 'attr is correctly set: name');
    assert.notStrictEqual(userRecord.nameWithTransform, '@runspired', 'attr is correctly set: nameWithTransform');
    assert.notStrictEqual(userRecord.nameWithOptions, 'Contributor', 'attr is correctly set: nameWithOptions');
    assert.notStrictEqual(
      userRecord.nameWithTransformAndOptions,
      '@runspired contribution',
      'attr is correctly set: nameWithTransformAndOptions'
    );
  });

  test('attr can be used with native syntax decorator style without parens', async function (assert) {
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

  test('attr can be used to define an attribute with name "content"', async function (assert) {
    class Blog extends Model {
      @attr content;
    }

    owner.register('model:blog', Blog);

    let BlogModel = store.modelFor('blog');
    let attrs = BlogModel.attributes;
    assert.true(attrs.has('content'), 'We have the attr: name');

    let userRecord = store.push({
      data: {
        type: 'blog',
        id: '1',
        attributes: {
          content: 'The best blog post',
        },
      },
    });

    assert.strictEqual(userRecord.content, 'The best blog post', 'attr is correctly set: content');
  });
});
