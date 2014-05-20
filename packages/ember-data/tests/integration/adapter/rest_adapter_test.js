var env, store, adapter, Post, Person, Comment, SuperUser;
var originalAjax, passedUrl, passedVerb, passedHash;

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

    return Ember.RSVP.resolve(value);
  };
}

test("find - basic payload", function() {
  ajaxResponse({ posts: [{ id: 1, name: "Rails is omakase" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("find - basic payload (with legacy singular name)", function() {
  ajaxResponse({ post: { id: 1, name: "Rails is omakase" } });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});
test("find - payload with sideloaded records of the same type", function() {
  var count = 0;

  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");

    var post2 = store.getById('post', 2);
    equal(post2.get('id'), "2");
    equal(post2.get('name'), "The Parley Letter");
  }));
});

test("find - payload with sideloaded records of a different type", function() {
  ajaxResponse({
    posts: [{ id: 1, name: "Rails is omakase" }],
    comments: [{ id: 1, name: "FIRST" }]
  });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");

    var comment = store.getById('comment', 1);
    equal(comment.get('id'), "1");
    equal(comment.get('name'), "FIRST");
  }));
});

test("find - payload with an serializer-specified primary key", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_'
  }));

  ajaxResponse({ posts: [{ "_ID_": 1, name: "Rails is omakase" }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "GET");
    equal(passedHash, undefined);

    equal(post.get('id'), "1");
    equal(post.get('name'), "Rails is omakase");
  }));
});

test("find - payload with a serializer-specified attribute mapping", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    attrs: {
      'name': '_NAME_',
      'createdAt': { key: '_CREATED_AT_', someOtherOption: 'option' }
    }
  }));

  Post.reopen({
    createdAt: DS.attr("number")
  });

  ajaxResponse({ posts: [{ id: 1, _NAME_: "Rails is omakase", _CREATED_AT_: 2013 }] });

  store.find('post', 1).then(async(function(post) {
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

  var post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { id: "some-uuid", name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "The Parley Letter", "the post was updated");
  }));
});

test("create - a payload with a new ID and data applies the updates", function() {
  ajaxResponse({ posts: [{ id: "1", name: "Dat Parley Letter" }] });
  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("create - a payload with a new ID and data applies the updates (with legacy singular name)", function() {
  ajaxResponse({ post: { id: "1", name: "Dat Parley Letter" } });
  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("create - findMany doesn't overwrite owner", function() {
  ajaxResponse({ comment: { id: "1", name: "Dat Parley Letter", post: 1 } });

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post') });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [] });
  var post = store.getById('post', 1);

  var comment = store.createRecord('comment', { name: "The Parley Letter" });
  post.get('comments').pushObject(comment);

  equal(comment.get('post'), post, "the post has been set correctly");

  comment.save().then(async(function(comment) {
    equal(comment.get('isDirty'), false, "the post isn't dirty anymore");
    equal(comment.get('name'), "Dat Parley Letter", "the post was updated");
    equal(comment.get('post'), post, "the post is still set");
  }));
});

test("create - a serializer's primary key and attributes are consulted when building the payload", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  ajaxResponse();

  var post = store.createRecord('post', { id: "some-uuid", name: "The Parley Letter" });

  post.save().then(async(function(post) {
    deepEqual(passedHash.data, { post: { _id_: 'some-uuid', '_name_': "The Parley Letter" } });
  }));
});

test("create - a serializer's attributes are consulted when building the payload if no id is pre-defined", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primarykey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  ajaxResponse();

  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    deepEqual(passedHash.data, { post: { '_name_': "The Parley Letter" } });
  }));
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
      id: "1",
      name: "Dat Parley Letter",
      post: 1
    },{
      id: "2",
      name: "Another Comment",
      post: 1
    }]
    // My API is returning a comment:{} as well as a comments:[{...},...]
    //, comment: {
    //   id: "2",
    //   name: "Another Comment",
    //   post: 1
    // }
  });

  Post.reopen({ comments: DS.hasMany('comment') });
  Comment.reopen({ post: DS.belongsTo('post') });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [1] });
  store.push('comment', { id: 1, name: "Dat Parlay Letter", post: 1 });

  var post = store.getById('post', 1);
  var commentCount = post.get('comments.length');
  equal(commentCount, 1, "the post starts life with a comment");

  var comment = store.createRecord('comment', { name: "Another Comment", post: post });

  comment.save().then(async(function(comment) {
    equal(comment.get('post'), post, "the comment is related to the post");
  }));

  post.reload().then(async(function(post) {
    equal(post.get('comments.length'), 2, "Post comment count has been updated");
  }));
});

test("create - relationships are not duplicated", function() {
  var post, comment;

  Post.reopen({ comments: DS.hasMany('comment') });
  Comment.reopen({ post: DS.belongsTo('post') });

  post = store.createRecord('post', { name: "Tomtomhuda" });
  comment = store.createRecord('comment', { id: 2, name: "Comment title" });

  ajaxResponse({ post: [{ id: 1, name: "Rails is omakase", comments: [] }] });

  post.save().then(async(function(post) {
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
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse();

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "The Parley Letter", "the post was updated");
  }));
});

test("update - a payload with updates applies the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ posts: [{ id: 1, name: "Dat Parley Letter" }] });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("update - a payload with updates applies the updates (with legacy singular name)", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ post: { id: 1, name: "Dat Parley Letter" } });

    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "PUT");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");
  }));
});

test("update - a payload with sideloaded updates pushes the updates", function() {
  ajaxResponse({
    posts: [{ id: 1, name: "Dat Parley Letter" }],
    comments: [{ id: 1, name: "FIRST" }]
  });
  var post = store.createRecord('post', { name: "The Parley Letter" });

  post.save().then(async(function(post) {
    equal(passedUrl, "/posts");
    equal(passedVerb, "POST");
    deepEqual(passedHash.data, { post: { name: "The Parley Letter" } });

    equal(post.get('id'), "1", "the post has the updated ID");
    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});


test("update - a payload with sideloaded updates pushes the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
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

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('name'), "Dat Parley Letter", "the post was updated");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
});

test("update - a serializer's primary key and attributes are consulted when building the payload", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_id_',

    attrs: {
      name: '_name_'
    }
  }));

  store.push('post', { id: 1, name: "Rails is omakase" });
  ajaxResponse();

  store.find('post', 1).then(async(function(post) {
    post.set('name', "The Parley Letter");
    return post.save();
  })).then(async(function(post) {
    deepEqual(passedHash.data, { post: { '_name_': "The Parley Letter" } });
  }));
});

test("delete - an empty payload is a basic success", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse();

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the post is now deleted");
  }));
});

test("delete - a payload with sideloaded updates pushes the updates", function() {
  store.push('post', { id: 1, name: "Rails is omakase" });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1, name: "FIRST" }] });

    post.deleteRecord();
    return post.save();
  })).then(async(function(post) {
    equal(passedUrl, "/posts/1");
    equal(passedVerb, "DELETE");
    equal(passedHash, undefined);

    equal(post.get('isDirty'), false, "the post isn't dirty anymore");
    equal(post.get('isDeleted'), true, "the post is now deleted");

    var comment = store.getById('comment', 1);
    equal(comment.get('name'), "FIRST", "The comment was sideloaded");
  }));
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

    var post1 = store.getById('post', 1),
        post2 = store.getById('post', 2);

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
      [ post1, post2 ],
      "The correct records are in the array"
    );
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
    var comment = store.getById('comment', 1);

    deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  }));
});

test("findAll - data is normalized through custom serializers", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
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
    var post1 = store.getById('post', 1),
        post2 = store.getById('post', 2);

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
      [ post1, post2 ],
      "The correct records are in the array"
    );
  }));
});

test("findAll - since token is passed to the adapter", function() {
  ajaxResponse({
    meta: { since: 'later'},
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }
    ]
  });

  store.metaForType('post', { since: 'now' });

  store.findAll('post').then(async(function(posts) {
    equal(passedUrl, '/posts');
    equal(passedVerb, 'GET');
    equal(store.typeMapFor(Post).metadata.since, 'later');
    deepEqual(passedHash.data, { since: 'now' });
  }));
});

test("metadata is accessible", function() {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{id: 1, name: "Rails is very expensive sushi"}]
  });

  store.findAll('post').then(async(function(posts) {
    equal(
      store.metadataFor('post').offset,
      5,
      "Metadata can be accessed with metadataFor."
    );
  }));
});

test("findQuery - payload 'meta' is accessible on the record array", function() {
  ajaxResponse({
    meta: { offset: 5 },
    posts: [{id: 1, name: "Rails is very expensive sushi"}]
  });

  store.findQuery('post', { page: 2 }).then(async(function(posts) {
    equal(
      posts.get('meta.offset'),
      5,
      "Reponse metadata can be accessed with recordArray.meta"
    );
  }));
});

test("findQuery - returning an array populates the array", function() {
  ajaxResponse({
    posts: [
      { id: 1, name: "Rails is omakase" },
      { id: 2, name: "The Parley Letter" }]
  });

  store.findQuery('post', { page: 1 }).then(async(function(posts) {
    equal(passedUrl, '/posts');
    equal(passedVerb, 'GET');
    deepEqual(passedHash.data, { page: 1 });

    var post1 = store.getById('post', 1),
        post2 = store.getById('post', 2);

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
      [ post1, post2 ],
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

  store.findQuery('post', { page: 1 }).then(async(function(posts) {
    var comment = store.getById('comment', 1);

    deepEqual(comment.getProperties('id', 'name'), { id: "1", name: "FIRST" });
  }));
});

test("findQuery - data is normalized through custom serializers", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  ajaxResponse({
    posts: [{ _ID_: 1, _NAME_: "Rails is omakase" },
            { _ID_: 2, _NAME_: "The Parley Letter" }]
  });

  store.findQuery('post', { page: 1 }).then(async(function(posts) {
    var post1 = store.getById('post', 1),
        post2 = store.getById('post', 2);

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
      [ post1, post2 ],
      "The correct records are in the array"
    );
  }));
});

test("findMany - returning an array populates the array", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [ 1, 2, 3 ] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { id: 1, name: "FIRST" },
        { id: 2, name: "Rails is unagi" },
        { id: 3, name: "What is omakase?" }
      ]
    });

return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(
      comments.toArray(),
      [ comment1, comment2, comment3 ],
      "The correct records are in the array"
    );
  }));
});

test("findMany - returning sideloaded data loads the data", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [ 1, 2, 3 ] });

  store.find('post', 1).then(async(function(post) {
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
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3),
        comment4 = store.getById('comment', 4),
        post2    = store.getById('post', 2);

    deepEqual(
      comments.toArray(),
      [ comment1, comment2, comment3 ],
      "The correct records are in the array"
    );

    deepEqual(comment4.getProperties('id', 'name'), { id: "4", name: "Unrelated comment" });
    deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "The Parley Letter" });
  }));
});

test("findMany - a custom serializer is used if present", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  env.container.register('serializer:comment', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push('post', { id: 1, name: "Rails is omakase", comments: [ 1, 2, 3 ] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: "FIRST" },
        { _ID_: 2, _NAME_: "Rails is unagi" },
        { _ID_: 3, _NAME_: "What is omakase?" }]
    });

    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [ comment1, comment2, comment3 ], "The correct records are in the array");
  }));
});

test("findHasMany - returning an array populates the array", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push(
    'post',
    {
      id: 1,
      name: "Rails is omakase",
      links: { comments: '/posts/1/comments' }
    }
  );

  store.find('post', 1).then(async(function(post) {
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

    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [ comment1, comment2, comment3 ], "The correct records are in the array");
  }));
});

test("findMany - returning sideloaded data loads the data", function() {
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push(
    'post',
    {
      id: 1,
      name: "Rails is omakase",
      links: { comments: '/posts/1/comments' }
    }
  );

  store.find('post', 1).then(async(function(post) {
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
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3),
        post2    = store.getById('post', 2);

    deepEqual(comments.toArray(), [ comment1, comment2, comment3 ], "The correct records are in the array");

    deepEqual(post2.getProperties('id', 'name'), { id: "2", name: "The Parley Letter" });
  }));
});

test("findMany - a custom serializer is used if present", function() {
  env.container.register('serializer:post', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  env.container.register('serializer:comment', DS.RESTSerializer.extend({
    primaryKey: '_ID_',
    attrs: { name: '_NAME_' }
  }));

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  store.push(
    'post',
    {
      id: 1,
      name: "Rails is omakase",
      links: { comments: '/posts/1/comments' }
    }
  );

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({
      comments: [
        { _ID_: 1, _NAME_: "FIRST" },
        { _ID_: 2, _NAME_: "Rails is unagi" },
        { _ID_: 3, _NAME_: "What is omakase?" }
      ]
    });
    return post.get('comments');
  })).then(async(function(comments) {
    var comment1 = store.getById('comment', 1),
        comment2 = store.getById('comment', 2),
        comment3 = store.getById('comment', 3);

    deepEqual(comment1.getProperties('id', 'name'), { id: "1", name: "FIRST" });
    deepEqual(comment2.getProperties('id', 'name'), { id: "2", name: "Rails is unagi" });
    deepEqual(comment3.getProperties('id', 'name'), { id: "3", name: "What is omakase?" });

    deepEqual(comments.toArray(), [ comment1, comment2, comment3 ], "The correct records are in the array");
  }));
});

test('buildURL - with host and namespace', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });

  ajaxResponse({ posts: [{ id: 1 }] });

  store.find('post', 1).then(async(function(post) {
    equal(passedUrl, "http://example.com/api/v1/posts/1");
  }));
});

test('buildURL - with relative paths in links', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post') });

  ajaxResponse({ posts: [{ id: 1, links: { comments: 'comments' } }] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  }));
});

test('buildURL - with absolute paths in links', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post') });

  ajaxResponse({ posts: [{ id: 1, links: { comments: '/api/v1/posts/1/comments' } }] });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  }));
});

test('buildURL - with full URLs in links', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post') });

  ajaxResponse({
    posts: [
      { id: 1,
        links: { comments: 'http://example.com/api/v1/posts/1/comments' }
      }
    ]
  });

  store.find('post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  }));
});

test('buildURL - with camelized names', function() {
  adapter.setProperties({
    pathForType: function(type) {
      var decamelized = Ember.String.decamelize(type);
      return Ember.String.pluralize(decamelized);
    }
  });

  ajaxResponse({ superUsers: [{ id: 1 }] });

  store.find('superUser', 1).then(async(function(post) {
    equal(passedUrl, "/super_users/1");
  }));
});

test('normalizeKey - to set up _ids and _id', function() {
  env.container.register('serializer:application', DS.RESTSerializer.extend({
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

  env.container.register('model:post', DS.Model.extend({
    name: DS.attr(),
    authorName: DS.attr(),
    author: DS.belongsTo('user'),
    comments: DS.hasMany('comment')
  }));

  env.container.register('model:user', DS.Model.extend({
    createdAt: DS.attr(),
    name: DS.attr()
  }));

  env.container.register('model:comment', DS.Model.extend({
    body: DS.attr()
  }));

  ajaxResponse({
    posts: [{
      id: "1",
      name: "Rails is omakase",
      author_name: "@d2h",
      author_id: "1",
      comment_ids: [ "1", "2" ]
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

  store.find('post', 1).then(async(function(post) {
    equal(post.get('authorName'), "@d2h");
    equal(post.get('author.name'), "D2H");
    deepEqual(post.get('comments').mapBy('body'), ["Rails is unagi", "What is omakase?"]);
  }));
});
