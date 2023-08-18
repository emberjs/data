import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('unit/store/createRecord - Store creating records', function (hooks) {
  setupTest(hooks);

  test(`allows unknown properties to be delivered to the record (classic)`, function (assert) {
    class Post extends Model {
      @attr title;
      recent = false;
    }
    const ClassicPost = Model.extend({
      title: attr(),
      recent: false,
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:classic-post', ClassicPost);
    const store = this.owner.lookup('service:store');

    const originalInstantiate = store.instantiateRecord;
    store.instantiateRecord = function (record, properties) {
      assert.step('instantiateRecord');
      assert.strictEqual(properties.unknownProp, 'Unknown prop', 'unknownProp is passed along');
      assert.strictEqual(properties.recent, true, 'recent is passed along');
      return originalInstantiate.apply(this, arguments);
    };

    const record = store.createRecord('post', {
      title: 'Ember.js is good',
      recent: true,
      unknownProp: 'Unknown prop',
    });
    const classicRecord = store.createRecord('classic-post', {
      title: 'Ember.js is good',
      recent: true,
      unknownProp: 'Unknown prop',
    });

    assert.strictEqual(record.unknownProp, 'Unknown prop', 'unknownProp is set');
    assert.strictEqual(record.recent, true, 'recent is set');
    assert.strictEqual(classicRecord.unknownProp, 'Unknown prop', 'unknownProp is set');
    assert.strictEqual(classicRecord.recent, true, 'recent is set');

    assert.verifySteps(['instantiateRecord', 'instantiateRecord']);
  });

  test(`doesn't modify passed in properties hash`, function (assert) {
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
    let comment = store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          text: 'Hello darkness my old friend',
        },
      },
    });
    let author = store.push({
      data: {
        type: 'author',
        id: '1',
        attributes: {
          name: '@runspired',
        },
      },
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

  test('allow passing relationships as well as attributes', function (assert) {
    const Record = Model.extend({
      title: attr('string'),
    });

    const Storage = Model.extend({
      name: attr('name'),
      records: hasMany('record', { async: false, inverse: null }),
    });

    this.owner.register('model:record', Record);
    this.owner.register('model:storage', Storage);

    let store = this.owner.lookup('service:store');

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

    let records = store.peekAll('record').slice();
    let storage = store.createRecord('storage', { name: 'Great store', records: records });

    assert.strictEqual(storage.name, 'Great store', 'The attribute is well defined');
    assert.strictEqual(
      storage.records.find((r) => r.id === '1'),
      records.find((r) => r.id === '1'),
      'Defined relationships are allowed in createRecord'
    );
    assert.strictEqual(
      storage.records.find((r) => r.id === '2'),
      records.find((r) => r.id === '2'),
      'Defined relationships are allowed in createRecord'
    );
  });
});

module('unit/store/createRecord - Store with models by dash', function (hooks) {
  setupTest(hooks);

  test('creating a record by dasherize string finds the model', function (assert) {
    const SomeThing = Model.extend({
      foo: attr('string'),
    });

    this.owner.register('model:some-thing', SomeThing);

    let store = this.owner.lookup('service:store');
    let attributes = { foo: 'bar' };
    let record = store.createRecord('some-thing', attributes);

    assert.strictEqual(record.foo, attributes.foo, 'The record is created');
    assert.strictEqual(store.modelFor('some-thing').modelName, 'some-thing');
  });
});
