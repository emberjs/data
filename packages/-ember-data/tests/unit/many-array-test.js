import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { gte } from 'ember-compatibility-helpers';
import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { ManyArray } from '@ember-data/model/-private';

module('unit/many_array - ManyArray', function (hooks) {
  setupTest(hooks);

  test('manyArray.save() calls save() on all records', function (assert) {
    assert.expect(3);

    class Post extends Model {
      @attr('string') title;
      @hasMany('tag', { async: false, inverse: 'post' }) tags;
    }

    class Tag extends Model {
      @attr('string') name;
      @belongsTo('post', { async: false, inverse: 'tags' }) post;

      save() {
        assert.ok(true, 'record.save() was called');
        return resolve();
      }
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store');

    return run(() => {
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

      return post.tags.save().then(() => {
        assert.ok(true, 'manyArray.save() promise resolved');
      });
    });
  });

  if (!gte('4.0.0')) {
    test('manyArray trigger arrayContentChange functions with the correct values', function (assert) {
      assert.expect(6);
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

      const TestManyArray = ManyArray.proto();

      let willChangeStartIdx;
      let willChangeRemoveAmt;
      let willChangeAddAmt;

      let originalArrayContentWillChange = TestManyArray.arrayContentWillChange;
      let originalArrayContentDidChange = TestManyArray.arrayContentDidChange;
      let originalInit = TestManyArray.init;

      // override ManyArray temp (cleanup occures in afterTest);

      TestManyArray.init = function (...args) {
        // We aren't actually adding any observers in this test
        // just testing the observer codepaths, so we use this to
        // force the ManyArray instance to take the observer paths.
        this.__hasArrayObservers = true;
        originalInit.call(this, ...args);
      };

      TestManyArray.arrayContentWillChange = function (startIdx, removeAmt, addAmt) {
        willChangeStartIdx = startIdx;
        willChangeRemoveAmt = removeAmt;
        willChangeAddAmt = addAmt;

        return originalArrayContentWillChange.apply(this, arguments);
      };

      TestManyArray.arrayContentDidChange = function (startIdx, removeAmt, addAmt) {
        assert.strictEqual(startIdx, willChangeStartIdx, 'WillChange and DidChange startIdx should match');
        assert.strictEqual(removeAmt, willChangeRemoveAmt, 'WillChange and DidChange removeAmt should match');
        assert.strictEqual(addAmt, willChangeAddAmt, 'WillChange and DidChange addAmt should match');

        return originalArrayContentDidChange.apply(this, arguments);
      };

      try {
        run(() => {
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
                    data: [{ type: 'tag', id: '1' }],
                  },
                },
              },
            ],
          });

          store.peekRecord('post', 3).tags;

          store.push({
            data: {
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
          });
        });
      } finally {
        TestManyArray.arrayContentWillChange = originalArrayContentWillChange;
        TestManyArray.arrayContentDidChange = originalArrayContentDidChange;
        TestManyArray.init = originalInit;
      }
    });
  }
});
