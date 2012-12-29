/*global QUnit*/

var Post = DS.Model.extend({
  title: DS.attr('string'),
  body: DS.attr('string')
});

var Comment = DS.Model.extend({
  body: DS.attr('string'),
  post: DS.belongsTo(Post)
});

Post.reopen({
  comments: DS.hasMany(Comment)
});

var store, adapter, transaction;

module("Transactions and Relationships", {
  setup: function() {
    adapter = DS.Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });
  },

  teardown: function() {
    if (transaction) { transaction.destroy(); }
    adapter.destroy();
    store.destroy();
  }
});

function expectRelationships(description) {
  var relationships = transaction.get('relationships').toArray(),
      relationship = relationships[0],
      count = description.count === undefined ? description.length : description.count;

  if(description.count === undefined && (!description[0] || !description[1])){
    count = 1;
  }
  QUnit.push(relationships.length === count, relationships.length, count, "There should be " + count + " dirty relationships");

  if (count) {
    if(description[0]){
      QUnit.push(relationships[0].getSecondRecord() === description[0].parent, relationships[0].getSecondRecord(), description[0].parent, "oldParent is incorrect");
      QUnit.push(relationships[0].getFirstRecord() === description[0].child, relationships[0].child, description[0].child, "child in relationship 0 is incorrect");
    }
    if(description[1]){
      var relPosition = count === 2 ? 1 : 0;
      QUnit.push(relationships[relPosition].getFirstRecord() === description[1].child, relationships[relPosition].child, description[1].child, "child in relationship 1 is incorrect");
      QUnit.push(relationships[relPosition].getSecondRecord() === description[1].parent, relationships[relPosition].parent, description[1].parent, "newParent is incorrect");
    }
  }
}

test("If both the parent and child are clean and in the same transaction, a dirty relationship is added to the transaction null->A", function() {
  store.load(Post, { id: 1, title: "Ohai", body: "FIRST POST ZOMG" });
  store.load(Comment, { id: 1, body: "Kthx" });

  var post = store.find(Post, 1);
  var comment = store.find(Comment, 1);

  transaction = store.transaction();

  transaction.add(post);
  transaction.add(comment);

  post.get('comments').pushObject(comment);

  expectRelationships(
    [null,{parent: post, child: comment}]
  );
});

test("If a child is removed from a parent, a dirty relationship is added to the transaction A->null", function() {
  store.load(Comment, { id: 1, body: "Kthx" });
  store.load(Post, { id: 1, title: "Ohai", body: "FIRST POST ZOMG", comments: [ 1 ] });

  var post = store.find(Post, 1);
  var comment = store.find(Comment, 1);

  transaction = store.transaction();

  transaction.add(post);
  transaction.add(comment);

  post.get('comments').removeObject(comment);

  expectRelationships(
    [{parent: post,
      child: comment}]
  );
});

test("If a child is removed from a parent it was recently added to, the dirty relationship is removed. null->A, A->null", function() {
  store.load(Comment, { id: 1, body: "Kthx" });
  store.load(Post, { id: 1, title: "Ohai", body: "FIRST POST ZOMG", comments: [ 1 ] });

  var post = store.find(Post, 1);
  var comment = store.find(Comment, 1);

  transaction = store.transaction();

  transaction.add(post);
  transaction.add(comment);

  post.get('comments').removeObject(comment);
  post.get('comments').pushObject(comment);

  expectRelationships({ count: 0 });
});

test("If a child was added to one parent, and then another, the changes coalesce. A->B, B->C", function() {
  store.load(Comment, { id: 1, body: "Kthx" });
  store.load(Post, { id: 1, title: "Ohai", body: "FIRST POST ZOMG", comments: [ 1 ] });
  store.load(Post, { id: 2, title: "ZOMG", body: "SECOND POST WAT" });
  store.load(Post, { id: 3, title: "ORLY?", body: "Why am I still here?" });

  var post = store.find(Post, 1);
  var post2 = store.find(Post, 2);
  var post3 = store.find(Post, 3);
  var comment = store.find(Comment, 1);

  transaction = store.transaction();

  transaction.add(post);
  transaction.add(comment);

  post.get('comments').removeObject(comment);
  post2.get('comments').pushObject(comment);
  post2.get('comments').removeObject(comment);
  post3.get('comments').pushObject(comment);

  expectRelationships([{parent:post, child:comment},{parent:post3, child:comment}]);
});

test("the store should have a new defaultTransaction after commit from store", function() {
  store.load(Post, { id: 1, title: "Ohai" });

  var record = store.find(Post, 1);
  var transaction = record.get('transaction');
  var defaultTransaction = store.get('defaultTransaction');

  equal(transaction, defaultTransaction, 'record is in the defaultTransaction');

  store.commit();

  var newDefaultTransaction = store.get('defaultTransaction');
  transaction = record.get('transaction');

  ok(defaultTransaction !== newDefaultTransaction, "store should have a new defaultTransaction");
  equal(transaction, newDefaultTransaction, 'record is in the new defaultTransaction');
});

test("the store should have a new defaultTransaction after commit from defaultTransaction", function() {
  store.load(Post, { id: 1, title: "Ohai" });

  var record = store.find(Post, 1);
  var transaction = record.get('transaction');
  var defaultTransaction = store.get('defaultTransaction');

  equal(transaction, defaultTransaction, 'record is in the defaultTransaction');

  defaultTransaction.commit();

  var newDefaultTransaction = store.get('defaultTransaction');
  transaction = record.get('transaction');

  ok(defaultTransaction !== newDefaultTransaction, "store should have a new defaultTransaction");
  equal(transaction, newDefaultTransaction, 'record is in the new defaultTransaction');
});

test("the store should have a new defaultTransaction after commit from record's transaction", function() {
  store.load(Post, { id: 1, title: "Ohai" });

  var record = store.find(Post, 1);
  var transaction = record.get('transaction');
  var defaultTransaction = store.get('defaultTransaction');

  equal(transaction, defaultTransaction, 'record is in the defaultTransaction');

  transaction.commit();

  var newDefaultTransaction = store.get('defaultTransaction');
  transaction = record.get('transaction');

  ok(defaultTransaction !== newDefaultTransaction, "store should have a new defaultTransaction");
  equal(transaction, newDefaultTransaction, 'record is in the new defaultTransaction');
});
