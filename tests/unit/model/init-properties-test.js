import { run } from '@ember/runloop';
import { get } from '@ember/object';
import { resolve } from 'rsvp';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import DS from 'ember-data';

const { JSONAPIAdapter, Model, attr, belongsTo, hasMany } = DS;

function setupModels(testState) {
  let types;
  const Comment = Model.extend({
    text: attr(),
    post: belongsTo('post', { async: false, inverse: 'comments' })
  });
  const Author = Model.extend({
    name: attr(),
    post: belongsTo('post', { async: false, inverse: 'author' })
  });
  const Post = Model.extend({
    title: attr(),
    author: belongsTo('author', { async: false, inverse: 'post' }),
    comments: hasMany('comment', { async: false, inverse: 'post' }),
    init() {
      this._super(...arguments);
      testState(types, this);
    }
  });
  types = {
    Author,
    Comment,
    Post
  };

  return setupStore({
    adapter: JSONAPIAdapter.extend(),
    post: Post,
    comment: Comment,
    author: Author
  });
}

module('unit/model - init properties', {});

test('createRecord(properties) makes properties available during record init', function(assert) {
  assert.expect(4);
  let comment;
  let author;

  function testState(types, record) {
    assert.ok(get(record, 'title') === 'My Post', 'Attrs are available as expected');
    assert.ok(get(record, 'randomProp') === 'An unknown prop', 'Unknown properties are available as expected');
    assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
    assert.ok(get(record, 'comments.firstObject') instanceof types.Comment, 'hasMany relationships are available as expected');
  }

  let { store } = setupModels(testState);

  run(() => {
    comment = store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          text: 'Hello darkness my old friend'
        }
      }
    });
    author = store.push({
      data: {
        type: 'author',
        id: '1',
        attributes: {
          name: '@runspired'
        }
      }
    });
  });

  run(() => {
    store.createRecord('post', {
      title: 'My Post',
      randomProp: 'An unknown prop',
      comments: [comment],
      author
    });
  });
});

test('store.push() makes properties available during record init', function(assert) {
  assert.expect(3);

  function testState(types, record) {
    assert.ok(get(record, 'title') === 'My Post', 'Attrs are available as expected');
    assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
    assert.ok(get(record, 'comments.firstObject') instanceof types.Comment, 'hasMany relationships are available as expected');
  }

  let { store } = setupModels(testState);

  run(() => store.push({
    data: {
      type: 'post',
      id: '1',
      attributes: {
        title: 'My Post'
      },
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '1' }]
        },
        author: {
          data: { type: 'author', id: '1' }
        }
      }
    },
    included: [
      {
        type: 'comment',
        id: '1',
        attributes: {
          text: 'Hello darkness my old friend'
        }
      },
      {
        type: 'author',
        id: '1',
        attributes: {
          name: '@runspired'
        }
      }
    ]
  }));
});

test('store.findRecord(type, id) makes properties available during record init', function(assert) {
  assert.expect(3);

  function testState(types, record) {
    assert.ok(get(record, 'title') === 'My Post', 'Attrs are available as expected');
    assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
    assert.ok(get(record, 'comments.firstObject') instanceof types.Comment, 'hasMany relationships are available as expected');
  }

  let { adapter, store } = setupModels(testState);

  adapter.findRecord = () => {
    return resolve({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'My Post'
        },
        relationships: {
          comments: {
            data: [{ type: 'comment', id: '1' }]
          },
          author: {
            data: { type: 'author', id: '1' }
          }
        }
      },
      included: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            text: 'Hello darkness my old friend'
          }
        },
        {
          type: 'author',
          id: '1',
          attributes: {
            name: '@runspired'
          }
        }
      ]
    });
  };

  run(() => store.findRecord('post', '1'));
});

test('store.queryRecord(type, query) makes properties available during record init', function(assert) {
  assert.expect(3);

  function testState(types, record) {
    assert.ok(get(record, 'title') === 'My Post', 'Attrs are available as expected');
    assert.ok(get(record, 'author') instanceof types.Author, 'belongsTo relationships are available as expected');
    assert.ok(get(record, 'comments.firstObject') instanceof types.Comment, 'hasMany relationships are available as expected');
  }

  let { adapter, store } = setupModels(testState);

  adapter.queryRecord = () => {
    return resolve({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'My Post'
        },
        relationships: {
          comments: {
            data: [{ type: 'comment', id: '1' }]
          },
          author: {
            data: { type: 'author', id: '1' }
          }
        }
      },
      included: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            text: 'Hello darkness my old friend'
          }
        },
        {
          type: 'author',
          id: '1',
          attributes: {
            name: '@runspired'
          }
        }
      ]
    });
  };

  run(() => store.queryRecord('post', { id: '1' }));
});
