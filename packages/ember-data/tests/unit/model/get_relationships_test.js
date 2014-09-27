var Author, Post, author, post;
module("unit/model/get_relationships - DS.Model", {
  setup: function() {
    Author = DS.Model.extend({
      name: DS.attr('string'),
      posts: DS.hasMany(Post)
    });

    Post = DS.Model.extend({
      title: DS.attr('string'),
      author: DS.belongsTo(Author)
    });

    env = setupStore({
      author: Author,
      post: Post
    });

    store = env.store;

    author = store.createRecord(Author, {name: 'Igor Terzic'}),
      post = store.createRecord(Post, {title: 'The post', author: author});
  }
});

test("getRelationships returns belongsTo relationships in a RSVP.hash", function() {
  post.getRelationships().then(async(function(relations){
    deepEqual(relations.author, author, 'Hash with belongsTo relations was returned');
  }));
});

test("getRelationships returns hasMany relationships in a RSVP.hash", function() {
  author.getRelationships().then(async(function(relations){
    deepEqual(relations.posts.content[0], post, 'Hash with hasMany relations was returned');
  }));
});

test("getRelationships returns hasMany and belongsTo relationships in a RSVP.hash", function() {
  Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.belongsTo(Post)
  });

  Post.reopen({
    title: DS.attr('string'),
    author: DS.belongsTo(Author),
    comments: DS.hasMany(Comment)
  });

  var post = store.createRecord(Post, {title: 'The post', author: author}),
    comment = store.createRecord(Comment, {body: 'Comment', post: post});

  post.getRelationships().then(async(function(relations){
    deepEqual(relations.author, author, 'Hash with belongsTo relations was returned');
    deepEqual(relations.comments.content[0], comment, 'Hash with hasMany relations was returned');
  }));
});

test("getRelationships receives relationships names and returns them", function() {
  Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.belongsTo(Post)
  });

  Post.reopen({
    title: DS.attr('string'),
    author: DS.belongsTo(Author),
    comments: DS.hasMany(Comment)
  });

  var post = store.createRecord(Post, {title: 'The post', author: author}),
    comment = store.createRecord(Comment, {body: 'Comment', post: post});

  post.getRelationships(['comments']).then(async(function(relations){
    deepEqual(relations.author, undefined, 'Hash did not have relationship that was not passed in');
    deepEqual(relations.comments.content[0], comment, 'Hash has relationship that was passed in');
  }));
});
