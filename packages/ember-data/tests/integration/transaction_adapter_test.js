var transaction, adapter, store, Post, Comment;

module("DS.Transaction and DS.Adapter Integration", {
  setup: function() {
    adapter = DS.Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    transaction = store.transaction();

    Post = DS.Model.extend();
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      post: DS.belongsTo(Post)
    });

    Post.reopen({
      comments: DS.hasMany(Comment)
    });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
    transaction.destroy();
    Post = null;
    Comment = null;
  }
});

//test("adding a clean record to a relationship causes it to be passed as an updated record", function() {
  //var post, comment;

  //adapter.commit = async(function(store, records, relationships) {
    //var relationship = {
      //child: comment,
      //oldParent: post1,
      //newParent: post2
    //};

    //ok(records.updated.indexOf(comment) >= 0, "The comment is in the updated list");
    //ok(records.updated.indexOf(post1) >= 0, "The old post is in the updated list");
    //ok(records.updated.indexOf(post2) >= 0, "The new post is in the updated list");

    //deepEqual(relationships.byChild.get(comment), [ relationship ]);
    //deepEqual(relationships.byOldParent.get(post1), [ relationship ]);
    //deepEqual(relationships.byNewParent.get(post2), [ relationship ]);

    //raises(function() {
      //comment.set('body', "NOPE! CHUCK TESTA!");
    //});

    //setTimeout(async(function() {
      //store.didUpdateRecord(comment);
      //store.didUpdateRecord(post1);
      //store.didUpdateRecord(post2);

      //var defaultTransaction = store.get('defaultTransaction');

      //equal(comment.get('transaction'), defaultTransaction);
      //equal(post1.get('transaction'), defaultTransaction);
      //equal(post2.get('transaction'), defaultTransaction);
    //}), 1);
  //});

  //store.load(Comment, { id: 1 });
  //store.load(Post, { id: 1, comments: [ 1 ] });
  //store.load(Post, { id: 2 });

  //comment = store.find(Comment, 1);
  //var post1 = store.find(Post, 1);
  //var post2 = store.find(Post, 2);

  //transaction.add(comment);
  //transaction.add(post1);
  //transaction.add(post2);

  //post1.get('comments').removeObject(comment);
  //post2.get('comments').addObject(comment);

  //transaction.commit();

  //equal(comment.get('transaction'), transaction);
//});
