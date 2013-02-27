var store, Comment, Post, Attachment;

module("Transaction Rollback", {
  setup: function() {
    store = DS.Store.create({ adapter: 'DS.Adapter' });

    Post = DS.Model.extend();
    Attachment = DS.Model.extend();
    Comment = DS.Model.extend();

    Post.reopen({
      title: DS.attr('string'),
      comments: DS.hasMany(Comment),
      attachment: DS.hasOne(Attachment)
    });
    Post.toString = function() { return "Post"; };

    Comment.reopen({
      title: DS.attr('string'),
      post: DS.belongsTo(Post)
    });
    Comment.toString = function() { return "Comment"; };

    Attachment.reopen({
      url: DS.attr('string'),
      post: DS.belongsTo(Post)
    });
    Attachment.toString = function() { return "Attachment"; };
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

// UPDATED - belongsTo (for a hasMany)

test("A loaded record in a transaction with a changed belongsTo (for a hasMany) should revert to the old relationship when the transaction is rolled back. (A=>null)", function() {
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

test("A loaded record in a transaction with a changed belongsTo (for a hasMany) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
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

test("A loaded record in a transaction with a changed belongsTo (for a hasMany) should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
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

// UPDATED - belongsTo (for a hasOne)

test("A loaded record in a transaction with a changed belongsTo (for a hasOne) should revert to the old relationship when the transaction is rolled back. (A=>null)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", attachment: 1 });
  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3", post: 1 });

  var post = store.find(Post, 1);
  var attachment = store.find(Attachment, 1);

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!attachment.get('isDirty'), "precond - record should not yet be dirty");

  attachment.set('post', null);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(post.get('attachment'), null, "precond - property reflects changed value");
  equal(attachment.get('post'), null, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), attachment, "property is rolled back to its original value");
  equal(attachment.get('post'), post, "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed belongsTo (for a hasOne) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies" });
  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3" });

  var post = store.find(Post, 1);
  var attachment = store.find(Attachment, 1);

  equal(post.get('attachment'), null, "precond - the original value is null");
  equal(attachment.get('post'), null, "precond - the original value is null");

  var transaction = store.transaction();
  transaction.add(attachment);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!attachment.get('isDirty'), "precond - record should not yet be dirty");

  attachment.set('post', post);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(post.get('attachment'), attachment, "precond - property reflects changed value");
  equal(attachment.get('post'), post, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), null, "property is rolled back to its original value");
  equal(attachment.get('post'), null, "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed belongsTo (for a hasOne) should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", attachment: 1 });
  store.load(Post, { id: 2, title: "VIM for iPad Best Practices" });
  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3", post: 1 });

  var post1 = store.find(Post, 1);
  var post2 = store.find(Post, 2);
  var attachment = store.find(Attachment, 1);

  equal(post1.get('attachment'), attachment, "precond - the original value is the attachment");
  equal(post2.get('attachment'), null, "precond - the original value is null");
  equal(attachment.get('post'), post1, "precond - the original value is the first post");

  var transaction = store.transaction();
  transaction.add(attachment);

  ok(!post1.get('isDirty'), "precond - record should not yet be dirty");
  ok(!post2.get('isDirty'), "precond - record should not yet be dirty");
  ok(!attachment.get('isDirty'), "precond - record should not yet be dirty");

  attachment.set('post', post2);

  ok(post1.get('isDirty'), "precond - record should be dirty after change");
  ok(post2.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(post1.get('attachment'), null, "precond - property reflects changed value");
  equal(post2.get('attachment'), attachment, "precond - property reflects changed value");
  equal(attachment.get('post'), post2, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post1.get('isDirty'), "record should not be dirty after rollback");
  ok(!post2.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(post1.get('attachment'), attachment, "property is rolled back to its original value");
  equal(post2.get('attachment'), null, "property is rolled back to its original value");
  equal(attachment.get('post'), post1, "property is rolled back to its original value");
});

// UPDATED - hasOne

test("A loaded record in a transaction with a changed hasOne should revert to the old relationship when the transaction is rolled back. (A=>null)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", attachment: 1 });
  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3", post: 1 });

  var post = store.find(Post, 1);
  var attachment = store.find(Attachment, 1);

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!attachment.get('isDirty'), "precond - record should not yet be dirty");

  post.set('attachment', null);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(post.get('attachment'), null, "precond - property reflects changed value");
  equal(attachment.get('post'), null, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), attachment, "property is rolled back to its original value");
  equal(attachment.get('post'), post, "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed hasOne should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies" });
  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3" });

  var post = store.find(Post, 1);
  var attachment = store.find(Attachment, 1);

  equal(attachment.get('post'), null, "precond - the original value is null");
  equal(post.get('attachment'), null, "precond - the original value is null");

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!attachment.get('isDirty'), "precond - record should not yet be dirty");

  post.set('attachment', attachment);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(attachment.get('post'), post, "precond - property reflects changed value");
  equal(post.get('attachment'), attachment, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(attachment.get('post'), null, "property is rolled back to its original value");
  equal(post.get('attachment'), null, "property is rolled back to its original value");
});

test("A loaded record in a transaction with a changed hasOne should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", attachment: 1 });

  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3", post: 1 });
  store.load(Attachment, { id: 2, url: "http://www.example.com/podcast/ep2.mp3" });

  var post = store.find(Post, 1);
  var attachment1 = store.find(Attachment, 1);
  var attachment2 = store.find(Attachment, 2);

  equal(post.get('attachment'), attachment1, "precond - the original value is the first attachment");
  equal(attachment1.get('post'), post, "precond - the original value is the post");
  equal(attachment2.get('post'), null, "precond - the original value is null");

  var transaction = store.transaction();
  transaction.add(post);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!attachment1.get('isDirty'), "precond - record should not yet be dirty");
  ok(!attachment2.get('isDirty'), "precond - record should not yet be dirty");

  post.set('attachment', attachment2);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment1.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment2.get('isDirty'), "precond - record should be dirty after change");

  equal(post.get('attachment'), attachment2, "precond - property reflects changed value");
  equal(attachment1.get('post'), null, "precond - property reflects changed value");
  equal(attachment2.get('post'), post, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment1.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment2.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), attachment1, "property is rolled back to its original value");
  equal(attachment1.get('post'), post, "property is rolled back to its original value");
  equal(attachment2.get('post'), null, "property is rolled back to its original value");
});

// UPDATED - hasMany

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

// CREATED - Changing belongsTo (for a hasMany)

test("A created record in a transaction with a changed belongsTo (for a hasMany) (child is newly created, but parent is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
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

test("A created record in a transaction with a changed belongsTo (for a hasMany) (parent is newly created, but child is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
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

test("A created record in a transaction with a changed belongsTo (for a hasMany) (parent and child are both newly created) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
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

// CREATED - Changing belongsTo (for a hasOne)

test("A created record in a transaction with a changed belongsTo (for a hasOne) (child is newly created, but parent is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies" });

  var transaction = store.transaction();

  var post = store.find(Post, 1);
  var attachment = transaction.createRecord(Attachment, { url: "http://www.example.com/podcast/ep1.mpe" });

  equal(post.get('attachment'), null, "precond - the original value is null");
  equal(attachment.get('post'), null, "precond - the original value is null");

  transaction.add(post);

  attachment.set('post', post);

  equal(post.get('attachment'), attachment, "precond - the new value is the attachment");
  equal(attachment.get('post'), post, "precond - the new value is the post");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(attachment.get('isDirty'), "precond - record should be dirty");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), null, "property is rolled back to its original value");
  equal(attachment.get('post'), null, "property is rolled back to its original value");
});

test("A created record in a transaction with a changed belongsTo (for a hasOne) (parent is newly created, but child is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  var transaction = store.transaction();

  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3" });

  var post = transaction.createRecord(Post, { title: "My Darkest Node.js Fantasies" });
  var attachment = store.find(Attachment, 1);

  equal(post.get('attachment'), null, "precond - the original value is null");
  equal(attachment.get('post'), null, "precond - the original value is null");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(!attachment.get('isDirty'), "precond - record should not yet be dirty");

  attachment.set('post', post);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(attachment.get('post'), post, "precond - property reflects changed value");
  equal(post.get('attachment'), attachment, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(attachment.get('post'), null, "property is rolled back to its original value");
  equal(post.get('attachment'), null, "property is rolled back to its original value");
});

test("A created record in a transaction with a changed belongsTo (for a hasOne) (parent and child are both newly created) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  var transaction = store.transaction();

  var post = transaction.createRecord(Post, { title: "My Darkest Node.js Fantasies" });
  var attachment = transaction.createRecord(Attachment, { url: "http://www.example.com/podcast/ep1.mp3" });

  equal(post.get('attachment'), null, "precond - the original value is null");
  equal(attachment.get('post'), null, "precond - the original value is null");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(attachment.get('isDirty'), "precond - record should be dirty");

  attachment.set('post', post);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(post.get('attachment'), attachment, "precond - property reflects changed value");
  equal(attachment.get('post'), post, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), null, "property is rolled back to its original value");
  equal(attachment.get('post'), null, "property is rolled back to its original value");
});

// CREATED - Changing hasMany

test("A created record in a transaction with a changed hasMany (child is newly created, but parent is not) should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
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

test("A created record in a transaction with a changed hasMany (parent is newly created, but child is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
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

test("A created record in a transaction with a changed hasMany (parent and child are both newly created) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
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

// CREATED - Changing hasOne

test("A created record in a transaction with a changed hasOne (child is newly created, but parent is not) should revert to the old relationship when the transaction is rolled back. (A=>B)", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", attachment: 2 });
  store.load(Attachment, { id: 2, url: "http://www.example.com/podcast/ep1.mp3", post: 1 });

  var transaction = store.transaction();

  var post = store.find(Post, 1);
  var attachment1 = store.find(Attachment, 2);
  var attachment2 = transaction.createRecord(Attachment, { url: "http://www.example.com/podcast/ep2.mp3" });

  equal(post.get('attachment'), attachment1, "precond - the original value is the existing attachment");
  equal(attachment1.get('post'), post, "precond - the original value is the post");
  equal(attachment2.get('post'), null, "precond - the original value is null");

  transaction.add(post);

  post.set('attachment', attachment2);

  equal(post.get('attachment'), attachment2, "precond - the new value is the new attachment");
  equal(attachment1.get('post'), null, "precond - the new value is null");
  equal(attachment2.get('post'), post, "precond - the new value is the post");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(attachment1.get('isDirty'), "precond - record should be dirty");
  ok(attachment2.get('isDirty'), "precond - record should be dirty");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment1.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment2.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), attachment1, "property is rolled back to its original value");
  equal(attachment1.get('post'), post, "property is rolled back to its original value");
  equal(attachment2.get('post'), null, "property is rolled back to its original value");
});

test("A created record in a transaction with a changed hasOne (parent is newly created, but child is not) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  var transaction = store.transaction();

  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3" });

  var post = transaction.createRecord(Post, { title: "My Darkest Node.js Fantasies" });
  var attachment = store.find(Attachment, 1);

  equal(post.get('attachment'), null, "precond - the original value is null");
  equal(attachment.get('post'), null, "precond - the original value is null");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(!attachment.get('isDirty'), "precond - record should not yet be dirty");

  post.set('attachment', attachment);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(post.get('attachment'), attachment, "precond - property reflects changed value");
  equal(attachment.get('post'), post, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), null, "property is rolled back to its original value");
  equal(attachment.get('post'), null, "property is rolled back to its original value");
});

test("A created record in a transaction with a changed hasOne (parent and child are both newly created) should revert to the old relationship when the transaction is rolled back. (null=>A)", function() {
  var transaction = store.transaction();

  var post = transaction.createRecord(Post, { title: "My Darkest Node.js Fantasies" });
  var attachment = transaction.createRecord(Attachment, { url: "http://www.example.com/podcast/ep1.mp3" });

  equal(post.get('attachment'), null, "precond - the original value is null");
  equal(attachment.get('post'), null, "precond - the original value is null");

  ok(post.get('isDirty'), "precond - record should be dirty");
  ok(attachment.get('isDirty'), "precond - record should be dirty");

  post.set('attachment', attachment);

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(post.get('attachment'), attachment, "precond - property reflects changed value");
  equal(attachment.get('post'), post, "precond - property reflects changed value");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(post.get('attachment'), null, "property is rolled back to its original value");
  equal(attachment.get('post'), null, "property is rolled back to its original value");
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

test("A deleted record should be restored to a hasOne relationship if the transaction is rolled back", function() {
  store.load(Post, { id: 1, title: "My Darkest Node.js Fantasies", attachment: 1 });
  store.load(Attachment, { id: 1, url: "http://www.example.com/podcast/ep1.mp3", post: 1 });

  var post = store.find(Post, 1);
  var attachment = store.find(Attachment, 1);

  var transaction = store.transaction();
  transaction.add(post);
  transaction.add(attachment);

  ok(!post.get('isDirty'), "precond - record should not yet be dirty");
  ok(!attachment.get('isDirty'), "precond - record should not yet be dirty");

  attachment.deleteRecord();

  ok(post.get('isDirty'), "precond - record should be dirty after change");
  ok(attachment.get('isDirty'), "precond - record should be dirty after change");

  equal(attachment.get('post'), null, "precond - property reflects changed value");
  equal(post.get('attachment'), null, "precond - deleted record is removed from parent's hasOne");

  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!attachment.get('isDirty'), "record should not be dirty after rollback");

  equal(attachment.get('post'), post, "property is rolled back to its original value");
  equal(post.get('attachment'), attachment, "property is rolled back to its original value");
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
