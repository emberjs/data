var get = Ember.get, set = Ember.set;

var store, adapter, App, Post, Comment;

module("One-to-Many Relationships", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });

    App = Ember.Namespace.create({
      toString: function() { return "App"; }
    });

    App.Post = DS.Model.extend({
      title: DS.attr('string')
    });

    App.Comment = DS.Model.extend({
      body: DS.attr('string'),
      post: DS.belongsTo(App.Post)
    });

    App.Post.reopen({
      comments: DS.hasMany(App.Comment)
    });
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    });
  }
});

function verifySynchronizedOneToMany(post, comment, expectedHasMany) {
  expectedHasMany = expectedHasMany || [comment];
  equal(comment.get('post'), post);
  deepEqual(post.get('comments').toArray(), expectedHasMany);
}

test("Referencing a null belongsTo relationship returns null", function(){
  store.load(App.Comment, { id: 1, post: null, body: "child with intentionally null parent" });
  var comment = store.find(App.Comment, 1);
  equal(comment.get('post'), null, "null belongsTo relationship returns null");
});

test("When setting a record's belongsTo relationship to another record, that record should be added to the inverse hasMany array", function() {
  store.load(App.Post, { id: 1, title: "parent" });
  store.load(App.Comment, { id: 2, body: "child" });

  var post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 2);

  equal(post.get('comments.length'), 0, "precond - the post has no child comments yet");

  comment.set('post', post);
  verifySynchronizedOneToMany(post, comment);
});

test("When setting a record's belongsTo relationship to null, that record should be removed from the inverse hasMany array", function() {
  store.load(App.Post, { id: 1, title: "parent", comments: [2, 3] });
  store.load(App.Comment, { id: 2, body: "child", post: 1 });
  store.load(App.Comment, { id: 3, body: "child", post: 1 });

  var post = store.find(App.Post, 1),
      comment1 = store.find(App.Comment, 2),
      comment2 = store.find(App.Comment, 3);

  deepEqual(post.get('comments').toArray(), [comment1, comment2], "precond - the post has has two child comments");

  comment1.set('post', null);
  equal(comment1.get('post'), null, "belongsTo relationship has been set to null");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "the post comments array should have the remaining comment");
});

test("When adding a record to a hasMany array, its belongsTo is set", function() {
  store.load(App.Post, { id: 1, title: "parent", comments: [2] });
  store.load(App.Comment, { id: 2, body: "child", post: 1 });
  store.load(App.Comment, { id: 3, body: "child" });

  var post = store.find(App.Post, 1),
      comment1 = store.find(App.Comment, 2),
      comment2 = store.find(App.Comment, 3);

  post.get('comments').addObject(comment2);
  verifySynchronizedOneToMany(post, comment2, [comment1, comment2]);
});

test("When removing a record from a hasMany array, its belongsTo is set to null", function() {
  store.load(App.Post, { id: 1, title: "parent", comments: [2, 3] });
  store.load(App.Comment, { id: 2, body: "child", post: 1 });
  store.load(App.Comment, { id: 3, body: "child", post: 1 });

  var post = store.find(App.Post, 1),
      comment1 = store.find(App.Comment, 2),
      comment2 = store.find(App.Comment, 3);

  post.get('comments').removeObject(comment1);
  verifySynchronizedOneToMany(post, comment2);
  equal(comment1.get('post'), null, "belongsTo relationship has been set to null");
});

test("When adding a record to a hasMany array, it should be removed from its old hasMany array, if there was one", function() {
  store.load(App.Post, { id: 1, title: "old parent", comments: [3] });
  store.load(App.Post, { id: 2, title: "new parent" });

  store.load(App.Comment, { id: 3, body: "child", post: 1 });

  var oldParent = store.find(App.Post, 1),
      newParent = store.find(App.Post, 2),
      child = store.find(App.Comment, 3);

  verifySynchronizedOneToMany(oldParent, child);

  newParent.get('comments').addObject(child);

  deepEqual(oldParent.get('comments').toArray(), [], "old parent has no child comments");

  verifySynchronizedOneToMany(newParent, child);
});

test("When changing a record's belongsTo, it should be removed from its old inverse hasMany array, if there was one", function() {
  store.load(App.Post, { id: 1, title: "old parent", comments: [3] });
  store.load(App.Post, { id: 2, title: "new parent" });

  store.load(App.Comment, { id: 3, body: "child", post: 1 });

  var oldParent = store.find(App.Post, 1),
      newParent = store.find(App.Post, 2),
      child = store.find(App.Comment, 3);

  verifySynchronizedOneToMany(oldParent, child);

  child.set('post', newParent);

  deepEqual(oldParent.get('comments').toArray(), [], "old parent has no child comments");

  verifySynchronizedOneToMany(newParent, child);
});

test("Deleting a record removes it from any inverse hasMany arrays to which it belongs.", function() {
  var post, comment;

  store.load(App.Post, { id: 1, title: "parent", comments: [1] });
  store.load(App.Comment, { id: 1, title: "parent", post: 1 });

  post = store.find(App.Post, 1);
  comment = store.find(App.Comment, 1);

  verifySynchronizedOneToMany(post, comment);

  comment.deleteRecord();

  equal(comment.get('post'), null, "the comment should no longer belong to a post");
  deepEqual(post.get('comments').toArray(), [], "the post should no longer have any comments");
});

test("Deleting a newly created record removes it from any inverse hasMany arrays to which it belongs.", function() {
  var post, comment;

  store.load(App.Post, { id: 1, title: "parent" });

  post = store.find(App.Post, 1);
  comment = store.createRecord(App.Comment);

  equal(comment.get('post'), null, "precond - the child should not yet belong to anyone");

  post.get('comments').addObject(comment);

  verifySynchronizedOneToMany(post, comment);

  comment.deleteRecord();

  equal(comment.get('post'), null, "the comment should no longer belong to a post");
  deepEqual(post.get('comments').toArray(), [], "the post should no longer have any comments");
});

//test("When a record with a hasMany relationship is deleted, its associated record is materialized and its belongsTo is changed", function() {
  //store.load(App.Post, { id: 1, title: "NEW! Ember Table", comments: [ 2 ] });
  //store.load(App.Comment, { id: 2, body: "Needs more async", post: 1 });

  //// Only find the post, not the comment. This ensures
  //// that the comment is not yet materialized.
  //var post = store.find(App.Post, 1);
  //var comment = store.find(App.Comment, 2);
  //post.deleteRecord();

  //// Now that we've deleted the post, we should materialize the
  //// comment and ensure that its inverse relationship has been
  //// modified appropriately (i.e., set to null)
  //equal(comment.get('post'), null, "the comment's post belongsTo relationship was set to null");
//});
