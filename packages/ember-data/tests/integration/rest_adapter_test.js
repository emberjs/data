var store, adapter, Post, Comment;

//module("REST Adapter", {
  //setup: function() {
    //adapter = DS.RESTAdapter.create();
    //store = DS.Store.create({
      //adapter: adapter
    //});

    //Post = DS.Model.extend();

    //Comment = DS.Model.extend({
      //body: DS.attr('string'),
      //post: DS.belongsTo(Post)
    //});

    //Post.reopen({
      //title: DS.attr('string'),
      //comments: DS.hasMany(Comment)
    //});
  //},

  //teardown: function() {
    //adapter.destroy();
    //store.destroy();
  //}
//});

//test("a parent record in a changed relationship should not get committed to the server if nothing else has changed, but a child should", function() {
  //expect(3);

  //store.load(Post, { id: 1, title: "First Post" });
  //store.load(Comment, { id: 2, body: "FIRST" });

  //var post = store.find(Post, 1),
      //comment = store.find(Comment, 2);

  //post.get('comments').addObject(comment);

  //adapter.ajax = function(url, type, hash) {
    //equal(url, '/comments/2');
    //equal(type, 'PUT');
    //equal(hash, { body: "FIRST", post_id: 1 });
  //};

  //store.commit();
//});
