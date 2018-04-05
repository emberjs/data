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
  const Post = Model.extend({
    title: attr(),
    author: belongsTo('author', { async: false, inverse: 'post' }),
    comments: hasMany('comment', { async: false, inverse: 'post' })
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
  let comment, author;

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

  let properties = {
    title: 'My Post',
    randomProp: 'An unknown prop',
    comments: [comment],
    author
  };
  let propertiesClone = {
    title: 'My Post',
    randomProp: 'An unknown prop',
    comments: [comment],
    author
  };

  store.createRecord('post', properties);

  assert.deepEqual(properties, propertiesClone, 'The properties hash is not modified');
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
  let record = store.createRecord('some-thing', attributes);

  assert.equal(record.get('foo'), attributes.foo, 'The record is created');
  assert.equal(store.modelFor('some-thing').modelName, 'some-thing');
});
