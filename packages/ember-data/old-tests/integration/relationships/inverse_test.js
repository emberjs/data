var get = Ember.get, set = Ember.set;

var store, adapter, App, Post, Comment;

module("Inverse test", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    }); 

    App = Ember.Namespace.create({
      toString: function() { return "App"; }
    }); 
  },  

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    }); 
  }
});

test("One to one relationships should be identified correctly", function() {

  App.Post = DS.Model.extend({
    title: DS.attr('string')
  }); 

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.belongsTo(App.Post)
  }); 

  App.Post.reopen({
    comment: DS.belongsTo(App.Comment)
  });

  var type = DS.RelationshipChange.determineRelationshipType(App.Post, {key: "comment", kind: "belongsTo"});
 
  equal(type, "oneToOne", "Relationship type is oneToOne");
});

test("One to many relationships should be identified correctly", function() {

  App.Post = DS.Model.extend({
    title: DS.attr('string')
  }); 

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.hasMany(App.Post)
  }); 

  App.Post.reopen({
    comment: DS.belongsTo(App.Comment)
  });

  var type = DS.RelationshipChange.determineRelationshipType(App.Post, {key: "comment", kind: "belongsTo"});
 
  equal(type, "oneToMany", "Relationship type is oneToMany");
});

test("Many to one relationships should be identified correctly", function() {

  App.Post = DS.Model.extend({
    title: DS.attr('string')
  }); 

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.hasMany(App.Post)
  }); 

  App.Post.reopen({
    comment: DS.belongsTo(App.Comment)
  });

  var type = DS.RelationshipChange.determineRelationshipType(App.Comment, {key: "post", kind: "hasMany"});
 
  equal(type, "manyToOne", "Relationship type is manyToOne");
});

test("Many to many relationships should be identified correctly", function() {

  App.Post = DS.Model.extend({
    title: DS.attr('string')
  }); 

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.hasMany(App.Post)
  }); 

  App.Post.reopen({
    comment: DS.belongsTo(App.Comment)
  });

  var type = DS.RelationshipChange.determineRelationshipType(App.Post, {key: "comment", kind: "hasMany"});
 
  equal(type, "manyToMany", "Relationship type is manyTomany");
});

test("Many to none relationships should be identified correctly", function() {

  App.Post = DS.Model.extend({
    title: DS.attr('string')
  }); 

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.hasMany(App.Post)
  }); 

  var type = DS.RelationshipChange.determineRelationshipType(App.Comment, {key: "post", kind: "hasMany"});
 
  equal(type, "manyToNone", "Relationship type is manyToNone");
});

test("One to none relationships should be identified correctly", function() {

  App.Post = DS.Model.extend({
    title: DS.attr('string')
  }); 

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.belongsTo(App.Post)
  }); 

  var type = DS.RelationshipChange.determineRelationshipType(App.Comment, {key: "post", kind: "belongsTo"});
 
  equal(type, "oneToNone", "Relationship type is oneToNone");
});

test("A many relationship's inverse can be looked up", function() {
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

  deepEqual(App.Post.inverseFor('comments'), {
    kind: 'belongsTo',
    type: App.Comment,
    name: 'post'
  }, "correct inverse descriptor was returned");

  deepEqual(App.Comment.inverseFor('post'), {
    kind: 'hasMany',
    type: App.Post,
    name: 'comments'
  });
});

test("A many relationship's inverse can be looked up when it is part of a class hierarchy", function() {
  App.Post = DS.Model.extend({
    title: DS.attr('string')
  });

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    post: DS.belongsTo(App.Post)
  });

  App.ChildComment = App.Comment.extend();

  App.Post.reopen({
    comments: DS.hasMany(App.Comment)
  });

  deepEqual(App.ChildComment.inverseFor('post'), {
    kind: 'hasMany',
    type: App.Post,
    name: 'comments'
  }, "correct inverse descriptor was returned");
});
