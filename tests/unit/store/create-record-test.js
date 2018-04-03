import { A } from '@ember/array';
import { run } from '@ember/runloop';
import { createStore } from 'dummy/tests/helpers/store';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import DS from 'ember-data';

const { Model, attr, belongsTo, hasMany } = DS;

let store, Record, Storage;

module('unit/store/createRecord - Store creating records', {
  beforeEach() {
    Record = DS.Model.extend({
      title: DS.attr('string')
    });

    Storage = DS.Model.extend({
      name: DS.attr('name'),
      records: DS.hasMany('record', { async: false })
    });

    store = createStore({
      adapter: DS.Adapter.extend(),
      record: Record,
      storage: Storage
    });
  }
});

test(`doesn't modify passed in properties hash`, function(assert) {
  let attributes = { foo: 'bar' };

  run(() => {
    store.createRecord('record', attributes);
    store.createRecord('record', attributes);
  });

  assert.deepEqual(attributes, { foo: 'bar' }, 'The properties hash is not modified');
});

test('allow passing relationships as well as attributes', function(assert) {
  let records, storage;

  run(() => {
    store.push({
      data: [
        {
          type: 'record',
          id: '1',
          attributes: {
            title: "it's a beautiful day"
          }
        },
        {
          type: 'record',
          id: '2',
          attributes: {
            title: "it's a beautiful day"
          }
        }
      ]
    });

    records = store.peekAll('record');
    storage = store.createRecord('storage', { name: 'Great store', records: records });
  });

  assert.equal(storage.get('name'), 'Great store', 'The attribute is well defined');
  assert.equal(storage.get('records').findBy('id', '1'), A(records).findBy('id', '1'), 'Defined relationships are allowed in createRecord');
  assert.equal(storage.get('records').findBy('id', '2'), A(records).findBy('id', '2'), 'Defined relationships are allowed in createRecord');
});

test('createRecord(properties) makes properties available during record init', function(assert) {
  assert.expect(4);
  let comment;
  let author;

  const Post = Model.extend({
    title: attr(),
    author: belongsTo('author', { async: false, inverse: 'post' }),
    comments: hasMany('comment', { async: false, inverse: 'post' }),
    init() {
      this._super(...arguments);
      assert.ok(this.get('title') === 'My Post', 'Attrs are available as expected');
      assert.ok(this.get('randomProp') === 'An unknown prop', 'Unknown properties are available as expected');
      assert.ok(this.get('author') === author, 'belongsTo relationships are available as expected');
      assert.ok(this.get('comments.firstObject') === comment, 'hasMany relationships are available as expected');
    }
  });
  const Comment = Model.extend({
    text: attr(),
    post: belongsTo('post', { async: false, inverse: 'comments' })
  });
  const Author = Model.extend({
    name: attr(),
    post: belongsTo('post', { async: false, inverse: 'author' })
  });
  let env = setupStore({
    post: Post,
    comment: Comment,
    author: Author
  });
  let store = env.store;

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

module('unit/store/createRecord - Store with models by dash', {
  beforeEach() {
    let env = setupStore({
      someThing: DS.Model.extend({
        foo: DS.attr('string')
      })
    });
    store = env.store;
  }
});

test('creating a record by dasherize string finds the model', function(assert) {
  let attributes = { foo: 'bar' };

  let record = run(() => store.createRecord('some-thing', attributes));

  assert.equal(record.get('foo'), attributes.foo, 'The record is created');
  assert.equal(store.modelFor('some-thing').modelName, 'some-thing');
});
