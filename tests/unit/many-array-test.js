import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

let env, store, Post, Tag;

const { attr, hasMany, belongsTo } = DS;
const { run } = Ember;

module('unit/many_array - DS.ManyArray', {
  beforeEach() {
    Post = DS.Model.extend({
      title: attr('string'),
      tags: hasMany('tag', { async: false })
    });

    Post.reopenClass({
      toString() {
        return 'Post';
      }
    });

    Tag = DS.Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false })
    });

    Tag.reopenClass({
      toString() {
        return 'Tag';
      }
    });

    env = setupStore({
      post: Post,
      tag: Tag
    });

    store = env.store;
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('manyArray.save() calls save() on all records', function(assert) {
  assert.expect(3);

  Tag.reopen({
    save() {
      assert.ok(true, 'record.save() was called');
      return Ember.RSVP.resolve();
    }
  });

  return run(() => {
    store.push({
      data: [
        {
          type: 'tag',
          id: '1',
          attributes: {
            name: 'Ember.js'
          }
        },
        {
          type: 'tag',
          id: '2',
          attributes: {
            name: 'Tomster'
          }
        },
        {
          type: 'post',
          id: '3',
          attributes: {
            title: 'A framework for creating ambitious web applications'
          },
          relationships: {
            tags: {
              data: [
                { type: 'tag', id: '1' },
                { type: 'tag', id: '2' }
              ]
            }
          }
        }]
    });

    let post = store.peekRecord('post', 3);

    return post.get('tags').save().then(() => {
      assert.ok(true, 'manyArray.save() promise resolved');
    });
  });
});

test('manyArray trigger arrayContentChange functions with the correct values', function(assert) {
  assert.expect(6);

  let willChangeStartIdx;
  let willChangeRemoveAmt;
  let willChangeAddAmt;

  let originalArrayContentWillChange = DS.ManyArray.proto().arrayContentWillChange;
  let originalArrayContentDidChange = DS.ManyArray.proto().arrayContentDidChange;

  // override DS.ManyArray temp (cleanup occures in afterTest);

  DS.ManyArray.proto().arrayContentWillChange = function(startIdx, removeAmt, addAmt)  {
    willChangeStartIdx = startIdx;
    willChangeRemoveAmt = removeAmt;
    willChangeAddAmt = addAmt;

    return originalArrayContentWillChange.apply(this, arguments);
  };

  DS.ManyArray.proto().arrayContentDidChange = function(startIdx, removeAmt, addAmt) {
    assert.equal(startIdx, willChangeStartIdx, 'WillChange and DidChange startIdx should match');
    assert.equal(removeAmt, willChangeRemoveAmt, 'WillChange and DidChange removeAmt should match');
    assert.equal(addAmt, willChangeAddAmt, 'WillChange and DidChange addAmt should match');

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
              name: 'Ember.js'
            }
          },
          {
            type: 'tag',
            id: '2',
            attributes: {
              name: 'Tomster'
            }
          },
          {
            type: 'post',
            id: '3',
            attributes: {
              title: 'A framework for creating ambitious web applications'
            },
            relationships: {
              tags: {
                data: [
                  { type: 'tag', id: '1' }
                ]
              }
            }
          }
        ]
      });

      store.peekRecord('post', 3).get('tags');

      store.push({
        data: {
          type: 'post',
          id: '3',
          attributes: {
            title: 'A framework for creating ambitious web applications'
          },
          relationships: {
            tags: {
              data: [
                { type: 'tag', id: '1' },
                { type: 'tag', id: '2' }
              ]
            }
          }
        }
      });
    });
  } finally {
    DS.ManyArray.proto().arrayContentWillChange = originalArrayContentWillChange;
    DS.ManyArray.proto().arrayContentDidChange = originalArrayContentDidChange;
  }
});
