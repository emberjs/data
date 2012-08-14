var store, Comment, Post;

module("Rolling back transactions", {
  setup: function() {
    store = DS.Store.create();

    Post = DS.Model.extend({
      title: DS.attr('string')
    });

    Comment = DS.Model.extend({
      title: DS.attr('string'),
      post: DS.belongsTo(Post)
    });

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

  window.billy = true;
  transaction.rollback();

  ok(!post.get('isDirty'), "record should not be dirty after rollback");
  ok(!comment1.get('isDirty'), "record should not be dirty after rollback");

  equal(comment1.get('post'), post, "property is rolled back to its original value");
  deepEqual(post.get('comments').toArray(), [ comment1, comment2 ], "property is rolled back to its original value");
});
//test("A loaded record in a transaction with a changed hasMany should revert to the old relationship when the transaction is rolled back.");

//test("A created record in a transaction with changed attributes should revert to the old attributes when the transaction is rolled back.");
//test("A created record in a transaction with a changed belongsTo should revert to the old relationship when the transaction is rolled back.");
//test("A created record in a transaction with a changed hasMany should revert to the old relationship when the transaction is rolled back.");

//test("A deleted record in a transaction with changed attributes should revert to the old attributes when the transaction is rolled back.");
//test("A deleted record in a transaction with a changed belongsTo should revert to the old relationship when the transaction is rolled back.");
//test("A deleted record in a transaction with a changed hasMany should revert to the old relationship when the transaction is rolled back.");
