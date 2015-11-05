import DS from 'ember-data';

var env, store, adapter, Post, Comment, SuperUser;
var passedUrl;
var run = Ember.run;

module("integration/adapter/build-url-mixin - BuildURLMixin with RESTAdapter", {
  setup: function() {
    Post = DS.Model.extend({
      name: DS.attr("string")
    });

    Post.toString = function() {
      return "Post";
    };

    Comment = DS.Model.extend({
      name: DS.attr("string")
    });

    SuperUser = DS.Model.extend();

    env = setupStore({
      post: Post,
      comment: Comment,
      superUser: SuperUser,
      adapter: DS.RESTAdapter
    });

    store = env.store;
    adapter = env.adapter;

    Post = store.modelFor('post');
    Comment = store.modelFor('comment');
    SuperUser = store.modelFor('super-user');

    passedUrl = null;
  }
});

function ajaxResponse(value) {
  adapter.ajax = function(url, verb, hash) {
    passedUrl = url;

    return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
  };
}


test('buildURL - with host and namespace', function() {
  run(function() {
    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1'
    });
  });

  ajaxResponse({ posts: [{ id: 1 }] });

  run(store, 'findRecord', 'post', 1).then(async(function(post) {
    equal(passedUrl, "http://example.com/api/v1/posts/1");
  }));
});

test('buildURL - with relative paths in links', function() {
  run(function() {
    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1'
    });
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  ajaxResponse({ posts: [{ id: 1, links: { comments: 'comments' } }] });

  run(store, 'findRecord', 'post', '1').then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  }));
});

test('buildURL - with absolute paths in links', function() {
  run(function() {
    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1'
    });
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  ajaxResponse({ posts: [{ id: 1, links: { comments: '/api/v1/posts/1/comments' } }] });

  run(store, 'findRecord', 'post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  }));
});


test('buildURL - with absolute paths in links and protocol relative host', function() {
  run(function() {
    adapter.setProperties({
      host: '//example.com',
      namespace: 'api/v1'
    });
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  ajaxResponse({ posts: [{ id: 1, links: { comments: '/api/v1/posts/1/comments' } }] });

  run(store, 'findRecord', 'post', 1).then(async(function(post) {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  })).then(async(function (comments) {
    equal(passedUrl, "//example.com/api/v1/posts/1/comments");
  }));
});

test('buildURL - with full URLs in links', function() {
  adapter.setProperties({
    host: 'http://example.com',
    namespace: 'api/v1'
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  ajaxResponse({
    posts: [
      { id: 1,
        links: { comments: 'http://example.com/api/v1/posts/1/comments' }
      }
    ]
  });

  run(function() {
    store.findRecord('post', 1).then(async(function(post) {
      ajaxResponse({ comments: [{ id: 1 }] });
      return post.get('comments');
    })).then(async(function (comments) {
      equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
    }));
  });
});

test('buildURL - with camelized names', function() {
  adapter.setProperties({
    pathForType: function(type) {
      var decamelized = Ember.String.decamelize(type);
      return Ember.String.underscore(Ember.String.pluralize(decamelized));
    }
  });

  ajaxResponse({ superUsers: [{ id: 1 }] });

  run(function() {
    store.findRecord('super-user', 1).then(async(function(post) {
      equal(passedUrl, "/super_users/1");
    }));
  });
});

test('buildURL - buildURL takes a record from find', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  adapter.buildURL = function(type, id, snapshot) {
    return "/posts/" + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
  };

  ajaxResponse({ comments: [{ id: 1 }] });

  var post;
  run(function() {
    post = store.push({
      data: {
        type: 'post',
        id: '2'
      }
    });
  });

  run(function() {
    store.findRecord('comment', 1, { preload: { post: post } }).then(async(function(post) {
      equal(passedUrl, "/posts/2/comments/1");
    }));
  });
});

test('buildURL - buildURL takes the records from findMany', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  adapter.buildURL = function(type, ids, snapshots) {
    if (Ember.isArray(snapshots)) {
      return "/posts/" + snapshots.get('firstObject').belongsTo('post', { id: true }) + '/comments/';
    }
    return "";
  };
  adapter.coalesceFindRequests = true;

  ajaxResponse({ comments: [{ id: 1 }, { id: 2 }, { id: 3 }] });
  var post;

  run(function() {
    post = store.push({
      data: {
        type: 'post',
        id: '2',
        relationships: {
          comments: {
            data: [
              { id: '1', type: 'comment' },
              { id: '2', type: 'comment' },
              { id: '3', type: 'comment' }
            ]
          }
        }
      }
    });
    post.get('comments').then(async(function(post) {
      equal(passedUrl, "/posts/2/comments/");
    }));
  });
});

test('buildURL - buildURL takes a record from create', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  adapter.buildURL = function(type, id, snapshot) {
    return "/posts/" + snapshot.belongsTo('post', { id: true }) + '/comments/';
  };

  ajaxResponse({ comments: [{ id: 1 }] });

  run(function() {
    var post = store.push({
      data: {
        type: 'post',
        id: '2'
      }
    });
    var comment = store.createRecord('comment');
    comment.set('post', post);
    comment.save().then(async(function(post) {
      equal(passedUrl, "/posts/2/comments/");
    }));
  });
});

test('buildURL - buildURL takes a record from create to query a resolved async belongsTo relationship', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: true }) });

  ajaxResponse({ posts: [{ id: 2 }] });

  run(function() {
    store.findRecord('post', 2).then(async(function(post) {
      equal(post.get('id'), 2);

      adapter.buildURL = function(type, id, snapshot) {
        return "/posts/" + snapshot.belongsTo('post', { id: true }) + '/comments/';
      };

      ajaxResponse({ comments: [{ id: 1 }] });

      var comment = store.createRecord('comment');
      comment.set('post', post);
      comment.save().then(async(function(post) {
        equal(passedUrl, "/posts/2/comments/");
      }));

    }));
  });
});

test('buildURL - buildURL takes a record from update', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  adapter.buildURL = function(type, id, snapshot) {
    return "/posts/" + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
  };

  ajaxResponse({ comments: [{ id: 1 }] });

  var post, comment;
  run(function() {
    post = store.push({
      data: {
        type: 'post',
        id: '2'
      }
    });
    comment = store.push({
      data: {
        type: 'comment',
        id: '1'
      }
    });
    comment.set('post', post);
  });
  run(function() {
    comment.save().then(async(function(post) {
      equal(passedUrl, "/posts/2/comments/1");
    }));
  });
});

test('buildURL - buildURL takes a record from delete', function() {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });
  adapter.buildURL = function(type, id, snapshot) {
    return 'posts/' + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
  };

  ajaxResponse({ comments: [{ id: 1 }] });

  var post, comment;
  run(function() {
    post = store.push({
      data: {
        type: 'post',
        id: '2'
      }
    });
    comment = store.push({
      data: {
        type: 'comment',
        id: '1'
      }
    });

    comment.set('post', post);
    comment.deleteRecord();
  });
  run(function() {
    comment.save().then(async(function(post) {
      equal(passedUrl, "posts/2/comments/1");
    }));
  });
});

test('buildURL - with absolute namespace', function() {
  run(function() {
    adapter.setProperties({
      namespace: '/api/v1'
    });
  });

  ajaxResponse({ posts: [{ id: 1 }] });

  run(store, 'findRecord', 'post', 1).then(async(function(post) {
    equal(passedUrl, "/api/v1/posts/1");
  }));
});
