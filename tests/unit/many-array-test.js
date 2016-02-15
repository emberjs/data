import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store;
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var run = Ember.run;

var Post, Tag;

module("unit/many_array - DS.ManyArray", {
  beforeEach() {
    Post = DS.Model.extend({
      title: attr('string'),
      tags: hasMany('tag', { async: false })
    });

    Tag = DS.Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false })
    });

    env = setupStore({
      post: Post,
      tag: Tag
    });
    store = env.store;
  },

  afterEach() {
    run(function() {
      store.destroy();
    });
  }
});

test("manyArray.save() calls save() on all records", function(assert) {
  assert.expect(3);

  run(function() {
    Tag.reopen({
      save() {
        assert.ok(true, 'record.save() was called');
        return Ember.RSVP.resolve();
      }
    });

    store.push({
      data: [{
        type: 'tag',
        id: '1',
        attributes: {
          name: 'Ember.js'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'Tomster'
        }
      }, {
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
    var post = store.peekRecord('post', 3);

    post.get('tags').save().then(function() {
      assert.ok(true, 'manyArray.save() promise resolved');
    });
  });
});

test("manyArray trigger arrayContentChange functions with the correct values", function(assert) {
  assert.expect(12);
  var willChangeStartIdx;
  var willChangeRemoveAmt;
  var willChangeAddAmt;
  var originalArrayContentWillChange = DS.ManyArray.prototype.arrayContentWillChange;
  var originalArrayContentDidChange = DS.ManyArray.prototype.arrayContentDidChange;
  DS.ManyArray.reopen({
    arrayContentWillChange(startIdx, removeAmt, addAmt) {
      willChangeStartIdx = startIdx;
      willChangeRemoveAmt = removeAmt;
      willChangeAddAmt = addAmt;
      return this._super.apply(this, arguments);
    },
    arrayContentDidChange(startIdx, removeAmt, addAmt) {
      assert.equal(startIdx, willChangeStartIdx, 'WillChange and DidChange startIdx should match');
      assert.equal(removeAmt, willChangeRemoveAmt, 'WillChange and DidChange removeAmt should match');
      assert.equal(addAmt, willChangeAddAmt, 'WillChange and DidChange addAmt should match');
      return this._super.apply(this, arguments);
    }
  });
  run(function() {
    store.push({
      data: [{
        type: 'tag',
        id: '1',
        attributes: {
          name: 'Ember.js'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'Tomster'
        }
      }, {
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
      }]
    });
    var post = store.peekRecord('post', 3);

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

    post = store.peekRecord('post', 3);
  });
  DS.ManyArray.reopen({
    arrayContentWillChange: originalArrayContentWillChange,
    arrayContentDidChange: originalArrayContentDidChange
  });
});
