var store, Comment, Post;

module("Transaction Rollback", {
  setup: function() {
    store = DS.Store.create({ adapter: 'DS.Adapter' });

    Post = DS.Model.extend({
      title: DS.attr('string')
    });

    Post.toString = function() { return "Post"; };

    Comment = DS.Model.extend({
      title: DS.attr('string'),
      post: DS.belongsTo(Post)
    });

    Comment.toString = function() { return "Comment"; };

    Post.reopen({
      comments: DS.hasMany(Comment)
    });
  },

  teardown: function() {
    store.destroy();
  }
});

// Loaded Records

var testSetAndRollback = function(record, property, newValue, callback) {
  var oldValue = record.get(property);

  var transaction = store.transaction();
  transaction.add(record);

  ok(!record.get('isDirty'), "precond - record should not yet be dirty");

  record.set(property, newValue);

  ok(record.get('isDirty'), "precond - record should be dirty after change");
  equal(record.get(property), newValue, "precond - property reflects changed value");

  transaction.rollback();

  ok(!record.get('isDirty'), "record is not dirty after rollback");

  equal(record.get(property), oldValue, "property is rolled back to original value");
  if (callback) { callback(); }
};

test("A loaded record in a transaction with changed attributes should revert to the old attributes when the transaction is rolled back.", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies" });

  var post = store.find(Post, 1);

  testSetAndRollback(post, 'title', "Developing Interplanetary-Scale Apps");
});

test("A loaded record that is deleted and then rolled back is not dirty.", function() {
  store.load(Post, { id: 1, title: "MongoDB on Mars" });

  var post = store.find(Post, 1);
  var transaction = store.transaction();

  transaction.add(post);

  post.deleteRecord();
  ok(post.get('isDirty'), "record is dirty");
  ok(post.get('isDeleted'), "record is deleted");

  transaction.rollback();
  ok(!post.get('isDirty'), "record is not dirty");
  ok(!post.get('isDeleted'), "record is not deleted");
});

// UPDATED

test("A loaded record in a transaction with a changed belongsTo should revert to the old relationship when the transaction is rolled back. (A=>null)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 1, 2 ] });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it.", post: 1 });

  var post = store.find(Post, 1);
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  comment1.set('post', null);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), null, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed belongsTo should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies" });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails" });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it." });

  var post = store.find(Post, 1);
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, null, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ ], "precond - the original value is an empty array");

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  comment1.set('post', post);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), null, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ ], "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed belongsTo should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 1, 2 ] });
  store.load(Post, { id: 2, title: "VIM for iPad Best Practices" });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it.", post: 1 });

  var post = store.find(Post, 1);
  var post2 = store.find(Post, 2);
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, post, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "precond - the original value is a list of comments");

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  comment1.set('post', post2);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(post2.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post2, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "precond - property reflects changed value");
  deepEqual(post2.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!post2.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed hasMany should revert to the old relationship when the transaction is rolled back. (A=>null)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 1, 2 ] });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it.", post: 1 });

  var post = store.find(Post, 1);
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  post.get('comments').removeObject(comment1);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), null, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed hasMany should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies" });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails" });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it." });

  var post = store.find(Post, 1);
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, null, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ ], "precond - the original value is an empty array");

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  post.get('comments').addObject(comment1);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), null, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ ], "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed hasMany should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 1, 2 ] });
  store.load(Post, { id: 2, title: "VIM for iPad Best Practices" });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it.", post: 1 });

  var post = store.find(Post, 1);
  var post2 = store.find(Post, 2);
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, post, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "precond - the original value is a list of comments");

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  post.get('comments').removeObject(comment1);
  post2.get('comments').addObject(comment1);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(post2.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post2, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "precond - property reflects changed value");
  deepEqual(post2.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!post2.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed hasMany (without first removing) should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 1, 2 ] });
  store.load(Post, { id: 2, title: "VIM for iPad Best Practices" });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it.", post: 1 });

  var post = store.find(Post, 1);
  var post2 = store.find(Post, 2);
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, post, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "precond - the original value is a list of comments");

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  post2.get('comments').addObject(comment1);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(post2.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post2, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "precond - property reflects changed value");
  deepEqual(post2.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!post2.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "property is rolled back to its original value");
});

// CREATED - Changing belongsTo

test("A created record in a transaction with a changed belongsTo (child is newly created, but parent is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 2 ] });
  store.load(Comment, { id: 2, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });

  var transaction = store.transaction();

  var post = store.find(Post, 1);
  var comment1 = transaction.createRecord(Comment, { title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails" });
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, null, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "precond - the original value is a list of comments");

  transaction.add(post);

  comment1.set('post', post);
  equal(comment1.get('post'), post, "precond - the new value is the post");
  deepEqual(post.get('comments').toArray(), [ comment2, comment1 ], "precond - the new value is a list of comments");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(comment1.get('isDirty'), "precond - record should be dirty");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), null, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed belongsTo (parent is newly created, but child is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  var transaction = store.transaction();

  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails" });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it." });

  var post = transaction.createRecord(Post, { title: "My Darkest Node.js Fantasies" });
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, null, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ ], "precond - the original value is an empty array");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  comment1.set('post', post);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), null, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ ], "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed belongsTo (parent and child are both newly created) should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
  var transaction = store.transaction();

  var post = transaction.createRecord(Post, { title: "My Darkest Node.js Fantasies" });
  var comment1 = transaction.createRecord(Comment, { title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails" });

  var oldValue = comment1.get('post');

  equal(oldValue, null, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ ], "precond - the original value is an empty list of comments");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(comment1.get('isDirty'), "precond - record should be dirty");

  comment1.set('post', post);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), null, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ ], "property is rolled back to its original value");
});

// CREATED - Changing hasMany

test("A created record in a transaction with a changed hasMany (child is newly created, but parent is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 2 ] });
  store.load(Comment, { id: 2, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });

  var transaction = store.transaction();

  var post = store.find(Post, 1);
  var comment1 = transaction.createRecord(Comment, { title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails" });
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, null, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "precond - the original value is a list of comments");

  transaction.add(post);

  post.get('comments').addObject(comment1);

  equal(comment1.get('post'), post, "precond - the new value is the post");
  deepEqual(post.get('comments').toArray(), [ comment2, comment1 ], "precond - the new value is a list of comments");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(comment1.get('isDirty'), "precond - record should be dirty");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), null, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "property is rolled back to its original value");
});

test("A created record in a transaction with a changed belongsTo (parent is newly created, but child is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  var transaction = store.transaction();

  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails" });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it." });

  var post = transaction.createRecord(Post, { title: "My Darkest Node.js Fantasies" });
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  equal(oldValue, null, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ ], "precond - the original value is an empty array");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  post.get('comments').addObject(comment1);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), null, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ ], "property is rolled back to its original value");
});

test("A created record in a transaction with a changed belongsTo (parent and child are both newly created) should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
  var transaction = store.transaction();

  var post = transaction.createRecord(Post, { title: "My Darkest Node.js Fantasies" });
  var comment1 = transaction.createRecord(Comment, { title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails" });

  var oldValue = comment1.get('post');

  equal(oldValue, null, "precond - the original value is null");
  deepEqual(post.get('comments').toArray(), [ ], "precond - the original value is an empty list of comments");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(comment1.get('isDirty'), "precond - record should be dirty");

  post.get('comments').addObject(comment1);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), post, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment1 ], "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), null, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ ], "property is rolled back to its original value");
});

// DELETED

test("A deleted record should be restored to a hasMany relationship if the transaction is rolled back", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 1, 2 ] });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });
  store.load(Comment, { id: 2, title: "I was skeptical about http://App.net before I paid the $$, but now I am all excited about it.", post: 1 });

  var post = store.find(Post, 1);
  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var oldValue = comment1.get('post');

  var transaction = store.transaction();
  transaction.add(post);
  transaction.add(comment1);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  comment1.deleteRecord();

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), null, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ comment2 ], "precond - deleted record is removed from parent's hasMany");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "property is rolled back to its original value");
});

test("A deleted record should be restored to a belongsTo relationship if the transaction is rolled back", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 1 ] });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });

  var post = store.find(Post, 1);
  var comment1 = store.find(Comment, 1);

  var oldValue = comment1.get('post');

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  post.deleteRecord();

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), null, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ ], "precond - deleted record is removed from parent's hasMany");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1 ], "property is rolled back to its original value");
});

test("A deleted record should be restored to a belongsTo relationship if the transaction is rolled back", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", comments: [ 1 ] });
  store.load(Comment, { id: 1, title: "I don't see the appeal of Rails these days when Node.js and Django are both as mature and inherently more scalable than Rails", post: 1 });

  var post = store.find(Post, 1);
  var comment1 = store.find(Comment, 1);

  var oldValue = comment1.get('post');

  var transaction = store.transaction();
  transaction.add(post);
  transaction.add(comment1);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!comment1.get('isDirty'), "precond - record should not yet be dirty");

  post.deleteRecord();
  comment1.deleteRecord();

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(comment1.get('isDirty'), "precond - record should be dirty after change");

  equal(comment1.get('post'), null, "precond - property reflects changed value");
  deepEqual(post.get('comments').toArray(), [ ], "precond - deleted record is removed from parent's hasMany");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1 ], "property is rolled back to its original value");
});

//test("A deleted record in a transaction with changed attributes should revert to the old attributes when the transaction is rolled back.");
//test("A deleted record in a transaction with a changed belongsTo should revert to the old relationship when the transaction is rolled back.");
//test("A deleted record in a transaction with a changed hasMany should revert to the old relationship when the transaction is rolled back.");
