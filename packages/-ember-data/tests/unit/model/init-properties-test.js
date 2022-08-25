import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

function setupModels(owner, testState) {
  let types;

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

  types = {
    Author,
    Comment,
    Post,
  };

  owner.register('model:post', Post);
  owner.register('model:comment', Comment);
  owner.register('model:author', Author);

  owner.register('adapter:application', JSONAPIAdapter.extend());
  owner.register('serializer:application', class extends JSONAPISerializer {});

  let store = owner.lookup('service:store');
  let adapter = store.adapterFor('application');

  return { adapter, store };
}

module('unit/model - init properties', function (hooks) {
  setupTest(hooks);

  test('createRecord(properties) makes properties available during record init', function (assert) {
    assert.expect(4);
    let comment;
    let author;

    function testState(types, record) {
      assert.strictEqual(get(record, 'title'), 'My Post', 'Attrs are available as expected');
      assert.strictEqual(get(record, 'randomProp'), 'An unknown prop', 'Unknown properties are available as expected');
      assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
      assert.ok(record.comments.at(0) instanceof types.Comment, 'hasMany relationships are available as expected');
    }

    let { store } = setupModels(this.owner, testState);

    run(() => {
      comment = store.push({
        data: {
          type: 'comment',
          id: '1',
          attributes: {
            text: 'Hello darkness my old friend',
          },
        },
      });
      author = store.push({
        data: {
          type: 'author',
          id: '1',
          attributes: {
            name: '@runspired',
          },
        },
      });
    });

    run(() => {
      store.createRecord('post', {
        title: 'My Post',
        randomProp: 'An unknown prop',
        comments: [comment],
        author,
      });
    });
  });

  test('store.push() makes properties available during record init', function (assert) {
    assert.expect(3);

    function testState(types, record) {
      assert.strictEqual(get(record, 'title'), 'My Post', 'Attrs are available as expected');
      assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
      assert.ok(record.comments.at(0) instanceof types.Comment, 'hasMany relationships are available as expected');
    }

    let { store } = setupModels(this.owner, testState);

    run(() =>
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
      })
    );
  });

  test('store.findRecord(type, id) makes properties available during record init', function (assert) {
    assert.expect(3);

    function testState(types, record) {
      assert.strictEqual(get(record, 'title'), 'My Post', 'Attrs are available as expected');
      assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
      assert.ok(record.comments.at(0) instanceof types.Comment, 'hasMany relationships are available as expected');
    }

    let { adapter, store } = setupModels(this.owner, testState);

    adapter.findRecord = () => {
      return resolve({
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

    run(() => store.findRecord('post', '1'));
  });

  test('store.queryRecord(type, query) makes properties available during record init', function (assert) {
    assert.expect(3);

    function testState(types, record) {
      assert.strictEqual(get(record, 'title'), 'My Post', 'Attrs are available as expected');
      assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
      assert.ok(record.comments.at(0) instanceof types.Comment, 'hasMany relationships are available as expected');
    }

    let { adapter, store } = setupModels(this.owner, testState);

    adapter.queryRecord = () => {
      return resolve({
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

    run(() => store.queryRecord('post', { id: '1' }));
  });

  test('Model class does not get properties passed to setUknownProperty accidentally', function (assert) {
    assert.expect(2);
    // If we end up passing additional properties to init in modelClasses, we will need to come up with a strategy for
    // how to get setUnknownProperty to continue working

    const Post = Model.extend({
      title: attr(),
      setUnknownProperty: function (key, value) {
        assert.strictEqual(key, 'randomProp', 'Passed the correct key to setUknownProperty');
        assert.strictEqual(value, 'An unknown prop', 'Passed the correct value to setUknownProperty');
      },
    });

    this.owner.register('model:post', Post);
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    run(() => {
      store.createRecord('post', {
        title: 'My Post',
        randomProp: 'An unknown prop',
      });
    });
  });
});
