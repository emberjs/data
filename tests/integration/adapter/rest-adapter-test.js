import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import Pretender from "pretender";

import DS from 'ember-data';
import { isEnabled } from 'ember-data/-private';

let env, store, adapter, Post, Comment, SuperUser;
let passedUrl, passedVerb, passedHash;
const { run, get } = Ember;
let originalAjax = Ember.$.ajax;
let server;

module("integration/adapter/rest_adapter - REST Adapter", {
  beforeEach() {
    Post = DS.Model.extend({
      name: DS.attr("string")
    });

    Comment = DS.Model.extend({
      name: DS.attr("string")
    });

    SuperUser = DS.Model.extend();

    env = setupStore({
      post: Post,
      comment: Comment,
      superUser: SuperUser,
      adapter: DS.RESTAdapter
    });

    store = env.store;
    adapter = env.adapter;

    passedUrl = passedVerb = passedHash = null;
  },
  afterEach() {
    Ember.$.ajax = originalAjax;

    if (server) {
      server.shutdown();
      server = null;
    }
  }
});

function ajaxResponse(value) {
  if (isEnabled('ds-improved-ajax')) {
    adapter._makeRequest = function(request) {
      passedUrl = request.url;
      passedVerb = request.method;
      passedHash = request.data ? { data: request.data } : undefined;

      return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
    };
  } else {
    adapter.ajax = function(url, verb, hash) {
      passedUrl = url;
      passedVerb = verb;
      passedHash = hash;

      return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
    };
  }
}

test("findRecord - basic payload", function(assert) {
  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }] });

  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "GET");
    assert.deepEqual(passedHash.data, {});

    assert.equal(post.get('id'), "1");
    assert.equal(post.get('name'), "Rails is omakase");
  });
});


test("findRecord - passes buildURL a requestType", function(assert) {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/" + requestType + "/post/" + id;
  };

  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }] });


  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "/findRecord/post/1");
  });
});

test("findRecord - basic payload (with legacy singular name)", function(assert) {
  ajaxResponse({ post: { id: 1, name: "Rails is omakase" } });

  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "GET");
    assert.deepEqual(passedHash.data, {});

    assert.equal(post.get('id'), "1");
    assert.equal(post.get('name'), "Rails is omakase");
  });
});

test("findRecord - payload with sideloaded records of the same type", function(assert) {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "GET");
    assert.deepEqual(passedHash.data, {});

    assert.equal(post.get('id'), "1");
    assert.equal(post.get('name'), "Rails is omakase");

    let post2 = store.peekRecord('post', 2);
    assert.equal(post2.get('id'), "2");
    assert.equal(post2.get('name'), "The Parley Letter");
  });
});

test("findRecord - payload with sideloaded records of a different type", function(assert) {
  ajaxResponse({
    posts: [{ id: 1, name: "Rails is omakase" }],
    comments: [{ id: 1, name: "FIRST" }]
  });

  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "GET");
    assert.deepEqual(passedHash.data, {});

    assert.equal(post.get('id'), "1");
    assert.equal(post.get('name'), "Rails is omakase");

    let comment = store.peekRecord('comment', 1);
    assert.equal(comment.get('id'), "1");
    assert.equal(comment.get('name'), "FIRST");
  });
});


test("findRecord - payload with an serializer-specified primary key", function(assert) {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_'
  }));

  ajaxResponse({ posts: [{ "_ID_": 1, name: "Rails is omakase" }] });

  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "GET");
    assert.deepEqual(passedHash.data, {});

    assert.equal(post.get('id'), "1");
    assert.equal(post.get('name'), "Rails is omakase");
  });
});

test("findRecord - payload with a serializer-specified attribute mapping", function(assert) {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      'name': '_NAME_',
      'createdAt': { key: '_CREATED_AT_', someOtherOption: 'option' }
    }
  }));

  Post.reopen({
    createdAt: DS.attr("number")
  });

  ajaxResponse({ posts: [{ id: 1, _NAME_: "Rails is omakase", _CREATED_AT_: 2013 }] });

  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "GET");
    assert.deepEqual(passedHash.data, {});

    assert.equal(post.get('id'), "1");
    assert.equal(post.get('name'), "Rails is omakase");
    assert.equal(post.get('createdAt'), 2013);
  });
});

test("findRecord - passes `include` as a query parameter to ajax", function(assert) {
  ajaxResponse({
    post: { id: 1, name: 'Rails is very expensive sushi' }
  });

  return run(store, 'findRecord', 'post', 1, { include: 'comments' }).then(() => {
    assert.deepEqual(passedHash.data, { include: 'comments' }, '`include` parameter sent to adapter.ajax');
  });
});

test("createRecord - an empty payload is a basic success if an id was specified", function(assert) {
  ajaxResponse();

  return run(() => {
    let post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });
    return post.save().then(post => {
      assert.equal(passedUrl, "/posts");
      assert.equal(passedVerb, "POST");
      assert.deepEqual(passedHash.data, { post: { id: "some-uuid", name: "The Parley Letter" } });

      assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      assert.equal(post.get('name'), "The Parley Letter", "the post was updated");
    });
  });
});

test("createRecord - passes buildURL the requestType", function(assert) {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/post/" + requestType;
  };

  ajaxResponse();

  return run(() => {
    let post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });
    return post.save().then(post => {
      assert.equal(passedUrl, "/post/createRecord");
    });
  });
});

test("createRecord - a payload with a new ID and data applies the updates", function(assert) {
  ajaxResponse({ posts: [{ id: "1", name: "Dat Parley Letter" }] });

  return run(() => {
    let post = store.createRecord('post', { name: "The Parley Letter" });

    return post.save().then(post => {
      assert.equal(passedUrl, "/posts");
      assert.equal(passedVerb, "POST");
      assert.deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

      assert.equal(post.get('id'), "1", "the post has the updated ID");
      assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      assert.equal(post.get('name'), "Dat Parley Letter", "the post was updated");
    });
  });
});

test("createRecord - a payload with a new ID and data applies the updates (with legacy singular name)", function(assert) {
  let post;
  ajaxResponse({ post: { id: "1", name: "Dat Parley Letter" } });
  run(function() {
    post = store.createRecord('post', { name: "The Parley Letter" });
  });

  return run(post, 'save').then(post => {
    assert.equal(passedUrl, "/posts");
    assert.equal(passedVerb, "POST");
    assert.deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    assert.equal(post.get('id'), "1", "the post has the updated ID");
    assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    assert.equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  });
});

test("createRecord - findMany doesn't overwrite owner", function(assert) {
  ajaxResponse({ comment: { id: "1", name: "Dat Parley Letter", post: 1 } });

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            data: []
          }
        }
      }
    });
  });
  let post = store.peekRecord('post', 1);

  let comment = run(() => store.createRecord('comment', { name: "The Parley Letter" }));

  run(() => {
    post.get('comments').pushObject(comment);

    assert.equal(comment.get('post'), post, "the post has been set correctly");
  });

  return run(() => {
    return comment.save().then(comment => {
      assert.equal(comment.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      assert.equal(comment.get('name'), "Dat Parley Letter", "the post was updated");
      assert.equal(comment.get('post'), post, "the post is still set");
    });
  });
});

test("createRecord - a serializer's primary key and attributes are consulted when building the payload", function(assert) {
  let post;
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  ajaxResponse();

  run(() => {
    post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });
  });

  return run(post, 'save').then(post => {
    assert.deepEqual(passedHash.data, { post: { _id_: 'some-uuid', '_name_': "The Parley Letter" } });
  });
});

test("createRecord - a serializer's attributes are consulted when building the payload if no id is pre-defined", function(assert) {
  let post;
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      name: '_name_'
    }
  }));

  ajaxResponse({
    post: { '_name_': "The Parley Letter", id: '1' }
  });

  return run(() => {
    post = store.createRecord('post', { name: "The Parley Letter" });

    return post.save().then(post => {
      assert.deepEqual(passedHash.data, { post: { '_name_': "The Parley Letter" } });
    });
  });
});

test("createRecord - a serializer's attribute mapping takes precedence over keyForAttribute when building the payload", function(assert) {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      name: 'given_name'
    },

    keyForAttribute(attr) {
      return attr.toUpperCase();
    }
  }));

  ajaxResponse();

  return run(() => {
    let post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });

    return post.save().then(post => {
      assert.deepEqual(passedHash.data, { post: { 'given_name': "The Parley Letter", id: "some-uuid" } });
    });
  });
});

test("createRecord - a serializer's attribute mapping takes precedence over keyForRelationship (belongsTo) when building the payload", function(assert) {
  env.registry.register('serializer:comment', DS.RESTSerializer.extend({
    attrs: {
      post: 'article'
    },

    keyForRelationship(attr, kind) {
      return attr.toUpperCase();
    }
  }));

  ajaxResponse();

  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  return run(() => {
    let post = store.createRecord('post', { id: "a-post-id", name: "The Parley Letter" });
    let comment = store.createRecord('comment', { id: "some-uuid", name: "Letters are fun", post: post });

    return comment.save().then(post => {
      assert.deepEqual(passedHash.data, { comment: { article: "a-post-id", id: "some-uuid", name: "Letters are fun" } });
    });
  });
});

test("createRecord - a serializer's attribute mapping takes precedence over keyForRelationship (hasMany) when building the payload", function(assert) {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      comments: 'opinions'
    },

    keyForRelationship(attr, kind) {
      return attr.toUpperCase();
    }
  }));

  ajaxResponse();

  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });

  return run(() => {
    let comment = store.createRecord('comment', { id: "a-comment-id", name: "First!" });
    let post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter", comments: [comment] });

    return post.save().then(post => {
      assert.deepEqual(passedHash.data, { post: { opinions: ["a-comment-id"], id: "some-uuid", name: "The Parley Letter" } });
    });
  });
});

test("createRecord - a record on the many side of a hasMany relationship should update relationships when data is sideloaded", function(assert) {
  assert.expect(3);

  ajaxResponse({
    posts: [{
      id: "1",
      name: "Rails is omakase",
      comments: [1,2]
    }],
    comments: [{
      id: "2",
      name: "Another Comment",
      post: 1
    },
    {
      id: "1",
      name: "Dat Parley Letter",
      post: 1
    }]
    // My API is returning a comment:{} as well as a comments:[{...},...]
    //, comment: {
    //   id: "2",
    //   name: "Another Comment",
    //   post: 1
    // }
  });

  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });
    store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          name: "Dat Parlay Letter"
        },
        relationships: {
          post: {
            data: { type: 'post', id: '1' }
          }
        }
      }
    });
  });

  let post = store.peekRecord('post', 1);
  let commentCount = run(() => post.get('comments.length'));

  assert.equal(commentCount, 1, "the post starts life with a comment");

  return run(() => {
    let comment = store.createRecord('comment', { name: "Another Comment", post: post });

    return comment.save().then(comment => {
      assert.equal(comment.get('post'), post, "the comment is related to the post");
      return post.reload().then(post => {
        assert.equal(post.get('comments.length'), 2, "Post comment count has been updated");
      });
    });
  });
});

test("createRecord - sideloaded belongsTo relationships are both marked as loaded", function(assert) {
  assert.expect(4);
  let post;

  Post.reopen({ comment: DS.belongsTo('comment', { async: false }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  run(() => {
    post = store.createRecord('post', { name: "man" });
  });

  ajaxResponse({
    posts: [{ id: 1, comment: 1, name: "marked" }],
    comments: [{ id: 1, post: 1, name: "Comcast is a bargain" }]
  });

  return run(() => {
    return post.save().then(record => {
      assert.equal(store.peekRecord('post', 1).get('comment.isLoaded'), true, "post's comment isLoaded (via store)");
      assert.equal(store.peekRecord('comment', 1).get('post.isLoaded'), true, "comment's post isLoaded (via store)");
      assert.equal(record.get('comment.isLoaded'), true, "post's comment isLoaded (via record)");
      assert.equal(record.get('comment.post.isLoaded'), true, "post's comment's post isLoaded (via record)");
    });
  });
});

test("createRecord - response can contain relationships the client doesn't yet know about", function(assert) {
  assert.expect(3); // while records.length is 2, we are getting 4 assertions

  ajaxResponse({
    posts: [{
      id: "1",
      name: "Rails is omakase",
      comments: [2]
    }],
    comments: [{
      id: "2",
      name: "Another Comment",
      post: 1
    }]
  });

  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  let post;
  run(() => {
    post = store.createRecord('post', { name: "Rails is omakase" });
  });

  return run(() => {
    return post.save().then(post => {
      assert.equal(post.get('comments.firstObject.post'), post, "the comments are related to the correct post model");
      assert.equal(store._internalModelsFor('post').models.length, 1, "There should only be one post record in the store");

      let postRecords = store._internalModelsFor('post').models;
      for (var i = 0; i < postRecords.length; i++) {
        assert.equal(post, postRecords[i].getRecord(), "The object in the identity map is the same");
      }
    });
  });
});

test("createRecord - relationships are not duplicated", function(assert) {
  let post, comment;

  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  run(() => {
    post = store.createRecord('post', { name: "Tomtomhuda" });
    comment = store.createRecord('comment', { id: 2, name: "Comment title" });
  });

  ajaxResponse({ post: [{ id: 1, name: "Rails is omakase", comments: [] }] });

  return run(post, 'save').then(post => {
    assert.equal(post.get('comments.length'), 0, "post has 0 comments");
    post.get('comments').pushObject(comment);
    assert.equal(post.get('comments.length'), 1, "post has 1 comment");

    ajaxResponse({
      post: [{ id: 1, name: "Rails is omakase", comments: [2] }],
      comments: [{ id: 2, name: "Comment title" }]
    });

    return post.save();
  }).then(post => {
    assert.equal(post.get('comments.length'), 1, "post has 1 comment");
  });
});

test("updateRecord - an empty payload is a basic success", function(assert) {
  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return run(() => {
    let post = store.peekRecord('post', 1);
    ajaxResponse();

    post.set('name', "The Parley Letter");
    return post.save().then(post => {
      assert.equal(passedUrl, "/posts/1");
      assert.equal(passedVerb, "PUT");
      assert.deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

      assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      assert.equal(post.get('name'), "The Parley Letter", "the post was updated");
    });
  });
});

test("updateRecord - passes the requestType to buildURL", function(assert) {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/posts/" + id + "/" + requestType;
  };
  adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return run(() => {
    return store.findRecord('post', 1).then(post => {
      ajaxResponse();

      post.set('name', "The Parley Letter");
      return post.save();
    }).then(post => {
      assert.equal(passedUrl, "/posts/1/updateRecord");
    });
  });
});

test("updateRecord - a payload with updates applies the updates", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({ posts: [{ id: 1, name: "Dat Parley Letter" }] });

    post.set('name', "The Parley Letter");
    return post.save();
  }).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "PUT");
    assert.deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    assert.equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  });
});

test("updateRecord - a payload with updates applies the updates (with legacy singular name)", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post =>{
    ajaxResponse({ post: { id: 1, name: "Dat Parley Letter" } });

    post.set('name', "The Parley Letter");
    return post.save();
  }).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "PUT");
    assert.deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    assert.equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  });
});

test("updateRecord - a payload with sideloaded updates pushes the updates", function(assert) {
  let post;
  ajaxResponse({
    posts: [{ id: 1, name: "Dat Parley Letter" }],
    comments: [{ id: 1, name: "FIRST" }]
  });

  return run(() => {
    post = store.createRecord('post', { name: "The Parley Letter" });
    return post.save().then(post => {
      assert.equal(passedUrl, "/posts");
      assert.equal(passedVerb, "POST");
      assert.deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

      assert.equal(post.get('id'), "1", "the post has the updated ID");
      assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      assert.equal(post.get('name'), "Dat Parley Letter", "the post was updated");

      let comment = store.peekRecord('comment', 1);
      assert.equal(comment.get('name'), "FIRST", "The comment was sideloaded");
    });
  });
});

test("updateRecord - a payload with sideloaded updates pushes the updates", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({
      posts: [{ id: 1, name: "Dat Parley Letter" }],
      comments: [{ id: 1, name: "FIRST" }]
    });

    post.set('name', "The Parley Letter");
    return post.save();
  }).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "PUT");
    assert.deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    assert.equal(post.get('name'), "Dat Parley Letter", "the post was updated");

    let comment = store.peekRecord('comment', 1);
    assert.equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  });
});

test("updateRecord - a serializer's primary key and attributes are consulted when building the payload", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        name: "Rails is omakase"
      }
    });
  });

  ajaxResponse();

  return store.findRecord('post', 1).then(post => {
    post.set('name', "The Parley Letter");
    return post.save();
  }).then(post => {
    assert.deepEqual(passedHash.data, { post: { '_name_': "The Parley Letter" } });
  });
});

test("updateRecord - hasMany relationships faithfully reflect simultaneous adds and removes", function(assert) {
  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Not everyone uses Rails"
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' }
            ]
          }
        }
      },
      included: [{
        type: 'comment',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          name: "Yes. Yes it is."
        }
      }]
    });
  });

  ajaxResponse({
    posts: { id: 1, name: "Not everyone uses Rails", comments: [2] }
  });

  return store.findRecord('comment', 2).then(() => {
    return store.findRecord('post', 1);
  }).then(post => {
    let newComment = store.peekRecord('comment', 2);
    let comments = post.get('comments');

    // Replace the comment with a new one
    comments.popObject();
    comments.pushObject(newComment);

    return post.save();
  }).then(post => {
    assert.equal(post.get('comments.length'), 1, "the post has the correct number of comments");
    assert.equal(post.get('comments.firstObject.name'), "Yes. Yes it is.", "the post has the correct comment");
  });
});

test("deleteRecord - an empty payload is a basic success", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse();

    post.deleteRecord();
    return post.save();
  }).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "DELETE");
    assert.equal(passedHash, undefined);

    assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    assert.equal(post.get('isDeleted'), true, "the post is now deleted");
  });
});

test("deleteRecord - passes the requestType to buildURL", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/posts/" + id + "/" + requestType;
  };

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse();

    post.deleteRecord();
    return post.save();
  }).then(post => {
    assert.equal(passedUrl, "/posts/1/deleteRecord");
  });
});

test("deleteRecord - a payload with sideloaded updates pushes the updates", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({ comments: [{ id: 1, name: "FIRST" }] });

    post.deleteRecord();
    return post.save();
  }).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "DELETE");
    assert.equal(passedHash, undefined);

    assert.equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    assert.equal(post.get('isDeleted'), true, "the post is now deleted");

    let comment = store.peekRecord('comment', 1);
    assert.equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  });
});

test("deleteRecord - a payload with sidloaded updates pushes the updates when the original record is omitted", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({ posts: [{ id: 2, name: "The Parley Letter" }] });

    post.deleteRecord();
    return post.save();
  }).then(post => {
    assert.equal(passedUrl, "/posts/1");
    assert.equal(passedVerb, "DELETE");
    assert.equal(passedHash, undefined);

    assert.equal(post.get('hasDirtyAttributes'), false, "the original post isn't dirty anymore");
    assert.equal(post.get('isDeleted'), true, "the original post is now deleted");

    let newPost = store.peekRecord('post', 2);
    assert.equal(newPost.get('name'), "The Parley Letter", "The new post was added to the store");
  });
});

test("deleteRecord - deleting a newly created record should not throw an error", function(assert) {
  let post = run(() => store.createRecord('post'));

  return run(() => {
    post.deleteRecord();
    return post.save().then(post => {
      assert.equal(passedUrl, null, "There is no ajax call to delete a record that has never been saved.");
      assert.equal(passedVerb, null, "There is no ajax call to delete a record that has never been saved.");
      assert.equal(passedHash, null, "There is no ajax call to delete a record that has never been saved.");

      assert.equal(post.get('isDeleted'), true, "the post is now deleted");
      assert.equal(post.get('isError'), false, "the post is not an error");
    });
  });
});

test("findAll - returning an array populates the array", function(assert) {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  return store.findAll('post').then(posts => {
    assert.equal(passedUrl, "/posts");
    assert.equal(passedVerb, "GET");
    assert.deepEqual(passedHash.data, {});

    let post1 = store.peekRecord('post', 1);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );

    assert.deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    assert.equal(posts.get('length'), 2, "The posts are in the array");
    assert.equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    assert.deepEqual(
      posts.toArray(),
      [post1, post2],
      "The correct records are in the array"
    );
  });
});


test("findAll - passes buildURL the requestType and snapshot", function(assert) {
  assert.expect(2);
  let adapterOptionsStub = { stub: true };
  adapter.buildURL = function(type, id, snapshot, requestType) {
    assert.equal(snapshot.adapterOptions, adapterOptionsStub);
    return "/" + requestType + "/posts";
  };

  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  return store.findAll('post', { adapterOptions: adapterOptionsStub }).then(posts => {
    assert.equal(passedUrl, "/findAll/posts");
  });
});

test("findAll - passed `include` as a query parameter to ajax", function(assert) {
  ajaxResponse({
    posts: [{ id: 1, name: 'Rails is very expensive sushi' }]
  });

  return run(store, 'findAll', 'post', { include: 'comments' }).then(() => {
    assert.deepEqual(passedHash.data, { include: 'comments' }, '`include` params sent to adapter.ajax');
  });
});

test("findAll - returning sideloaded data loads the data", function(assert) {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ],
    comments: [{ id: 1, name: "FIRST" }] });

  return store.findAll('post').then(posts => {
    let comment = store.peekRecord('comment', 1);

    assert.deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  });
});

test("findAll - data is normalized through custom serializers", function(assert) {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  ajaxResponse({
    posts: [
      { _ID_: 1, _NAME_: "Rails is omakase" },
      { _ID_: 2, _NAME_: "The Parley Letter" }
    ]
  });

  return store.findAll('post').then(posts => {
    let post1 = store.peekRecord('post', 1);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );
    assert.deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    assert.equal(posts.get('length'), 2, "The posts are in the array");
    assert.equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    assert.deepEqual(
      posts.toArray(),
      [post1, post2],
      "The correct records are in the array"
    );
  });
});

test("query - if `sortQueryParams` option is not provided, query params are sorted alphabetically", function(assert) {
  ajaxResponse({
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  return store.query('post', { "params": 1, "in": 2, "wrong": 3, "order": 4 }).then(() => {
    assert.deepEqual(Object.keys(passedHash.data), ["in", "order", "params", "wrong"], 'query params are received in alphabetical order');
  });
});

test("query - passes buildURL the requestType", function(assert) {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/" + requestType + "/posts";
  };

  ajaxResponse({
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  return store.query('post', { "params": 1, "in": 2, "wrong": 3, "order": 4 }).then(() => {
    assert.equal(passedUrl, '/query/posts');
  });
});

test("query - if `sortQueryParams` is falsey, query params are not sorted at all", function(assert) {
  ajaxResponse({
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  adapter.sortQueryParams = null;

  return store.query('post', { "params": 1, "in": 2, "wrong": 3, "order": 4 }).then(() => {
    assert.deepEqual(Object.keys(passedHash.data), ["params", "in", "wrong", "order"], 'query params are received in their original order');
  });
});

test("query - if `sortQueryParams` is a custom function, query params passed through that function", function(assert) {
  ajaxResponse({
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  adapter.sortQueryParams = function(obj) {
    let sortedKeys = Object.keys(obj).sort().reverse();
    let len = sortedKeys.length;
    let newQueryParams = {};

    for (var i = 0; i < len; i++) {
      newQueryParams[sortedKeys[i]] = obj[sortedKeys[i]];
    }
    return newQueryParams;
  };

  return store.query('post', { "params": 1, "in": 2, "wrong": 3, "order": 4 }).then(() => {
    assert.deepEqual(Object.keys(passedHash.data), ["wrong", "params", "order", "in"], 'query params are received in reverse alphabetical order');
  });
});

test("query - payload 'meta' is accessible on the record array", function(assert) {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  return store.query('post', { page: 2 }).then(posts => {
    assert.equal(
      posts.get('meta.offset'),
      5,
      "Reponse metadata can be accessed with recordArray.meta"
    );
  });
});

test("query - each record array can have it's own meta object", function(assert) {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  return store.query('post', { page: 2 }).then(posts => {
    assert.equal(
      posts.get('meta.offset'),
      5,
      "Reponse metadata can be accessed with recordArray.meta"
    );
    ajaxResponse({
      meta: { offset: 1 },
      posts: [{ id: 1, name: "Rails is very expensive sushi" }]
    });

    return store.query('post', { page: 1 }).then(newPosts => {
      assert.equal(newPosts.get('meta.offset'), 1, 'new array has correct metadata');
      assert.equal(posts.get('meta.offset'), 5, 'metadata on the old array hasnt been clobbered');
    });
  });
});


test("query - returning an array populates the array", function(assert) {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }]
  });

  return store.query('post', { page: 1 }).then(posts => {
    assert.equal(passedUrl, '/posts');
    assert.equal(passedVerb, 'GET');
    assert.deepEqual(passedHash.data, { page: 1 });

    let post1 = store.peekRecord('post', 1);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );
    assert.deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    assert.equal(posts.get('length'), 2, "The posts are in the array");
    assert.equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    assert.deepEqual(
      posts.toArray(),
      [post1, post2],
      "The correct records are in the array"
    );
  });
});

test("query - returning sideloaded data loads the data", function(assert) {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ],
    comments: [{ id: 1, name: "FIRST" }]
  });

  return store.query('post', { page: 1 }).then(posts => {
    let comment = store.peekRecord('comment', 1);

    assert.deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  });
});

test("query - data is normalized through custom serializers", function(assert) {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  ajaxResponse({
    posts: [{ _ID_: 1, _NAME_: "Rails is omakase" },
            { _ID_: 2, _NAME_: "The Parley Letter" }]
  });

  return store.query('post', { page: 1 }).then(posts => {
    let post1 = store.peekRecord('post', 1);
    let post2 = store.peekRecord('post', 2);

    assert.deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );

    assert.deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    assert.equal(posts.get('length'), 2, "The posts are in the array");
    assert.equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    assert.deepEqual(
      posts.toArray(),
      [post1, post2],
      "The correct records are in the array"
    );
  });
});

test("queryRecord - empty response", function(assert) {
  ajaxResponse({});

  return store.queryRecord('post', { slug: 'ember-js-rocks' }).then(post => {
    assert.strictEqual(post, null);
  });
});

test("queryRecord - primary data being null", function(assert) {
  ajaxResponse({
    post: null
  });

  return store.queryRecord('post', { slug: 'ember-js-rocks' }).then(post => {
    assert.strictEqual(post, null);
  });
});

test("queryRecord - primary data being a single object", function(assert) {
  ajaxResponse({
    post: {
      id: '1',
      name: 'Ember.js rocks'
    }
  });

  return store.queryRecord('post', { slug: 'ember-js-rocks' }).then(post => {
    assert.deepEqual(post.get('name'), "Ember.js rocks");
  });
});

test("queryRecord - returning sideloaded data loads the data", function(assert) {
  ajaxResponse({
    post: { id: 1, name: "Rails is omakase" },
    comments: [{ id: 1, name: "FIRST" }]
  });

  return store.queryRecord('post', { slug: 'rails-is-omakaze' }).then(post => {
    let comment = store.peekRecord('comment', 1);

    assert.deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  });
});

testInDebug("queryRecord - returning an array picks the first one but saves all records to the store", function(assert) {
  ajaxResponse({
    post: [{ id: 1, name: "Rails is omakase" }, { id: 2, name: "Ember is js" }]
  });

  assert.expectDeprecation('The adapter returned an array for the primary data of a `queryRecord` response. This is deprecated as `queryRecord` should return a single record.');

  return run(() => {
    return store.queryRecord('post', { slug: 'rails-is-omakaze' }).then(post => {
      let post2 = store.peekRecord('post', 2);

      assert.deepEqual(post.getProperties('id', 'name'), { id: "1", name: "Rails is omakase" });
      assert.deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "Ember is js" });
    });
  });
});

testInDebug("queryRecord - returning an array is deprecated", function(assert) {
  ajaxResponse({
    post: [{ id: 1, name: "Rails is omakase" }, { id: 2, name: "Ember is js" }]
  });

  assert.expectDeprecation('The adapter returned an array for the primary data of a `queryRecord` response. This is deprecated as `queryRecord` should return a single record.');

  return run(() => store.queryRecord('post', { slug: 'rails-is-omakaze' }));
});

testInDebug("queryRecord - returning an single object doesn't throw a deprecation", function(assert) {
  ajaxResponse({
    post: { id: 1, name: "Rails is omakase" }
  });

  assert.expectNoDeprecation();

  return run(() => store.queryRecord('post', { slug: 'rails-is-omakaze' }));
});

test("queryRecord - data is normalized through custom serializers", function(assert) {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  ajaxResponse({
    post: { _ID_: 1, _NAME_: "Rails is omakase" }
  });

  return store.queryRecord('post', { slug: 'rails-is-omakaze' }).then(post => {
    assert.deepEqual(
      post.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded with correct data"
    );
  });
});

test("findMany - findMany uses a correct URL to access the records", function(assert) {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });

  let post = store.peekRecord('post', 1);
  ajaxResponse({
    comments: [
      { id: 1, name: "FIRST" },
      { id: 2, name: "Rails is unagi" },
      { id: 3, name: "What is omakase?" }
    ]
  });

  return run(post, 'get', 'comments').then(comments => {
    assert.equal(passedUrl, "/comments");
    assert.deepEqual(passedHash, { data: { ids: ["1", "2", "3"] } });
  });
});

test("findMany - passes buildURL the requestType", function(assert) {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/" + requestType + "/" + type;
  };

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });

  let post = store.peekRecord('post', 1);
  ajaxResponse({
    comments: [
      { id: 1, name: "FIRST" },
      { id: 2, name: "Rails is unagi" },
      { id: 3, name: "What is omakase?" }
    ]
  });

  return run(post, 'get', 'comments').then(comments => {
    assert.equal(passedUrl, "/findMany/comment");
  });
});

test("findMany - findMany does not coalesce by default", function(assert) {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });

  let post = store.peekRecord('post', 1);
  //It's still ok to return this even without coalescing  because RESTSerializer supports sideloading
  ajaxResponse({
    comments: [
      { id: 1, name: "FIRST" },
      { id: 2, name: "Rails is unagi" },
      { id: 3, name: "What is omakase?" }
    ]
  });

  return run(post, 'get', 'comments').then(comments => {
    assert.equal(passedUrl, "/comments/3");
    assert.deepEqual(passedHash.data, {});
  });
});

test("findMany - returning an array populates the array", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

    return post.get('comments');
  }).then(comments => {
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);

    assert.deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    assert.deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    assert.deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    assert.deepEqual(
      comments.toArray(),
      [comment1, comment2, comment3],
      "The correct records are in the array"
    );
  });
});

test("findMany - returning sideloaded data loads the data", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" },
        { id: 4, name: "Unrelated comment" }
      ],
      posts: [{ id: 2, name: "The Parley Letter" }]
    });

    return post.get('comments');
  }).then(comments => {
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);
    let comment4 = store.peekRecord('comment', 4);
    let post2    = store.peekRecord('post', 2);

    assert.deepEqual(
      comments.toArray(),
      [comment1, comment2, comment3],
      "The correct records are in the array"
    );

    assert.deepEqual(comment4.getProperties('id', 'name'), { id: "4", name: "Unrelated comment" });
    assert.deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "The Parley Letter" });
  });
});

test("findMany - a custom serializer is used if present", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  env.registry.register('serializer:comment', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  adapter.coalesceFindRequests = true;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: "FIRST" },
        { _ID_: 2, _NAME_: "Rails is unagi" },
        { _ID_: 3, _NAME_: "What is omakase?" }]
    });

    return post.get('comments');
  }).then(comments => {
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);

    assert.deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    assert.deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    assert.deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    assert.deepEqual(comments.toArray(), [comment1, comment2, comment3], "The correct records are in the array");
  });
});

test("findHasMany - returning an array populates the array", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments'
            }
          }
        }
      }
    });
  });

  return run(store, 'findRecord', 'post', '1').then(post => {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

    return post.get('comments');
  }).then(comments => {
    assert.equal(passedUrl, '/posts/1/comments');
    assert.equal(passedVerb, 'GET');
    assert.equal(passedHash, undefined);

    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);

    assert.deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    assert.deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    assert.deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    assert.deepEqual(comments.toArray(), [comment1, comment2, comment3], "The correct records are in the array");
  });
});

test("findHasMany - passes buildURL the requestType", function(assert) {
  assert.expect(2);
  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.buildURL = function(type, id, snapshot, requestType) {
    assert.ok(snapshot instanceof DS.Snapshot);
    assert.equal(requestType, 'findHasMany');
  };

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments'
            }
          }
        }
      }
    });
  });

  return run(store, 'findRecord', 'post', '1').then(post => {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

    return post.get('comments');
  });
});

test("findMany - returning sideloaded data loads the data (with JSONApi Links)", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments'
            }
          }
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ],
      posts: [{ id: 2, name: "The Parley Letter" }]
    });

    return post.get('comments');
  }).then(comments => {
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);
    let post2    = store.peekRecord('post', 2);

    assert.deepEqual(comments.toArray(), [comment1, comment2, comment3], "The correct records are in the array");

    assert.deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "The Parley Letter" });
  });
});

test("findMany - a custom serializer is used if present", function(assert) {
  adapter.shouldBackgroundReloadRecord = () => false;
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  env.registry.register('serializer:comment', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          name: "Rails is omakase"
        },
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments'
            }
          }
        }
      }
    });
  });

  return store.findRecord('post', 1).then(post => {
    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: "FIRST" },
        { _ID_: 2, _NAME_: "Rails is unagi" },
        { _ID_: 3, _NAME_: "What is omakase?" }
      ]
    });
    return post.get('comments');
  }).then(comments => {
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let comment3 = store.peekRecord('comment', 3);

    assert.deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    assert.deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    assert.deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    assert.deepEqual(comments.toArray(), [comment1, comment2, comment3], "The correct records are in the array");
  });
});

test('findBelongsTo - passes buildURL the requestType', function(assert) {
  assert.expect(2);
  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.buildURL = function(type, id, snapshot, requestType) {
    assert.ok(snapshot instanceof DS.Snapshot);
    assert.equal(requestType, 'findBelongsTo');
  };

  Comment.reopen({ post: DS.belongsTo('post', { async: true }) });

  run(() => {
    store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          name: "FIRST"
        },
        relationships: {
          post: {
            links: {
              related: '/posts/1'
            }
          }
        }
      }
    });
  });

  return run(store, 'findRecord', 'comment', 1).then(comment => {
    ajaxResponse({ post: { id: 1, name: 'Rails is omakase' } });
    return comment.get('post');
  });
});

testInDebug('coalesceFindRequests assert.warns if the expected records are not returned in the coalesced request', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  adapter.coalesceFindRequests = true;

  ajaxResponse({ comments: [{ id: 1 }] });

  let wait;
  assert.expectWarning(() => {
    run(() => {
      store.push({
        data: {
          type: 'post',
          id: '2',
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
                { type: 'comment', id: '3' }
              ]
            }
          }
        }
      });

      let post = store.peekRecord('post', 2);
      wait = post.get('comments').catch(e => {
        assert.equal(e.message, `Expected: '<comment:2>' to be present in the adapter provided payload, but it was not found.`)
      })
    });

    return wait;
  }, /expected to find records with the following ids in the adapter response but they were missing: \[2,3\]/);
});

test('groupRecordsForFindMany groups records based on their url', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  adapter.buildURL = function(type, id, snapshot) {
    if (id === '1') {
      return '/comments/1';
    } else {
      return '/other_comments/' + id;
    }
  };

  adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(id, '1');
    return Ember.RSVP.resolve({ comments: { id: 1 } });
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    assert.deepEqual(ids, ['2', '3']);
    return Ember.RSVP.resolve({ comments: [{ id: 2 }, { id: 3 }] });
  };

  let post;
  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '2',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
    post = store.peekRecord('post', 2);
  });

  run(() => post.get('comments'));
});

test('groupRecordsForFindMany groups records correctly when singular URLs are encoded as query params', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  adapter.buildURL = function(type, id, snapshot) {
    if (id === '1') {
      return '/comments?id=1';
    } else {
      return '/other_comments?id=' + id;
    }
  };

  adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(id, '1');
    return Ember.RSVP.resolve({ comments: { id: 1 } });
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    assert.deepEqual(ids, ['2', '3']);
    return Ember.RSVP.resolve({ comments: [{ id: 2 }, { id: 3 }] });
  };
  let post;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '2',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
    post = store.peekRecord('post', 2);
  });

  run(() => post.get('comments'));
});

test('normalizeKey - to set up _ids and _id', function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    keyForAttribute(attr) {
      return Ember.String.underscore(attr);
    },

    keyForBelongsTo(belongsTo) {
    },

    keyForRelationship(rel, kind) {
      if (kind === 'belongsTo') {
        let underscored = Ember.String.underscore(rel);
        return underscored + '_id';
      } else {
        let singular = Ember.String.singularize(rel);
        return Ember.String.underscore(singular) + '_ids';
      }
    }
  }));

  env.registry.register('model:post', DS.Model.extend({
    name: DS.attr(),
    authorName: DS.attr(),
    author: DS.belongsTo('user', { async: false }),
    comments: DS.hasMany('comment', { async: false })
  }));

  env.registry.register('model:user', DS.Model.extend({
    createdAt: DS.attr(),
    name: DS.attr()
  }));

  env.registry.register('model:comment', DS.Model.extend({
    body: DS.attr()
  }));

  ajaxResponse({
    posts: [{
      id: "1",
      name: "Rails is omakase",
      author_name: "@d2h",
      author_id: "1",
      comment_ids: ["1", "2"]
    }],

    users: [{
      id: "1",
      name: "D2H"
    }],

    comments: [{
      id: "1",
      body: "Rails is unagi"
    }, {
      id: "2",
      body: "What is omakase?"
    }]
  });

  return run(() => {
    return store.findRecord('post', 1).then(post => {
      assert.equal(post.get('authorName'), "@d2h");
      assert.equal(post.get('author.name'), "D2H");
      assert.deepEqual(post.get('comments').mapBy('body'), ["Rails is unagi", "What is omakase?"]);
    });
  });
});

test('groupRecordsForFindMany splits up calls for large ids', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  assert.expect(2);

  function repeatChar(character, n) {
    return new Array(n+1).join(character);
  }

  let a2000 = repeatChar('a', 2000);
  let b2000 = repeatChar('b', 2000);
  let post;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: a2000 },
              { type: 'comment', id: b2000 }
            ]
          }
        }
      }
    });
    post = store.peekRecord('post', 1);
  });

  adapter.coalesceFindRequests = true;

  adapter.findRecord = function(store, type, id, snapshot) {
    if (id === a2000 || id === b2000) {
      assert.ok(true, "Found " + id);
    }

    return Ember.RSVP.resolve({ comments: { id: id } });
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    assert.ok(false, "findMany should not be called - we expect 2 calls to find for a2000 and b2000");
    return Ember.RSVP.reject();
  };

  run(() => post.get('comments'));
});

test('groupRecordsForFindMany groups calls for small ids', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  assert.expect(1);

  function repeatChar(character, n) {
    return new Array(n+1).join(character);
  }

  let a100 = repeatChar('a', 100);
  let b100 = repeatChar('b', 100);
  let post;

  run(() => {
    store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: a100 },
              { type: 'comment', id: b100 }
            ]
          }
        }
      }
    });
    post = store.peekRecord('post', 1);
  });

  adapter.coalesceFindRequests = true;

  adapter.findRecord = function(store, type, id, snapshot) {
    assert.ok(false, "findRecord should not be called - we expect 1 call to findMany for a100 and b100");
    return Ember.RSVP.reject();
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    assert.deepEqual(ids, [a100, b100]);
    return Ember.RSVP.resolve({ comments: [{ id: a100 }, { id: b100 }] });
  };

  run(() => post.get('comments'));
});


test("calls adapter.handleResponse with the jqXHR and json", function(assert) {
  assert.expect(2);
  let jqXHR = {
    status: 200,
    getAllResponseHeaders() { return ''; }
  };
  let data = {
    post: {
      id: "1",
      name: "Docker is amazing"
    }
  };

  Ember.$.ajax = function(hash) {
    hash.success(data, 'ok', jqXHR);
  };

  adapter.handleResponse = function(status, headers, json) {
    assert.deepEqual(status, 200);
    assert.deepEqual(json, data);
    return json;
  };

  run(() => store.findRecord('post', '1'));
});

test('calls handleResponse with jqXHR, jqXHR.responseText, and requestData', function(assert) {
  assert.expect(4);
  let jqXHR = {
    status: 400,
    responseText: 'Nope lol',
    getAllResponseHeaders() { return ''; }
  };

  let expectedRequestData = {
    method: "GET",
    url:    "/posts/1"
  };

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, jqXHR.responseText, 'Bad Request');
  };

  adapter.handleResponse = function(status, headers, json, requestData) {
    assert.deepEqual(status, 400);
    assert.deepEqual(json, jqXHR.responseText);
    assert.deepEqual(requestData, expectedRequestData);
    return new DS.AdapterError('nope!');
  };

  return run(() => {
    return store.findRecord('post', '1').catch(err => assert.ok(err, 'promise rejected'));
  });
});

test("rejects promise if DS.AdapterError is returned from adapter.handleResponse", function(assert) {
  assert.expect(3);
  let jqXHR = {
    getAllResponseHeaders() { return ''; }
  };
  let data = {
    something: 'is invalid'
  };

  Ember.$.ajax = function(hash) {
    hash.success(data, 'ok', jqXHR);
  };

  adapter.handleResponse = function(status, headers, json) {
    assert.ok(true, 'handleResponse should be called');
    return new DS.AdapterError(json);
  };

  return Ember.run(() => {
    return store.findRecord('post', '1').catch(reason => {
      assert.ok(true, 'promise should be rejected');
      assert.ok(reason instanceof DS.AdapterError, 'reason should be an instance of DS.AdapterError');
    });
  });
});

test("gracefully handles exceptions in handleResponse", function(assert) {
  assert.expect(1);
  let jqXHR = {
    status: 200,
    getAllResponseHeaders() { return ''; }
  };

  Ember.$.ajax = function(hash) {
    setTimeout(function() { hash.success({}, 'ok', jqXHR); }, 1)
  };

  adapter.handleResponse = function(status, headers, json) {
    throw new Error('Unexpected error');
  };

  return run(() => {
    return store.findRecord('post', '1').catch(error => {
      assert.ok(true, 'Unexpected error is captured by the promise chain');
    });
  });
});

test("gracefully handles exceptions in handleResponse where the ajax request errors", function(assert) {
  assert.expect(1);
  let jqXHR = {
    status: 500,
    getAllResponseHeaders() { return ''; }
  };

  Ember.$.ajax = function(hash) {
    setTimeout(() => hash.error({}, 'Internal Server Error', jqXHR) , 1);
  };

  adapter.handleResponse = function(status, headers, json) {
    throw new Error('Unexpected error');
  };

  return run(() => {
    return store.findRecord('post', '1').catch(error => {
      assert.ok(true, 'Unexpected error is captured by the promise chain');
    });
  });
});

test('treats status code 0 as an abort', function(assert) {
  assert.expect(1);

  let jqXHR = {
    status: 0,
    getAllResponseHeaders() { return ''; }
  };

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, 'error');
  };

  adapter.handleResponse = function(status, headers, payload) {
    assert.ok(false);
  };

  return run(() => {
    return store.findRecord('post', '1').catch(err => {
      assert.ok(err instanceof DS.AbortError, 'reason should be an instance of DS.AbortError');
    });
  });
});

test('on error appends errorThrown for sanity', function(assert) {
  assert.expect(2);

  let jqXHR = {
    responseText: 'Nope lol',
    getAllResponseHeaders() { return ''; }
  };

  let errorThrown = new Error('nope!');

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, jqXHR.responseText, errorThrown);
  };

  adapter.handleResponse = function(status, headers, payload) {
    assert.ok(false);
  };

  return run(() => {
    return store.findRecord('post', '1').catch(err => {
      assert.equal(err, errorThrown);
      assert.ok(err, 'promise rejected');
    });
  });
});

if (isEnabled('ds-extended-errors')) {
  test("rejects promise with a specialized subclass of DS.AdapterError if ajax responds with http error codes", function(assert) {
    assert.expect(10);

    let jqXHR = {
      getAllResponseHeaders() { return ''; }
    };

    Ember.$.ajax = function(hash) {
      jqXHR.status = 401;
      hash.error(jqXHR, 'error');
    };

    Ember.run(() => {
      store.find('post', '1').catch(reason => {
        assert.ok(true, 'promise should be rejected');
        assert.ok(reason instanceof DS.UnauthorizedError, 'reason should be an instance of DS.UnauthorizedError');
      });
    });

    Ember.$.ajax = function(hash) {
      jqXHR.status = 403;
      hash.error(jqXHR, 'error');
    };

    Ember.run(() => {
      store.find('post', '1').catch(reason => {
        assert.ok(true, 'promise should be rejected');
        assert.ok(reason instanceof DS.ForbiddenError, 'reason should be an instance of DS.ForbiddenError');
      });
    });

    Ember.$.ajax = function(hash) {
      jqXHR.status = 404;
      hash.error(jqXHR, 'error');
    };

    Ember.run(() => {
      store.find('post', '1').catch(reason => {
        assert.ok(true, 'promise should be rejected');
        assert.ok(reason instanceof DS.NotFoundError, 'reason should be an instance of DS.NotFoundError');
      });
    });

    Ember.$.ajax = function(hash) {
      jqXHR.status = 409;
      hash.error(jqXHR, 'error');
    };

    Ember.run(() => {
      store.find('post', '1').catch(reason => {
        assert.ok(true, 'promise should be rejected');
        assert.ok(reason instanceof DS.ConflictError, 'reason should be an instance of DS.ConflictError');
      });
    });

    Ember.$.ajax = function(hash) {
      jqXHR.status = 500;
      hash.error(jqXHR, 'error');
    };

    Ember.run(() => {
      store.find('post', '1').catch(reason => {
        assert.ok(true, 'promise should be rejected');
        assert.ok(reason instanceof DS.ServerError, 'reason should be an instance of DS.ServerError');
      });
    });
  });
}

test('on error wraps the error string in an DS.AdapterError object', function(assert) {
  assert.expect(2);

  let jqXHR = {
    responseText: '',
    getAllResponseHeaders() { return ''; }
  };

  let errorThrown = 'nope!';

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, 'error', errorThrown);
  };

  run(() => {
    store.findRecord('post', '1').catch(err => {
      assert.equal(err.errors[0].detail, errorThrown);
      assert.ok(err, 'promise rejected');
    });
  });
});

test('error handling includes a detailed message from the server', (assert) => {
  assert.expect(2);
  let jqXHR = {
    status: 500,
    responseText: 'An error message, perhaps generated from a backend server!',
    getAllResponseHeaders() { return 'Content-Type: text/plain'; }
  };

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, 'error');
  };

  run(() => {
    store.findRecord('post', '1').catch(err => {
      assert.equal(err.message, "Ember Data Request GET /posts/1 returned a 500\nPayload (text/plain)\nAn error message, perhaps generated from a backend server!");
      assert.ok(err, 'promise rejected');
    });
  });

});

test('error handling with a very long HTML-formatted payload truncates the friendly message', (assert) => {
  assert.expect(2);

  let jqXHR = {
    status: 500,
    responseText: new Array(100).join("<blink />"),
    getAllResponseHeaders() { return 'Content-Type: text/html'; }
  };

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, 'error');
  };

  run(() => {
    store.findRecord('post', '1').catch(err => {
      assert.equal(err.message, "Ember Data Request GET /posts/1 returned a 500\nPayload (text/html)\n[Omitted Lengthy HTML]");
      assert.ok(err, 'promise rejected');
    });
  });
});

test('findAll resolves with a collection of DS.Models, not DS.InternalModels', (assert) => {
  assert.expect(4);

  ajaxResponse({
    posts: [
      {
        id: 1,
        name: 'dhh lol'
      },
      {
        id: 2,
        name: 'james mickens is rad'
      },
      {
        id: 3,
        name: 'in the name of love'
      }
    ]
  });

  return run(() => {
    return store.findAll('post').then(posts => {
      assert.equal(get(posts, 'length'), 3);
      posts.forEach((post) => assert.ok(post instanceof DS.Model));
    });
  });
});

test("createRecord - sideloaded records are pushed to the store", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment')
  });

  ajaxResponse({
    post: {
      id: 1,
      name: 'The Parley Letter',
      comments: [2, 3]
    },
    comments: [{
      id: 2,
      name: 'First comment'
    }, {
      id: 3,
      name: 'Second comment'
    }]
  });
  let post;

  return run(() => {
    post = store.createRecord('post', { name: 'The Parley Letter' });

    return post.save().then(post => {
      let comments = store.peekAll('comment');

      assert.equal(get(comments, 'length'), 2, 'comments.length is correct');
      assert.equal(get(comments, 'firstObject.name'), 'First comment', 'comments.firstObject.name is correct');
      assert.equal(get(comments, 'lastObject.name'), 'Second comment', 'comments.lastObject.name is correct');
    });
  });
});

testInDebug("warns when an empty response is returned, though a valid stringified JSON is expected", function(assert) {
  let server = new Pretender();

  server.post('/posts', function() {
    return [201, { "Content-Type": "application/json" }, ""];
  });

  return run(() => {
    return store.createRecord('post').save();
  }).then(() => {
    assert.equal(true, false, 'should not have fulfilled');
  }, reason => {
    assert.ok(/JSON/.test(reason.message));
  });
});

if (isEnabled('ds-improved-ajax')) {
  testInDebug("The RESTAdapter should use `ajax` with a deprecation message when it is overridden by the user.", function(assert) {
    assert.expect(2)

    adapter.ajax = function(url, verb, hash) {
      assert.ok(true, 'The ajax method should be called when it is overridden');
      return { posts: { id: 1, name: "Rails is omakase" } };
    };

    assert.expectDeprecation(() => {
      run(() => store.findRecord('post', 1));
    }, /RESTAdapter#ajax has been deprecated/)
  });


  testInDebug("The RESTAdapter should use `ajaxOptions` with a deprecation message when it is overridden by the user.", function(assert) {
    assert.expect(2)

    adapter._ajaxRequest = function(hash) {
      let jqXHR = {
        status: 200,
        getAllResponseHeaders() { return ''; }
      };
      hash.success({ posts: { id: 1, name: "Rails is omakase" } }, 'OK', jqXHR);
    }

    let oldAjaxOptions = adapter.ajaxOptions;
    adapter.ajaxOptions = function() {
      assert.ok(true, 'The ajaxOptions method should be called when it is overridden');
      return oldAjaxOptions.apply(this, arguments);
    };

    assert.expectDeprecation(() => {
      run(() => store.findRecord('post', 1));
    }, /RESTAdapter#ajaxOptions has been deprecated/)
  });

  test("_requestToJQueryAjaxHash works correctly for GET requests - GH-4445", function(assert) {
    server = new Pretender();

    server.get('/posts/1', function(request) {
      assert.equal(request.url, "/posts/1", "no query param is added to the GET request");

      return [201, { "Content-Type": "application/json" }, JSON.stringify({ post: { id: 1 } })];
    });

    return run(() => store.findRecord('post', 1));
  });

}
