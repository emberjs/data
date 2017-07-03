import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import { isEnabled } from 'ember-data/-private';

import {module, test} from 'qunit';

import DS from 'ember-data';

let env, store, adapter, Post, Comment, SuperUser;
let passedUrl;
const { run } = Ember;

module("integration/adapter/build-url-mixin - BuildURLMixin with RESTAdapter", {
  beforeEach() {
    Post = DS.Model.extend({
      name: DS.attr("string")
    });

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
  if (isEnabled('ds-improved-ajax')) {
    adapter._makeRequest = function(request) {
      passedUrl = request.url;

      return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
    };
  } else {
    adapter.ajax = function(url, verb, hash) {
      passedUrl = url;

      return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
    };
  }
}


test('buildURL - with host and namespace', function(assert) {
  run(() => {
    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1'
    });
  });

  ajaxResponse({ posts: [{ id: 1 }] });

  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "http://example.com/api/v1/posts/1");
  });
});

test('buildURL - with relative paths in links', function(assert) {
  run(() => {
    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1'
    });
  });

  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  ajaxResponse({ posts: [{ id: 1, links: { comments: 'comments' } }] });

  return run(store, 'findRecord', 'post', '1').then(post => {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  }).then(comments => {
    assert.equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  });
});

test('buildURL - with absolute paths in links', function(assert) {
  run(() => {
    adapter.setProperties({
      host: 'http://example.com',
      namespace: 'api/v1'
    });
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  ajaxResponse({ posts: [{ id: 1, links: { comments: '/api/v1/posts/1/comments' } }] });

  return run(store, 'findRecord', 'post', 1).then(post => {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  }).then(comments => {
    assert.equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
  });
});


test('buildURL - with absolute paths in links and protocol relative host', function(assert) {
  run(() => {
    adapter.setProperties({
      host: '//example.com',
      namespace: 'api/v1'
    });
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  ajaxResponse({ posts: [{ id: 1, links: { comments: '/api/v1/posts/1/comments' } }] });

  return run(store, 'findRecord', 'post', 1).then(post => {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  }).then(comments => {
    assert.equal(passedUrl, "//example.com/api/v1/posts/1/comments");
  });
});

test('buildURL - with absolute paths in links and host is /', function(assert) {
  run(() => {
    adapter.setProperties({
      host: '/',
      namespace: 'api/v1'
    });
  });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });

  ajaxResponse({ posts: [{ id: 1, links: { comments: '/api/v1/posts/1/comments' } }] });

  return run(store, 'findRecord', 'post', 1).then(post => {
    ajaxResponse({ comments: [{ id: 1 }] });
    return post.get('comments');
  }).then(comments => {
    assert.equal(passedUrl, '/api/v1/posts/1/comments', 'host stripped out properly');
  });
});

test('buildURL - with full URLs in links', function(assert) {
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

  return run(() => {
    return store.findRecord('post', 1).then(post => {
      ajaxResponse({ comments: [{ id: 1 }] });
      return post.get('comments');
    }).then(comments => {
      assert.equal(passedUrl, "http://example.com/api/v1/posts/1/comments");
    });
  });
});

test('buildURL - with camelized names', function(assert) {
  adapter.setProperties({
    pathForType(type) {
      let decamelized = Ember.String.decamelize(type);
      return Ember.String.underscore(Ember.String.pluralize(decamelized));
    }
  });

  ajaxResponse({ superUsers: [{ id: 1 }] });

  return run(() => {
    return store.findRecord('super-user', 1).then(post => {
      assert.equal(passedUrl, "/super_users/1");
    });
  });
});

test('buildURL - buildURL takes a record from find', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  adapter.buildURL = function(type, id, snapshot) {
    return "/posts/" + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
  };

  ajaxResponse({ comments: [{ id: 1 }] });

  let post;
  run(() => {
    post = store.push({
      data: {
        type: 'post',
        id: '2'
      }
    });
  });

  return run(() => {
    return store.findRecord('comment', 1, { preload: { post: post } }).then(post => {
      assert.equal(passedUrl, "/posts/2/comments/1");
    });
  });
});

test('buildURL - buildURL takes the records from findMany', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: true }) });

  adapter.buildURL = function(type, ids, snapshots) {
    if (Array.isArray(snapshots)) {
      return "/posts/" + snapshots.get('firstObject').belongsTo('post', { id: true }) + '/comments/';
    }
    return "";
  };
  adapter.coalesceFindRequests = true;

  ajaxResponse({ comments: [{ id: 1 }, { id: 2 }, { id: 3 }] });
  let post;

  return run(() =>  {
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

    return post.get('comments').then(post => {
      assert.equal(passedUrl, "/posts/2/comments/");
    });
  });
});

test('buildURL - buildURL takes a record from create', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  adapter.buildURL = function(type, id, snapshot) {
    return "/posts/" + snapshot.belongsTo('post', { id: true }) + '/comments/';
  };

  ajaxResponse({ comments: [{ id: 1 }] });

  return run(() => {
    let post = store.push({
      data: {
        type: 'post',
        id: '2'
      }
    });
    let comment = store.createRecord('comment');
    comment.set('post', post);
    return comment.save().then(post => {
      assert.equal(passedUrl, "/posts/2/comments/");
    });
  });
});

test('buildURL - buildURL takes a record from create to query a resolved async belongsTo relationship', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: true }) });

  ajaxResponse({ posts: [{ id: 2 }] });

  return run(() => {
    store.findRecord('post', 2).then(post => {
      assert.equal(post.get('id'), 2);

      adapter.buildURL = function(type, id, snapshot) {
        return "/posts/" + snapshot.belongsTo('post', { id: true }) + '/comments/';
      };

      ajaxResponse({ comments: [{ id: 1 }] });

      let comment = store.createRecord('comment');
      comment.set('post', post);
      return comment.save().then(post => {
        assert.equal(passedUrl, "/posts/2/comments/");
      });
    });
  });
});

test('buildURL - buildURL takes a record from update', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  adapter.buildURL = function(type, id, snapshot) {
    return "/posts/" + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
  };

  ajaxResponse({ comments: [{ id: 1 }] });

  let post, comment;
  run(() => {
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

  return run(() => {
    return comment.save().then(post => {
      assert.equal(passedUrl, "/posts/2/comments/1");
    });
  });
});

test('buildURL - buildURL takes a record from delete', function(assert) {
  Comment.reopen({ post: DS.belongsTo('post', { async: false }) });
  Post.reopen({ comments: DS.hasMany('comment', { async: false }) });
  adapter.buildURL = function(type, id, snapshot) {
    return 'posts/' + snapshot.belongsTo('post', { id: true }) + '/comments/' + snapshot.id;
  };

  ajaxResponse({ comments: [{ id: 1 }] });

  let post, comment;

  run(() => {
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

  return run(() => {
    return comment.save().then(post => {
      assert.equal(passedUrl, "posts/2/comments/1");
    });
  });
});

test('buildURL - with absolute namespace', function(assert) {
  run(() => {
    adapter.setProperties({
      namespace: '/api/v1'
    });
  });

  ajaxResponse({ posts: [{ id: 1 }] });

  return run(store, 'findRecord', 'post', 1).then(post => {
    assert.equal(passedUrl, "/api/v1/posts/1");
  });
});
