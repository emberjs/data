import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('unit/many_array - ManyArray', function (hooks) {
  setupTest(hooks);

  test('manyArray.save() calls save() on all records', async function (assert) {
    assert.expect(3);

    class Post extends Model {
      @attr('string') title;
      @hasMany('tag', { async: false, inverse: 'post' }) tags;
    }

    class Tag extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'tags' }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store');
    store.saveRecord = function (record) {
      assert.ok(true, 'record.save() was called');
      return resolve();
    };

    store.push({
      data: [
        {
          type: 'tag',
          id: '1',
          attributes: {
            name: 'Ember.js',
          },
        },
        {
          type: 'tag',
          id: '2',
          attributes: {
            name: 'Tomster',
          },
        },
        {
          type: 'post',
          id: '3',
          attributes: {
            title: 'A framework for creating ambitious web applications',
          },
          relationships: {
            tags: {
              data: [
                { type: 'tag', id: '1' },
                { type: 'tag', id: '2' },
              ],
            },
          },
        },
      ],
    });

    let post = store.peekRecord('post', 3);

    await post.tags.save().then(() => {
      assert.ok(true, 'manyArray.save() promise resolved');
    });
  });
});
