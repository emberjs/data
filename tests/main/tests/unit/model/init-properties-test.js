import { get } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

function setupModels(owner, testState) {
  const Comment = Model.extend({
    text: attr(),
    post: belongsTo('post', { async: false, inverse: 'comments' }),
  });

  const Author = Model.extend({
    name: attr(),
    post: belongsTo('post', { async: false, inverse: 'author' }),
  });

  const Post = Model.extend({
    title: attr(),
    author: belongsTo('author', { async: false, inverse: 'post' }),
    comments: hasMany('comment', { async: false, inverse: 'post' }),
    init() {
      this._super(...arguments);
      testState(types, this);
    },
  });

  const types = {
    Author,
    Comment,
    Post,
  };

  owner.register('model:post', Post);
  owner.register('model:comment', Comment);
  owner.register('model:author', Author);

  owner.register('adapter:application', JSONAPIAdapter.extend());
  owner.register('serializer:application', class extends JSONAPISerializer {});

  const store = owner.lookup('service:store');
  const adapter = store.adapterFor('application');

  return { adapter, store };
}

module('unit/model - init properties', function (hooks) {
  setupTest(hooks);

  test('createRecord(properties) makes properties available during record init', function (assert) {
    assert.expect(4);

    function testState(types, record) {
      assert.strictEqual(get(record, 'title'), 'My Post', 'Attrs are available as expected');
      assert.strictEqual(get(record, 'randomProp'), 'An unknown prop', 'Unknown properties are available as expected');
      assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
      assert.ok(record.comments.at(0) instanceof types.Comment, 'hasMany relationships are available as expected');
    }

    const { store } = setupModels(this.owner, testState);

    const comment = store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          text: 'Hello darkness my old friend',
        },
      },
    });
    const author = store.push({
      data: {
        type: 'author',
        id: '1',
        attributes: {
          name: '@runspired',
        },
      },
    });

    store.createRecord('post', {
      title: 'My Post',
      randomProp: 'An unknown prop',
      comments: [comment],
      author,
    });
  });

  test('store.push() makes properties available during record init', async function (assert) {
    assert.expect(3);

    function testState(types, record) {
      assert.strictEqual(get(record, 'title'), 'My Post', 'Attrs are available as expected');
      assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
      assert.ok(record.comments.at(0) instanceof types.Comment, 'hasMany relationships are available as expected');
    }

    const { store } = setupModels(this.owner, testState);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'My Post',
        },
        relationships: {
          comments: {
            data: [{ type: 'comment', id: '1' }],
          },
          author: {
            data: { type: 'author', id: '1' },
          },
        },
      },
      included: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            text: 'Hello darkness my old friend',
          },
        },
        {
          type: 'author',
          id: '1',
          attributes: {
            name: '@runspired',
          },
        },
      ],
    });

    await settled();
  });

  test('store.findRecord(type, id) makes properties available during record init', async function (assert) {
    assert.expect(3);

    function testState(types, record) {
      assert.strictEqual(get(record, 'title'), 'My Post', 'Attrs are available as expected');
      assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
      assert.ok(record.comments.at(0) instanceof types.Comment, 'hasMany relationships are available as expected');
    }

    const { adapter, store } = setupModels(this.owner, testState);

    adapter.findRecord = () => {
      return Promise.resolve({
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'My Post',
          },
          relationships: {
            comments: {
              data: [{ type: 'comment', id: '1' }],
            },
            author: {
              data: { type: 'author', id: '1' },
            },
          },
        },
        included: [
          {
            type: 'comment',
            id: '1',
            attributes: {
              text: 'Hello darkness my old friend',
            },
          },
          {
            type: 'author',
            id: '1',
            attributes: {
              name: '@runspired',
            },
          },
        ],
      });
    };

    await store.findRecord('post', '1');
  });

  test('store.queryRecord(type, query) makes properties available during record init', async function (assert) {
    assert.expect(3);

    function testState(types, record) {
      assert.strictEqual(get(record, 'title'), 'My Post', 'Attrs are available as expected');
      assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
      assert.ok(record.comments.at(0) instanceof types.Comment, 'hasMany relationships are available as expected');
    }

    const { adapter, store } = setupModels(this.owner, testState);

    adapter.queryRecord = () => {
      return Promise.resolve({
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'My Post',
          },
          relationships: {
            comments: {
              data: [{ type: 'comment', id: '1' }],
            },
            author: {
              data: { type: 'author', id: '1' },
            },
          },
        },
        included: [
          {
            type: 'comment',
            id: '1',
            attributes: {
              text: 'Hello darkness my old friend',
            },
          },
          {
            type: 'author',
            id: '1',
            attributes: {
              name: '@runspired',
            },
          },
        ],
      });
    };

    await store.queryRecord('post', { id: '1' });
  });

  test('Model class does not get properties passed to setUnknownProperty accidentally', function (assert) {
    assert.expect(2);
    // If we end up passing additional properties to init in modelClasses, we will need to come up with a strategy for
    // how to get setUnknownProperty to continue working

    const Post = Model.extend({
      title: attr(),
      setUnknownProperty: function (key, value) {
        assert.strictEqual(key, 'randomProp', 'Passed the correct key to setUnknownProperty');
        assert.strictEqual(value, 'An unknown prop', 'Passed the correct value to setUnknownProperty');
      },
    });

    this.owner.register('model:post', Post);
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    const store = this.owner.lookup('service:store');

    store.createRecord('post', {
      title: 'My Post',
      randomProp: 'An unknown prop',
    });
  });
});
