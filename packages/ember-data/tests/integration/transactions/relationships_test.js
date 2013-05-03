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

function expectRelationships(descriptions) {
  var relationships = transaction.get('relationships').toArray();

  equal(relationships.length, descriptions.length, "incorrect number of relationships");

  for(var i = 0; i < descriptions.length; i++) {
    var description = descriptions[i];
    var relationship;
    // no guarantees on ordering so we loop over all
    for(var j = 0; i < relationships.length; j++) {
      var r = relationships[j];
      if(description.firstRecord === r.getFirstRecord() &&
        description.secondRecord === r.getSecondRecord() &&
        description.firstRecordName === r.getFirstRecordName() &&
        description.secondRecordName === r.getSecondRecordName()) {
        relationship = r;
        break;
      }
    }
    ok(relationship, "relationship should be present");
    equal(
      store.relationshipChangeFor(
        description.firstRecord.get('_reference'),
        description.firstRecordName,
        description.secondRecord.get('_reference'),
        description.secondRecordName
      ), relationship, "store should be tracking relationship"
    );
  }

}

test("adding a new child to the many side of a manyToOne should create a change", function() {
  store.load(Post, { id: 1, title: "Ohai", body: "FIRST POST ZOMG" });

  transaction = store.get('defaultTransaction');

  var post = store.find(Post, 1);
  var comment = post.get('comments').createRecord({body: 'rels'});

  expectRelationships(
    [{firstRecord: comment, firstRecordName: 'post', secondRecord: post, secondRecordName: 'comments'}]
  );
});

test("adding a child to the one side of a manyToOne should create a change", function() {
  store.load(Post, { id: 1, title: "Ohai", body: "FIRST POST ZOMG" });

  transaction = store.get('defaultTransaction');

  var post = store.find(Post, 1);
  var comment = store.createRecord(Comment, {
    body: 'rels',
    post: post
  });

  expectRelationships(
    [{firstRecord: comment, firstRecordName: 'post', secondRecord: post, secondRecordName: 'comments'}]
  );
});

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
    [{firstRecord: comment, firstRecordName: 'post', secondRecord: post, secondRecordName: 'comments'}]
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
    [{firstRecord: comment, firstRecordName: 'post', secondRecord: post, secondRecordName: 'comments'}]
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

  expectRelationships([]);
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

  expectRelationships([
    {firstRecord: comment, firstRecordName: 'post', secondRecord: post, secondRecordName: 'comments'},
    {firstRecord: comment, firstRecordName: 'post', secondRecord: post3, secondRecordName: 'comments'}
  ]);
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
