import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

let store, Post, Tag;

const { attr, hasMany, belongsTo } = DS;

module('unit/many_array - DS.ManyArray', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    Post = DS.Model.extend({
      title: attr('string'),
      tags: hasMany('tag', { async: false }),
    });

    Post.reopenClass({
      toString() {
        return 'Post';
      },
    });

    Tag = DS.Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false }),
    });

    Tag.reopenClass({
      toString() {
        return 'Tag';
      },
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:tag', Tag);

    store = this.owner.lookup('service:store');
  });

  test('manyArray.save() calls save() on all records', function (assert) {
    assert.expect(3);

    Tag.reopen({
      save() {
        assert.ok(true, 'record.save() was called');
        return resolve();
      },
    });

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

      return post
        .get('tags')
        .save()
        .then(() => {
          assert.ok(true, 'manyArray.save() promise resolved');
        });
    });
  });

  test('manyArray trigger arrayContentChange functions with the correct values', function (assert) {
    assert.expect(6);

    const TestManyArray = DS.ManyArray.proto();

    let willChangeStartIdx;
    let willChangeRemoveAmt;
    let willChangeAddAmt;

    let originalArrayContentWillChange = TestManyArray.arrayContentWillChange;
    let originalArrayContentDidChange = TestManyArray.arrayContentDidChange;
    let originalInit = TestManyArray.init;

    // override DS.ManyArray temp (cleanup occures in afterTest);

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

        store.peekRecord('post', 3).get('tags');

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
});
