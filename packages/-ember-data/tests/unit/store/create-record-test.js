import { A } from '@ember/array';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('unit/store/createRecord - Store creating records', function(hooks) {
  setupTest(hooks);

  test(`doesn't modify passed in properties hash`, function(assert) {
    const Post = Model.extend({
      title: attr(),
      author: belongsTo('author', { async: false, inverse: 'post' }),
      comments: hasMany('comment', { async: false, inverse: 'post' }),
    });

    const Comment = Model.extend({
      text: attr(),
      post: belongsTo('post', { async: false, inverse: 'comments' }),
    });

    const Author = Model.extend({
      name: attr(),
      post: belongsTo('post', { async: false, inverse: 'author' }),
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:author', Author);

    let store = this.owner.lookup('service:store');

    let comment, author;

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

    let properties = {
      title: 'My Post',
      randomProp: 'An unknown prop',
      comments: [comment],
      author,
    };
    let propertiesClone = {
      title: 'My Post',
      randomProp: 'An unknown prop',
      comments: [comment],
      author,
    };

    store.createRecord('post', properties);

    assert.deepEqual(properties, propertiesClone, 'The properties hash is not modified');
  });

  test('allow passing relationships as well as attributes', function(assert) {
    const Record = Model.extend({
      title: attr('string'),
    });

    const Storage = Model.extend({
      name: attr('name'),
      records: hasMany('record', { async: false }),
    });

    this.owner.register('model:record', Record);
    this.owner.register('model:storage', Storage);

    let store = this.owner.lookup('service:store');
    let records, storage;

    run(() => {
      store.push({
        data: [
          {
            type: 'record',
            id: '1',
            attributes: {
              title: "it's a beautiful day",
            },
          },
          {
            type: 'record',
            id: '2',
            attributes: {
              title: "it's a beautiful day",
            },
          },
        ],
      });

      records = store.peekAll('record');
      storage = store.createRecord('storage', { name: 'Great store', records: records });
    });

    assert.equal(storage.get('name'), 'Great store', 'The attribute is well defined');
    assert.equal(
      storage.get('records').findBy('id', '1'),
      A(records).findBy('id', '1'),
      'Defined relationships are allowed in createRecord'
    );
    assert.equal(
      storage.get('records').findBy('id', '2'),
      A(records).findBy('id', '2'),
      'Defined relationships are allowed in createRecord'
    );
  });
});

module('unit/store/createRecord - Store with models by dash', function(hooks) {
  setupTest(hooks);

  test('creating a record by dasherize string finds the model', function(assert) {
    const SomeThing = Model.extend({
      foo: attr('string'),
    });

    this.owner.register('model:some-thing', SomeThing);

    let store = this.owner.lookup('service:store');
    let attributes = { foo: 'bar' };
    let record = store.createRecord('some-thing', attributes);

    assert.equal(record.get('foo'), attributes.foo, 'The record is created');
    assert.equal(store.modelFor('some-thing').modelName, 'some-thing');
  });
});
