var env, store;
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var run = Ember.run;

var Post, Tag;

module("unit/many_array - DS.ManyArray", {
  setup: function() {
    Post = DS.Model.extend({
      title: attr('string'),
      tags: hasMany('tag', { async: false })
    });
    Post.toString = function() {
      return 'Post';
    };

    Tag = DS.Model.extend({
      name: attr('string'),
      post: belongsTo('post', { async: false })
    });
    Tag.toString = function() {
      return 'Tag';
    };

    env = setupStore({
      post: Post,
      tag: Tag
    });
    store = env.store;
  },

  teardown: function() {
    run(function() {
      store.destroy();
    });
  }
});

test("manyArray.save() calls save() on all records", function() {
  expect(3);

  run(function() {
    Tag.reopen({
      save: function() {
        ok(true, 'record.save() was called');
        return Ember.RSVP.resolve();
      }
    });

    store.push({
      data: {
        type: 'tag',
        id: 1,
        attributes: {
          name: 'Ember.js'
        }
      }
    });
    store.push({
      data: {
        type: 'tag',
        id: 2,
        attributes: {
          name: 'Tomster'
        }
      }
    });

    var post = store.push({
      data: {
        type: 'post',
        id: 3,
        attributes: {
          title: 'A framework for creating ambitious web applications'
        },
        relationships: {
          tags: {
            data: [{ type: 'tag', id: 1 }, { type: 'tag', id: 2 }]
          }
        }
      }
    });
    post.get('tags').save().then(function() {
      ok(true, 'manyArray.save() promise resolved');
    });
  });
});

test("manyArray.addRecord() has been deprecated", function() {
  expect(3);

  run(function() {
    var tag = store.push({
      data: {
        type: 'tag',
        id: 1,
        attributes: {
          name: 'Ember.js'
        }
      }
    });
    var post = store.push({
      data: {
        type: 'post',
        id: 2,
        attributes: {
          title: 'A framework for creating ambitious web applications'
        }
      }
    });
    var tags = post.get('tags');

    equal(tags.length, 0, 'there should not be any tags');
    expectDeprecation(function() {
      tags.addRecord(tag);
    });
    equal(tags.length, 1, 'there should be 1 tag');
  });
});

test("manyArray.removeRecord() has been deprecated", function() {
  expect(3);
  run(function() {
    var tag = store.push({
      data: {
        type: 'tag',
        id: 1,
        attributes: {
          name: 'Ember.js'
        }
      }
    });
    var post = store.push({
      data: {
        type: 'post',
        id: 2,
        attributes: {
          title: 'A framework for creating ambitious web applications'
        },
        relationships: {
          tags: {
            data: [{ type: 'tag', id: 1 }]
          }
        }
      }
    });
    var tags = post.get('tags');

    equal(tags.length, 1, 'there should be 1 tag');
    expectDeprecation(function() {
      tags.removeRecord(tag);
    });
    equal(tags.length, 0, 'there should not be any tags');
  });
});


test("manyArray trigger arrayContentChange functions with the correct values", function() {
  expect(12);
  var willChangeStartIdx;
  var willChangeRemoveAmt;
  var willChangeAddAmt;
  var originalArrayContentWillChange = DS.ManyArray.prototype.arrayContentWillChange;
  var originalArrayContentDidChange = DS.ManyArray.prototype.arrayContentDidChange;
  DS.ManyArray.reopen({
    arrayContentWillChange: function(startIdx, removeAmt, addAmt) {
      willChangeStartIdx = startIdx;
      willChangeRemoveAmt = removeAmt;
      willChangeAddAmt = addAmt;
      return this._super.apply(arguments);
    },
    arrayContentDidChange: function(startIdx, removeAmt, addAmt) {
      equal(startIdx, willChangeStartIdx, 'WillChange and DidChange startIdx should match');
      equal(removeAmt, willChangeRemoveAmt, 'WillChange and DidChange removeAmt should match');
      equal(addAmt, willChangeAddAmt, 'WillChange and DidChange addAmt should match');
      return this._super.apply(arguments);
    }
  });
  run(function() {
    store.push({
      data: {
        type: 'tag',
        id: 1,
        attributes: {
          name: 'Ember.js'
        }
      }
    });
    store.push({
      data: {
        type: 'tag',
        id: 2,
        attributes: {
          name: 'Ember Data'
        }
      }
    });
    var post = store.push({
      type: 'post',
      id: 2,
      attributes: {
        title: 'A framework for creating ambitious web applications'
      },
      relationships: {
        tags: {
          data: [{ type: 'tag', id: 1 }]
        }
      }
    });
    post = store.push({
      type: 'post',
      id: 2,
      attributes: {
        title: 'A framework for creating ambitious web applications'
      },
      relationships: {
        tags: {
          data: [{ type: 'tag', id: 1 }, { type: 'tag', id: 2 }]
        }
      }
    });
  });
  DS.ManyArray.reopen({
    arrayContentWillChange: originalArrayContentWillChange,
    arrayContentDidChange: originalArrayContentDidChange
  });
});
