/*global QUnit*/

var store, adapter, transaction;

module("Transactions and multistage commit", {
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


Comment.toString = function () { return 'Comment'; };
Post.toString = function () { return 'Post'; };

test("Commits new record with relations in stages", function() {
  var postIdOfComment;
  adapter.createRecord = function(store, type, record) {
    var json = this.serialize(record, { includeId: true });
    record.createRecordTestCallback(json);
    var jsonWithRoot = {}
    jsonWithRoot[this.serializer.rootForType(type)] = json
    Ember.run.later(this, function(){
      this.didCreateRecord(store, type, record, jsonWithRoot);
    }, 1);
  };

  var transaction = store.transaction();
  var post = transaction.createRecord(Post, {
    title: "Ohai",
    body: "FIRST POST ZOMG",
  });

  post.createRecordTestCallback = function(json) {
    json.id = 'post_id';
  };

  var comment = transaction.createRecord(Comment, {
    body: "Kthx",
    post: post
  });

  comment.createRecordTestCallback = function(json) {
    json.id = 'comment_id';
    equal(json.post, 'post_id', 'comment is saved with the correct post id');
  };


  var postSaved, commentSaved;
  post.one('didCreate', function () {
    ok(true, 'post is saved')
    postSaved = true;
    if (postSaved && commentSaved) start();
  });

  comment.one('didCreate', function () {
    ok(true, 'comment is saved')
    commentSaved = true;
    if (postSaved && commentSaved) start();
  });

  transaction.commit();
  stop();
});
