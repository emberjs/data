var env, store, adapter, Post, Comment, SuperUser;
var passedUrl, passedVerb, passedHash;
var run = Ember.run;
var get = Ember.get;

module("integration/adapter/rest_adapter - REST Adapter", {
  setup: function() {
    Post = DS.Model.extend({
      name: DS.attr("string")
    });

    Post.toString = function() {
      return "Post";
    };

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
  }
});

function ajaxResponse(value) {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
  };
}

test("find - basic payload", function() {
  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }] });

  run(store, 'find', 'post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});


test("findRecord - passes buildURL a requestType", function() {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/" + requestType + "/post/" + id;
  };

  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }] });


  run(store, 'findRecord', 'post', 1).then(async(function(post) {
    equal(passedUrl, "/findRecord/post/1");
  }));
});

test("find - basic payload (with legacy singular name)", function() {
  ajaxResponse({ post: { id: 1, name: "Rails is omakase" } });

  run(store, 'find', 'post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("find - payload with sideloaded records of the same type", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  run(store, 'find', 'post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");

    var post2 = store.peekRecord('post', 2);
    equal(post2.get('id'), "2");
    equal(post2.get('name'), "The Parley Letter");
  }));
});

test("find - payload with sideloaded records of a different type", function() {
  ajaxResponse({
    posts: [{ id: 1, name: "Rails is omakase" }],
    comments: [{ id: 1, name: "FIRST" }]
  });

  run(store, 'find', 'post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");

    var comment = store.peekRecord('comment', 1);
    equal(comment.get('id'), "1");
    equal(comment.get('name'), "FIRST");
  }));
});


test("find - payload with an serializer-specified primary key", function() {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_'
  }));

  ajaxResponse({ posts: [{ "_ID_": 1, name: "Rails is omakase" }] });

  run(store, 'find', 'post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("find - payload with a serializer-specified attribute mapping", function() {
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

  run(store, 'find', 'post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
    equal(post.get('createdAt'), 2013);
  }));
});

test("create - an empty payload is a basic success if an id was specified", function() {
  ajaxResponse();
  var post;

  run(function() {
    post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });
    post.save().then(async(function(post) {
      equal(passedUrl, "/posts");
      equal(passedVerb, "POST");
      deepEqual(passedHash.data, { post: { id: "some-uuid", name: "The Parley Letter" } });

      equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      equal(post.get('name'), "The Parley Letter", "the post was updated");
    }));
  });
});

test("create - passes buildURL the requestType", function() {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/post/" + requestType;
  };

  ajaxResponse();
  var post;

  run(function() {
    post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });
    post.save().then(async(function(post) {
      equal(passedUrl, "/post/createRecord");
    }));
  });
});

test("create - a payload with a new ID and data applies the updates", function() {
  ajaxResponse({ posts: [{ id: "1", name: "Dat Parley Letter" }] });
  run(function() {
    var post = store.createRecord('post', { name: "The Parley Letter" });

    post.save().then(async(function(post) {
      equal(passedUrl, "/posts");
      equal(passedVerb, "POST");
      deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

      equal(post.get('id'), "1", "the post has the updated ID");
      equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      equal(post.get('name'), "Dat Parley Letter", "the post was updated");
    }));
  });
});

test("create - a payload with a new ID and data applies the updates (with legacy singular name)", function() {
  var post;
  ajaxResponse({ post: { id: "1", name: "Dat Parley Letter" } });
  run(function() {
    post = store.createRecord('post', { name: "The Parley Letter" });
  });

  run(post, 'save').then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("create - findMany doesn't overwrite owner", function() {
  ajaxResponse({ comment: { id: "1", name: "Dat Parley Letter", post: 1 } });
  var comment;

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  run(function() {
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
  var post = store.peekRecord('post', 1);

  run(function() {
    comment = store.createRecord('comment', { name: "The Parley Letter" });
  });
  post.get('comments').pushObject(comment);

  equal(comment.get('post'), post, "the post has been set correctly");

  run(function() {
    comment.save().then(async(function(comment) {
      equal(comment.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      equal(comment.get('name'), "Dat Parley Letter", "the post was updated");
      equal(comment.get('post'), post, "the post is still set");
    }));
  });
});

test("create - a serializer's primary key and attributes are consulted when building the payload", function() {
  var post;
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  ajaxResponse();

  run(function() {
    post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });
  });

  run(post, 'save').then(async(function(post) {
    deepEqual(passedHash.data, { post: { _id_: 'some-uuid', '_name_': "The Parley Letter" } });
  }));
});

test("create - a serializer's attributes are consulted when building the payload if no id is pre-defined", function() {
  var post;
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primarykey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  ajaxResponse();

  run(function() {
    post = store.createRecord('post', { name: "The Parley Letter" });

    post.save().then(async(function(post) {
      deepEqual(passedHash.data, { post: { '_name_': "The Parley Letter" } });
    }));
  });
});

test("create - a serializer's attribute mapping takes precdence over keyForAttribute when building the payload", function() {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      name: 'given_name'
    },

    keyForAttribute: function(attr) {
      return attr.toUpperCase();
    }
  }));

  ajaxResponse();

  run(function() {
    var post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });

    post.save().then(async(function(post) {
      deepEqual(passedHash.data, { post: { 'given_name': "The Parley Letter", id: "some-uuid" } });
    }));
  });
});

test("create - a serializer's attribute mapping takes precedence over keyForRelationship (belongsTo) when building the payload", function() {
  env.registry.register('serializer:comment', DS.RESTSerializer.extend({
    attrs: {
      post: 'article'
    },

    keyForRelationship: function(attr, kind) {
      return attr.toUpperCase();
    }
  }));

  ajaxResponse();

  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  run(function() {
    var post = store.createRecord('post', { id: "a-post-id", name: "The Parley Letter" });
    var comment = store.createRecord('comment', { id: "some-uuid", name: "Letters are fun", post: post });

    comment.save().then(async(function(post) {
      deepEqual(passedHash.data, { comment: { article: "a-post-id", id: "some-uuid", name: "Letters are fun" } });
    }));
  });
});

test("create - a serializer's attribute mapping takes precedence over keyForRelationship (hasMany) when building the payload", function() {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      comments: 'opinions'
    },

    keyForRelationship: function(attr, kind) {
      return attr.toUpperCase();
    }
  }));

  ajaxResponse();

  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });

  run(function() {
    var comment = store.createRecord('comment', { id: "a-comment-id", name: "First!" });
    var post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter", comments: [comment] });

    post.save().then(async(function(post) {
      deepEqual(passedHash.data, { post: { opinions: ["a-comment-id"], id: "some-uuid", name: "The Parley Letter" } });
    }));
  });
});

test("create - a record on the many side of a hasMany relationship should update relationships when data is sideloaded", function() {
  expect(3);

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

  run(function() {
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

  var post = store.peekRecord('post', 1);
  var commentCount = post.get('comments.length');
  equal(commentCount, 1, "the post starts life with a comment");

  run(function() {
    var comment = store.createRecord('comment', { name: "Another Comment", post: post });

    comment.save().then(async(function(comment) {
      equal(comment.get('post'), post, "the comment is related to the post");
    }));

    post.reload().then(async(function(post) {
      equal(post.get('comments.length'), 2, "Post comment count has been updated");
    }));
  });
});

test("create - sideloaded belongsTo relationships are both marked as loaded", function () {
  expect(4);
  var post;

  Post.reopen({ comment: DS.belongsTo('comment', { async: false }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  run(function() {
    post = store.createRecord('post', { name: "man" });
  });

  ajaxResponse({
    posts: [{ id: 1, comment: 1, name: "marked" }],
    comments: [{ id: 1, post: 1, name: "Comcast is a bargain" }]
  });

  run(function() {
    post.save().then(async(function(record) {
      equal(store.peekRecord('post', 1).get('comment.isLoaded'), true, "post's comment isLoaded (via store)");
      equal(store.peekRecord('comment', 1).get('post.isLoaded'), true, "comment's post isLoaded (via store)");
      equal(record.get('comment.isLoaded'), true, "post's comment isLoaded (via record)");
      equal(record.get('comment.post.isLoaded'), true, "post's comment's post isLoaded (via record)");
    }));
  });
});

test("create - response can contain relationships the client doesn't yet know about", function() {
  expect(3); // while records.length is 2, we are getting 4 assertions

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

  var post;
  run(function() {
    post = store.createRecord('post', { name: "Rails is omakase" });
  });

  run(function() {
    post.save().then(async(function(post) {
      equal(post.get('comments.firstObject.post'), post, "the comments are related to the correct post model");
      equal(store.typeMapFor(Post).records.length, 1, "There should only be one post record in the store");

      var postRecords = store.typeMapFor(Post).records;
      for (var i = 0; i < postRecords.length; i++) {
        equal(post, postRecords[i].getRecord(), "The object in the identity map is the same");
      }
    }));
  });
});

test("create - relationships are not duplicated", function() {
  var post, comment;

  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  run(function() {
    post = store.createRecord('post', { name: "Tomtomhuda" });
    comment = store.createRecord('comment', { id: 2, name: "Comment title" });
  });

  ajaxResponse({ post: [{ id: 1, name: "Rails is omakase", comments: [] }] });

  run(post, 'save').then(async(function(post) {
    equal(post.get('comments.length'), 0, "post has 0 comments");
    post.get('comments').pushObject(comment);
    equal(post.get('comments.length'), 1, "post has 1 comment");

    ajaxResponse({
      post: [{ id: 1, name: "Rails is omakase", comments: [2] }],
      comments: [{ id: 2, name: "Comment title" }]
    });

    return post.save();
  })).then(async(function(post) {
    equal(post.get('comments.length'), 1, "post has 1 comment");
  }));
});

test("update - an empty payload is a basic success", function() {
  run(function() {
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

  run(function() {
    var post = store.peekRecord('post', 1);
    ajaxResponse();

    post.set('name', "The Parley Letter");
    post.save().then(async(function(post) {
      equal(passedUrl, "/posts/1");
      equal(passedVerb, "PUT");
      deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

      equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      equal(post.get('name'), "The Parley Letter", "the post was updated");
    }));
  });
});

test("update - passes the requestType to buildURL", function() {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/posts/" + id + "/" + requestType;
  };
  adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
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

  run(function() {
    store.findRecord('post', 1).then(async(function(post) {
      ajaxResponse();

      post.set('name', "The Parley Letter");
      return post.save();
    })).then(async(function(post) {
      equal(passedUrl, "/posts/1/updateRecord");
    }));
  });
});

test("update - a payload with updates applies the updates", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({ posts: [{ id: 1, name: "Dat Parley Letter" }] });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("update - a payload with updates applies the updates (with legacy singular name)", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({ post: { id: 1, name: "Dat Parley Letter" } });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("update - a payload with sideloaded updates pushes the updates", function() {
  var post;
  ajaxResponse({
    posts: [{ id: 1, name: "Dat Parley Letter" }],
    comments: [{ id: 1, name: "FIRST" }]
  });
  run(function() {
    post = store.createRecord('post', { name: "The Parley Letter" });
    post.save().then(async(function(post) {
      equal(passedUrl, "/posts");
      equal(passedVerb, "POST");
      deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

      equal(post.get('id'), "1", "the post has the updated ID");
      equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
      equal(post.get('name'), "Dat Parley Letter", "the post was updated");

      var comment = store.peekRecord('comment', 1);
      equal(comment.get('name'), "FIRST", "The comment was sideloaded");
    }));
  });
});

test("update - a payload with sideloaded updates pushes the updates", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({
      posts: [{ id: 1, name: "Dat Parley Letter" }],
      comments: [{ id: 1, name: "FIRST" }]
    });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");

    var comment = store.peekRecord('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});

test("update - a serializer's primary key and attributes are consulted when building the payload", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  run(function() {
    store.push({
      data: {
        type: 'post',
        id: '1',
        name: "Rails is omakase"
      }
    });
  });
  ajaxResponse();

  store.findRecord('post', 1).then(async(function(post) {
    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    deepEqual(passedHash.data, { post: { '_name_': "The Parley Letter" } });
  }));
});

test("update - hasMany relationships faithfully reflect simultaneous adds and removes", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
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

  store.findRecord('comment', 2).then(async(function() {
    return store.findRecord('post', 1);
  })).then(async(function(post) {
    var newComment = store.peekRecord('comment', 2);
    var comments = post.get('comments');

    // Replace the comment with a new one
    comments.popObject();
    comments.pushObject(newComment);

    return post.save();
  })).then(async(function(post) {
    equal(post.get('comments.length'), 1, "the post has the correct number of comments");
    equal(post.get('comments.firstObject.name'), "Yes. Yes it is.", "the post has the correct comment");
  }));
});

test("delete - an empty payload is a basic success", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse();

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the post is now deleted");
  }));
});

test("delete - passes the requestType to buildURL", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/posts/" + id + "/" + requestType;
  };

  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse();

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1/deleteRecord");
  }));
});

test("delete - a payload with sideloaded updates pushes the updates", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1, name: "FIRST" }] });

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('hasDirtyAttributes'), false, "the post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the post is now deleted");

    var comment = store.peekRecord('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});

test("delete - a payload with sidloaded updates pushes the updates when the original record is omitted", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({ posts: [{ id: 2, name: "The Parley Letter" }] });

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('hasDirtyAttributes'), false, "the original post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the original post is now deleted");

    var newPost = store.peekRecord('post', 2);
    equal(newPost.get('name'), "The Parley Letter", "The new post was added to the store");
  }));
});

test("delete - deleting a newly created record should not throw an error", function() {
  var post;
  run(function() {
    post = store.createRecord('post');
  });

  run(function() {
    post.deleteRecord();
    post.save().then(async(function(post) {
      equal(passedUrl, null, "There is no ajax call to delete a record that has never been saved.");
      equal(passedVerb, null, "There is no ajax call to delete a record that has never been saved.");
      equal(passedHash, null, "There is no ajax call to delete a record that has never been saved.");

      equal(post.get('isDeleted'), true, "the post is now deleted");
      equal(post.get('isError'), false, "the post is not an error");
    }));
  });
});

test("findAll - returning an array populates the array", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  store.findAll('post').then(async(function(posts) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "GET");
    equal(passedHash.data, undefined);

    var post1 = store.peekRecord('post', 1);
    var post2 = store.peekRecord('post', 2);

    deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );

    deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    equal(posts.get('length'), 2, "The posts are in the array");
    equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    deepEqual(
      posts.toArray(),
      [post1, post2],
      "The correct records are in the array"
    );
  }));
});


test("findAll - passes buildURL the requestType", function() {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/" + requestType + "/posts";
  };

  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  store.findAll('post').then(async(function(posts) {
    equal(passedUrl, "/findAll/posts");
  }));
});

test("findAll - returning sideloaded data loads the data", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ],
    comments: [{ id: 1, name: "FIRST" }] });

  store.findAll('post').then(async(function(posts) {
    var comment = store.peekRecord('comment', 1);

    deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  }));
});

test("findAll - data is normalized through custom serializers", function() {
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

  store.findAll('post').then(async(function(posts) {
    var post1 = store.peekRecord('post', 1);
    var post2 = store.peekRecord('post', 2);

    deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );
    deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    equal(posts.get('length'), 2, "The posts are in the array");
    equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    deepEqual(
      posts.toArray(),
      [post1, post2],
      "The correct records are in the array"
    );
  }));
});

test("findQuery - if `sortQueryParams` option is not provided, query params are sorted alphabetically", function() {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    deepEqual(Object.keys(hash.data), ["in", "order", "params", "wrong"], 'query params are received in alphabetical order');

    return run(Ember.RSVP, 'resolve', { posts: [{ id: 1, name: "Rails is very expensive sushi" }] });
  };

  store.query('post', { "params": 1, "in": 2, "wrong": 3, "order": 4 }).then(async(function() {
    // Noop
  }));
});

test("findQuery - passes buildURL the requestType", function() {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/" + requestType + "/posts";
  };

  adapter.ajax = function(url, verb, hash) {
    equal(url, '/query/posts');

    return run(Ember.RSVP, 'resolve', { posts: [{ id: 1, name: "Rails is very expensive sushi" }] });
  };

  store.query('post', { "params": 1, "in": 2, "wrong": 3, "order": 4 }).then(async(function() {
    // NOOP
  }));
});

test("findQuery - if `sortQueryParams` is falsey, query params are not sorted at all", function() {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    deepEqual(Object.keys(hash.data), ["params", "in", "wrong", "order"], 'query params are received in their original order');

    return run(Ember.RSVP, 'resolve', { posts: [{ id: 1, name: "Rails is very expensive sushi" }] });
  };

  adapter.sortQueryParams = null;

  store.query('post', { "params": 1, "in": 2, "wrong": 3, "order": 4 }).then(async(function() {
    // Noop
  }));
});

test("findQuery - if `sortQueryParams` is a custom function, query params passed through that function", function() {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    deepEqual(Object.keys(hash.data), ["wrong", "params", "order", "in"], 'query params are received in reverse alphabetical order');

    return run(Ember.RSVP, 'resolve', { posts: [{ id: 1, name: "Rails is very expensive sushi" }] });
  };

  adapter.sortQueryParams = function(obj) {
    var sortedKeys = Object.keys(obj).sort().reverse();
    var len = sortedKeys.length;
    var newQueryParams = {};

    for (var i = 0; i < len; i++) {
      newQueryParams[sortedKeys[i]] = obj[sortedKeys[i]];
    }
    return newQueryParams;
  };

  store.query('post', { "params": 1, "in": 2, "wrong": 3, "order": 4 }).then(async(function() {
    // Noop
  }));
});

test("findQuery - payload 'meta' is accessible on the record array", function() {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  store.query('post', { page: 2 }).then(async(function(posts) {
    equal(
      posts.get('meta.offset'),
      5,
      "Reponse metadata can be accessed with recordArray.meta"
    );
  }));
});

test("findQuery - each record array can have it's own meta object", function() {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{ id: 1, name: "Rails is very expensive sushi" }]
  });

  store.query('post', { page: 2 }).then(async(function(posts) {
    equal(
      posts.get('meta.offset'),
      5,
      "Reponse metadata can be accessed with recordArray.meta"
    );
    ajaxResponse({
      meta: { offset: 1 },
      posts: [{ id: 1, name: "Rails is very expensive sushi" }]
    });
    store.query('post', { page: 1 }).then(async(function(newPosts) {
      equal(newPosts.get('meta.offset'), 1, 'new array has correct metadata');
      equal(posts.get('meta.offset'), 5, 'metadata on the old array hasnt been clobbered');
    }));
  }));
});


test("findQuery - returning an array populates the array", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }]
  });

  store.query('post', { page: 1 }).then(async(function(posts) {
    equal(passedUrl, '/posts');
    equal(passedVerb, 'GET');
    deepEqual(passedHash.data, { page: 1 });

    var post1 = store.peekRecord('post', 1);
    var post2 = store.peekRecord('post', 2);

    deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );
    deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    equal(posts.get('length'), 2, "The posts are in the array");
    equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    deepEqual(
      posts.toArray(),
      [post1, post2],
      "The correct records are in the array"
    );
  }));
});

test("findQuery - returning sideloaded data loads the data", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ],
    comments: [{ id: 1, name: "FIRST" }]
  });

  store.query('post', { page: 1 }).then(async(function(posts) {
    var comment = store.peekRecord('comment', 1);

    deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  }));
});

test("findQuery - data is normalized through custom serializers", function() {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  ajaxResponse({
    posts: [{ _ID_: 1, _NAME_: "Rails is omakase" },
            { _ID_: 2, _NAME_: "The Parley Letter" }]
  });

  store.query('post', { page: 1 }).then(async(function(posts) {
    var post1 = store.peekRecord('post', 1);
    var post2 = store.peekRecord('post', 2);

    deepEqual(
      post1.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded"
    );

    deepEqual(
      post2.getProperties('id', 'name'),
      { id: "2", name: "The Parley Letter" },
      "Post 2 is loaded"
    );

    equal(posts.get('length'), 2, "The posts are in the array");
    equal(posts.get('isLoaded'), true, "The RecordArray is loaded");
    deepEqual(
      posts.toArray(),
      [post1, post2],
      "The correct records are in the array"
    );
  }));
});

test("queryRecord - returns a single record in an object", function() {
  ajaxResponse({
    post: {
      id: '1',
      name: 'Ember.js rocks'
    }
  });

  store.queryRecord('post', { slug: 'ember-js-rocks' }).then(async(function(post) {
    deepEqual(post.get('name'), "Ember.js rocks");
  }));
});

test("queryRecord - returning sideloaded data loads the data", function() {
  ajaxResponse({
    post: { id: 1, name: "Rails is omakase" },
    comments: [{ id: 1, name: "FIRST" }]
  });

  store.queryRecord('post', { slug: 'rails-is-omakaze' }).then(async(function(post) {
    var comment = store.peekRecord('comment', 1);

    deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  }));
});

test("queryRecord - returning an array picks the first one but saves all records to the store", function() {
  ajaxResponse({
    post: [{ id: 1, name: "Rails is omakase" }, { id: 2, name: "Ember is js" }]
  });

  store.queryRecord('post', { slug: 'rails-is-omakaze' }).then(async(function(post) {
    var post2 = store.peekRecord('post', 2);

    deepEqual(post.getProperties('id', 'name'), { id: "1", name: "Rails is omakase" });
    deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "Ember is js" });
  }));
});

test("queryRecord - data is normalized through custom serializers", function() {
  env.registry.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  ajaxResponse({
    post: { _ID_: 1, _NAME_: "Rails is omakase" }
  });

  store.queryRecord('post', { slug: 'rails-is-omakaze' }).then(async(function(post) {

    deepEqual(
      post.getProperties('id', 'name'),
      { id: "1", name: "Rails is omakase" },
      "Post 1 is loaded with correct data"
    );
  }));
});

test("findMany - findMany uses a correct URL to access the records", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(function() {
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

  var post = store.peekRecord('post', 1);
  ajaxResponse({
    comments: [
      { id: 1, name: "FIRST" },
      { id: 2, name: "Rails is unagi" },
      { id: 3, name: "What is omakase?" }
    ]
  });
  run(post, 'get', 'comments').then(async(function(comments) {
    equal(passedUrl, "/comments");
    deepEqual(passedHash, { data: { ids: ["1", "2", "3"] } });
  }));
});

test("findMany - passes buildURL the requestType", function() {
  adapter.buildURL = function(type, id, snapshot, requestType) {
    return "/" + requestType + "/" + type;
  };

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(function() {
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

  var post = store.peekRecord('post', 1);
  ajaxResponse({
    comments: [
      { id: 1, name: "FIRST" },
      { id: 2, name: "Rails is unagi" },
      { id: 3, name: "What is omakase?" }
    ]
  });
  run(post, 'get', 'comments').then(async(function(comments) {
    equal(passedUrl, "/findMany/comment");
  }));
});

test("findMany - findMany does not coalesce by default", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  run(function() {
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

  var post = store.peekRecord('post', 1);
  //It's still ok to return this even without coalescing  because RESTSerializer supports sideloading
  ajaxResponse({
    comments: [
      { id: 1, name: "FIRST" },
      { id: 2, name: "Rails is unagi" },
      { id: 3, name: "What is omakase?" }
    ]
  });
  run(post, 'get', 'comments').then(async(function(comments) {
    equal(passedUrl, "/comments/3");
    equal(passedHash, null);
  }));
});

test("findMany - returning an array populates the array", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.peekRecord('comment', 1);
    var comment2 = store.peekRecord('comment', 2);
    var comment3 = store.peekRecord('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(
      comments.toArray(),
      [comment1, comment2, comment3],
      "The correct records are in the array"
    );
  }));
});

test("findMany - returning sideloaded data loads the data", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
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
  })).then(async(function(comments) {
    var comment1 = store.peekRecord('comment', 1);
    var comment2 = store.peekRecord('comment', 2);
    var comment3 = store.peekRecord('comment', 3);
    var comment4 = store.peekRecord('comment', 4);
    var post2    = store.peekRecord('post', 2);

    deepEqual(
      comments.toArray(),
      [comment1, comment2, comment3],
      "The correct records are in the array"
    );

    deepEqual(comment4.getProperties('id', 'name'), { id: "4", name: "Unrelated comment" });
    deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "The Parley Letter" });
  }));
});

test("findMany - a custom serializer is used if present", function() {
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

  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: "FIRST" },
        { _ID_: 2, _NAME_: "Rails is unagi" },
        { _ID_: 3, _NAME_: "What is omakase?" }]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.peekRecord('comment', 1);
    var comment2 = store.peekRecord('comment', 2);
    var comment3 = store.peekRecord('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [comment1, comment2, comment3], "The correct records are in the array");
  }));
});

test("findHasMany - returning an array populates the array", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  run(function() {
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

  run(store, 'findRecord', 'post', '1').then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    equal(passedUrl, '/posts/1/comments');
    equal(passedVerb, 'GET');
    equal(passedHash, undefined);

    var comment1 = store.peekRecord('comment', 1);
    var comment2 = store.peekRecord('comment', 2);
    var comment3 = store.peekRecord('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [comment1, comment2, comment3], "The correct records are in the array");
  }));
});

test("findHasMany - passes buildURL the requestType", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.buildURL = function(type, id, snapshot, requestType) {
    equal(requestType, 'findHasMany');
  };

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  run(function() {
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

  run(store, 'findRecord', 'post', '1').then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    // NOOP
  }));
});



test("findMany - returning sideloaded data loads the data", function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  adapter.coalesceFindRequests = true;

  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ],
      posts: [{ id: 2, name: "The Parley Letter" }]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.peekRecord('comment', 1);
    var comment2 = store.peekRecord('comment', 2);
    var comment3 = store.peekRecord('comment', 3);
    var post2    = store.peekRecord('post', 2);

    deepEqual(comments.toArray(), [comment1, comment2, comment3], "The correct records are in the array");

    deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "The Parley Letter" });
  }));
});

test("findMany - a custom serializer is used if present", function() {
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

  run(function() {
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

  store.findRecord('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: "FIRST" },
        { _ID_: 2, _NAME_: "Rails is unagi" },
        { _ID_: 3, _NAME_: "What is omakase?" }
      ]
    });
    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.peekRecord('comment', 1);
    var comment2 = store.peekRecord('comment', 2);
    var comment3 = store.peekRecord('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [comment1, comment2, comment3], "The correct records are in the array");
  }));
});

test('findBelongsTo - passes buildURL the requestType', function() {
  adapter.shouldBackgroundReloadRecord = () => false;
  adapter.buildURL = function(type, id, snapshot, requestType) {
    equal(requestType, 'findBelongsTo');
  };

  Comment.reopen({ post: DS.belongsTo('post', { async: true }) });

  run(function() {
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

  run(store, 'findRecord', 'comment', 1).then(async(function(comment) {
    ajaxResponse({ post: { id: 1, name: 'Rails is omakase' } });
    return comment.get('post');
  })).then(async(function(post) {
    // NOOP
  }));
});

test('coalesceFindRequests warns if the expected records are not returned in the coalesced request', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  adapter.coalesceFindRequests = true;

  ajaxResponse({ comments: [{ id: 1 }] });
  var post;

  warns(function() {
    run(function() {
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
      post.get('comments');
    });
  }, /expected to find records with the following ids in the adapter response but they were missing: \[2,3\]/);
});

test('groupRecordsForFindMany groups records based on their url', function() {
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
    equal(id, '1');
    return Ember.RSVP.resolve({ comments: { id: 1 } });
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    deepEqual(ids, ['2', '3']);
    return Ember.RSVP.resolve({ comments: [{ id: 2 }, { id: 3 }] });
  };

  var post;
  run(function() {
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

  run(function() {
    post.get('comments');
  });
});

test('groupRecordsForFindMany groups records correctly when singular URLs are encoded as query params', function() {
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
    equal(id, '1');
    return Ember.RSVP.resolve({ comments: { id: 1 } });
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    deepEqual(ids, ['2', '3']);
    return Ember.RSVP.resolve({ comments: [{ id: 2 }, { id: 3 }] });
  };
  var post;

  run(function() {
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

  run(function() {
    post.get('comments');
  });
});

test('normalizeKey - to set up _ids and _id', function() {
  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    keyForAttribute: function(attr) {
      return Ember.String.underscore(attr);
    },

    keyForBelongsTo: function(belongsTo) {
    },

    keyForRelationship: function(rel, kind) {
      if (kind === 'belongsTo') {
        var underscored = Ember.String.underscore(rel);
        return underscored + '_id';
      } else {
        var singular = Ember.String.singularize(rel);
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

  run(function() {
    store.find('post', 1).then(async(function(post) {
      equal(post.get('authorName'), "@d2h");
      equal(post.get('author.name'), "D2H");
      deepEqual(post.get('comments').mapBy('body'), ["Rails is unagi", "What is omakase?"]);
    }));
  });
});

test('groupRecordsForFindMany splits up calls for large ids', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  expect(2);

  function repeatChar(character, n) {
    return new Array(n+1).join(character);
  }

  var a2000 = repeatChar('a', 2000);
  var b2000 = repeatChar('b', 2000);
  var post;
  run(function() {
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
      ok(true, "Found " + id);
    }

    return Ember.RSVP.resolve({ comments: { id: id } });
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    ok(false, "findMany should not be called - we expect 2 calls to find for a2000 and b2000");
    return Ember.RSVP.reject();
  };

  run(function() {
    post.get('comments');
  });
});

test('groupRecordsForFindMany groups calls for small ids', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  expect(1);

  function repeatChar(character, n) {
    return new Array(n+1).join(character);
  }

  var a100 = repeatChar('a', 100);
  var b100 = repeatChar('b', 100);
  var post;

  run(function() {
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
    ok(false, "find should not be called - we expect 1 call to findMany for a100 and b100");
    return Ember.RSVP.reject();
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    deepEqual(ids, [a100, b100]);
    return Ember.RSVP.resolve({ comments: [{ id: a100 }, { id: b100 }] });
  };

  run(function() {
    post.get('comments');
  });
});


test("calls adapter.handleResponse with the jqXHR and json", function() {
  expect(2);
  var originalAjax = Ember.$.ajax;
  var jqXHR = {
    status: 200,
    getAllResponseHeaders: function() { return ''; }
  };
  var data = {
    post: {
      id: "1",
      name: "Docker is amazing"
    }
  };

  Ember.$.ajax = function(hash) {
    hash.success(data, 'ok', jqXHR);
  };

  adapter.handleResponse = function(status, headers, json) {
    deepEqual(status, 200);
    deepEqual(json, data);
    return json;
  };

  try {
    run(function() {
      store.find('post', '1');
    });
  } finally {
    Ember.$.ajax = originalAjax;
  }
});

test('calls handleResponse with jqXHR, jqXHR.responseText', function() {
  expect(3);
  var originalAjax = Ember.$.ajax;
  var jqXHR = {
    status: 400,
    responseText: 'Nope lol',
    getAllResponseHeaders: function() { return ''; }
  };

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, jqXHR.responseText, 'Bad Request');
  };

  adapter.handleResponse = function(status, headers, json) {
    deepEqual(status, 400);
    deepEqual(json, jqXHR.responseText);
    return new DS.AdapterError('nope!');
  };

  try {
    run(function() {
      store.find('post', '1').catch(function(err) {
        ok(err, 'promise rejected');
      });
    });
  } finally {
    Ember.$.ajax = originalAjax;
  }
});

test("rejects promise if DS.AdapterError is returned from adapter.handleResponse", function() {
  expect(3);
  var originalAjax = Ember.$.ajax;
  var jqXHR = {
    getAllResponseHeaders: function() { return ''; }
  };
  var data = {
    something: 'is invalid'
  };

  Ember.$.ajax = function(hash) {
    hash.success(data, 'ok', jqXHR);
  };

  adapter.handleResponse = function(status, headers, json) {
    ok(true, 'handleResponse should be called');
    return new DS.AdapterError(json);
  };

  Ember.run(function() {
    store.find('post', '1').then(null, function(reason) {
      ok(true, 'promise should be rejected');
      ok(reason instanceof DS.AdapterError, 'reason should be an instance of DS.AdapterError');
    });
  });

  Ember.$.ajax = originalAjax;
});

test('on error appends errorThrown for sanity', function() {
  expect(2);

  var originalAjax = Ember.$.ajax;
  var jqXHR = {
    responseText: 'Nope lol',
    getAllResponseHeaders: function() { return ''; }
  };

  var errorThrown = new Error('nope!');

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, jqXHR.responseText, errorThrown);
  };

  adapter.handleResponse = function(status, headers, payload) {
    ok(false);
  };

  try {
    run(function() {
      store.find('post', '1').catch(function(err) {
        equal(err, errorThrown);
        ok(err, 'promise rejected');
      });
    });
  } finally {
    Ember.$.ajax = originalAjax;
  }
});


test('on error wraps the error string in an DS.AdapterError object', function() {
  expect(2);

  var originalAjax = Ember.$.ajax;
  var jqXHR = {
    responseText: '',
    getAllResponseHeaders: function() { return ''; }
  };

  var errorThrown = 'nope!';

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR, 'error', errorThrown);
  };

  try {
    run(function() {
      store.find('post', '1').catch(function(err) {
        equal(err.errors[0].detail, errorThrown);
        ok(err, 'promise rejected');
      });
    });
  } finally {
    Ember.$.ajax = originalAjax;
  }
});

test('findAll resolves with a collection of DS.Models, not DS.InternalModels', () => {
  expect(4);

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

  run(() => {
    store.findAll('post').then(async((posts) => {
      equal(get(posts, 'length'), 3);
      posts.forEach((post) => ok(post instanceof DS.Model));
    }));
  });

});

test("create - sideloaded records are pushed to the store", function() {
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
  var post;

  run(function() {
    post = store.createRecord('post', { name: 'The Parley Letter' });
    post.save().then(function(post) {
      var comments = store.peekAll('comment');

      equal(get(comments, 'length'), 2, 'comments.length is correct');
      equal(get(comments, 'firstObject.name'), 'First comment', 'comments.firstObject.name is correct');
      equal(get(comments, 'lastObject.name'), 'Second comment', 'comments.lastObject.name is correct');
    });
  });
});
