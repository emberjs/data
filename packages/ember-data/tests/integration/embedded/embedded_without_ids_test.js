var store, Adapter, adapter;
var Post, Comment, User, Pingback, Like;
var attr = DS.attr;

function promise(fn){
  return new Ember.RSVP.Promise(fn);
}

module("Embedded Relationships Without IDs", {
  setup: function() {
    var App = Ember.Namespace.create({ name: "App" });

    User = App.User = DS.Model.extend({
      name: attr('string')
    });

    Comment = App.Comment = DS.Model.extend({
      title: attr('string'),
      user: DS.belongsTo(User)
    });

    Pingback = App.Pingback = DS.Model.extend();

    Like = App.Like = DS.Model.extend();

    Post = App.Post = DS.Model.extend({
      title: attr('string'),
      comments: DS.hasMany(Comment),
      pingbacks: DS.hasMany(Pingback),
      likes: DS.hasMany(Like)
    });

    Adapter = DS.RESTAdapter.extend();

    Adapter.map(Comment, {
      user: { embedded: 'always' }
    });

    Adapter.map(Post, {
      comments: { embedded: 'always' },
      pingbacks: { embedded: 'always' },
      likes: { embedded: 'load' }
    });

    adapter = Adapter.create();

    store = DS.Store.create({
      adapter: adapter
    });
  }
});

test("An embedded record can be accessed via a belongsTo relationship but does not have an ID", function() {
  adapter.load(store, Comment, {
    id: 1,
    title: "Why not use a more lightweight solution?",

    user: {
      name: "mongodb_expert"
    }
  });

  adapter.load(store, Comment, {
    id: 2,
    title: "I am noticing a common quality in Katz' recent foray into JavaScript, that being his desire that it be like Ruby",

    user: {
      name: "oinksoft"
    }
  });

  var comment1 = store.find(Comment, 1);
  var comment2 = store.find(Comment, 2);

  var user1 = comment1.get('user');
  var user2 = comment2.get('user');

  equal(user1.get('name'), "mongodb_expert", "the embedded record is found and its attributes are materialized");
  equal(user1.get('id'), null, "the embedded record does not have an id");

  equal(user2.get('name'), "oinksoft", "the embedded record is found and its attributed are materialized");
  equal(user2.get('id'), null, "the embedded record does not have an id");
});

asyncTest("Embedded belongsTo relationships can be saved when embedded: always is true", function() {
  adapter.load(store, Comment, {
    id: 1,
    title: "Why not use a more lightweight solution?",

    user: {
      name: "mongodb_user"
    }
  });

  adapter.ajax = function(url, type, hash) {
    deepEqual(hash.data, {
      comment: {
        title: "Why not use a more lightweight solution?",
        user: {
          name: "mongodb_expert"
        }
      }
    });

    return promise(function(resolve, reject) {
      setTimeout(function() {
        Ember.run(null, resolve, adapter);
        done();
      });
    });
  };

  var transaction = store.transaction();

  var comment = store.find(Comment, 1);
  var user = comment.get('user');

  transaction.add(user);
  transaction.add(comment);

  user.set('name', "mongodb_expert");
  equal(user.get('isDirty'), true, "user becomes dirty after changing a property");
  equal(comment.get('isDirty'), true, "comment becomes dirty when its embedded user becomes dirty");

  transaction.commit();

  function done() {
    equal(user.get('isDirty'), false, "user becomes clean after commit");
    equal(comment.get('isDirty'), false, "comment becomes clean after commit");
    start();
  }
});

test("Embedded records can be accessed via a hasMany relationship without having IDs", function() {
  adapter.load(store, Post, {
    id: 1,
    title: "A New MVC Framework in Under 100 Lines of Code",

    comments: [{
      title: "Why not use a more lightweight solution?",
      user: null
    }, {
      title: "This does not seem to reflect the Unix philosophy haha",
      user: null
    }]
  });

  var post = store.find(Post, 1);

  var comments = post.get('comments');

  var comment1 = comments.objectAt(0);
  var comment2 = comments.objectAt(1);

  equal(comment1.get('title'), "Why not use a more lightweight solution?");
  equal(comment2.get('title'), "This does not seem to reflect the Unix philosophy haha");
});

asyncTest("Embedded hasMany relationships can be saved when embedded: always is true", function() {
  adapter.load(store, Post, {
    id: 1,
    title: "A New MVC Framework in Under 100 Lines of Code",

    comments: [{
      title: "Why not use a more lightweight solution?"
    },
    {
      title: "This does not seem to reflect the Unix philosophy haha"
    }],

    likes: [{ id: 1 }, { id: 2 }]
  });

  adapter.ajax = function(url, type, hash) {
    deepEqual(hash.data, {
      post: {
        title: "A New MVC Framework in Under 100 Lines of Code",

        comments: [{
          title: "Wouldn't a more lightweight solution be better? This feels very monolithic.",
          user: null
        },
        {
          title: "This does not seem to reflect the Unix philosophy haha",
          user: null
        }],

        pingbacks: []
      }
    });

    return promise(function(resolve, reject){
      setTimeout(function() {
        Ember.run(null, resolve, adapter);
        done();
      });
    });
  };

  var transaction = store.transaction();

  var post = store.find(Post, 1);
  var comment1 = post.get('comments').objectAt(0);
  var comment2 = post.get('comments').objectAt(1);

  transaction.add(post);
  transaction.add(comment1);
  transaction.add(comment2);

  comment1.set('title', "Wouldn't a more lightweight solution be better? This feels very monolithic.");
  equal(post.get('isDirty'), true, "post becomes dirty after changing a property");
  equal(comment1.get('isDirty'), true, "comment becomes dirty when its embedded post becomes dirty");
  equal(comment2.get('isDirty'), true, "comment becomes dirty when its embedded post becomes dirty");

  transaction.commit();

  function done() {
    equal(post.get('isDirty'), false, "post becomes clean after commit");
    equal(comment1.get('isDirty'), false, "comment becomes clean after commit");
    equal(comment2.get('isDirty'), false, "comment becomes clean after commit");
    start();
  }
});

test("Embedded records can themselves contain embedded records", function() {
  adapter.load(store, Post, {
    id: 1,
    title: "A New MVC Framework in Under 100 Lines of Code",

    comments: [{
      title: "Why not use a more lightweight solution?",
      user: {
        name: "mongodb_user"
      }
    },
    {
      title: "This does not seem to reflect the Unix philosophy haha",
      user: {
        name: "microuser"
      }
    }]
  });

  var post = store.find(Post, 1);
  var comment1 = post.get('comments.firstObject');
  var user1 = comment1.get('user');

  equal(user1.get('name'), "mongodb_user", "user record was materialized correctly");
  equal(comment1.get('title'), "Why not use a more lightweight solution?", "comment record was materialized correctly");
  equal(post.get('title'), "A New MVC Framework in Under 100 Lines of Code", "post record was materialized correctly");
});

asyncTest("Embedded records that contain embedded records can be saved", function() {
  adapter.load(store, Post, {
    id: 1,
    title: "A New MVC Framework in Under 100 Lines of Code",

    comments: [{
      title: "Why not use a more lightweight solution?",
      user: {
        name: "mongodb_user"
      }
    },
    {
      title: "This does not seem to reflect the Unix philosophy haha",
      user: {
        name: "microuser"
      }
    }]
  });

  adapter.ajax = function(url, type, hash) {
    deepEqual(hash.data, {
      post: {
        title: "A New MVC Framework in Under 100 Lines of Code",

        comments: [{
          title: "Wouldn't a more lightweight solution be better? This feels very monolithic.",
          user: {
            name: "mongodb_user"
          }
        },
        {
          title: "This does not seem to reflect the Unix philosophy haha",
          user: {
            name: "microuser"
          }
        }],

        pingbacks: []
      }
    });

    return promise(function(resolve, reject){
      setTimeout(function(){
        Ember.run(null, resolve, adapter);
        done();
      });
    });
  };

  var transaction = store.transaction();

  var post = store.find(Post, 1);
  var comment1 = post.get('comments').objectAt(0);
  var comment2 = post.get('comments').objectAt(1);
  var user1 = comment1.get('user');
  var user2 = comment2.get('user');

  transaction.add(post);
  transaction.add(comment1);
  transaction.add(comment2);
  transaction.add(user1);
  transaction.add(user2);

  comment1.set('title', "Wouldn't a more lightweight solution be better? This feels very monolithic.");
  equal(post.get('isDirty'), true, "post becomes dirty after changing a property");
  equal(comment1.get('isDirty'), true, "comment becomes dirty when its parent post becomes dirty");
  equal(comment2.get('isDirty'), true, "comment becomes dirty when its parent post becomes dirty");
  equal(user1.get('isDirty'), true, "user becomes dirty when its parent post becomes dirty");
  equal(user2.get('isDirty'), true, "user becomes dirty when its parent post becomes dirty");

  transaction.commit();

  function done() {
    equal(post.get('isDirty'), false, "post becomes clean after commit");
    equal(comment1.get('isDirty'), false, "comment becomes clean after commit");
    equal(comment2.get('isDirty'), false, "comment becomes clean after commit");
    equal(user1.get('isDirty'), false, "user becomes clean after commit");
    equal(user2.get('isDirty'), false, "user becomes clean after commit");
    start();
  }
});
