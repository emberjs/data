import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store, adapter;
var passedUrl, passedVerb, passedHash;

var run = Ember.run;

var User, Post, Comment, Handle, GithubHandle, TwitterHandle, Company, DevelopmentShop, DesignStudio;

module('integration/adapter/json-api-adapter - JSONAPIAdapter', {
  beforeEach: function() {
    User = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      posts: DS.hasMany('post', { async: true }),
      handles: DS.hasMany('handle', { async: true, polymorphic: true }),
      company: DS.belongsTo('company', { async: true, polymorphic: true })
    });

    Post = DS.Model.extend({
      title: DS.attr('string'),
      author: DS.belongsTo('user', { async: true }),
      comments: DS.hasMany('comment', { async: true })
    });

    Comment = DS.Model.extend({
      text: DS.attr('string'),
      post: DS.belongsTo('post', { async: true })
    });

    Handle = DS.Model.extend({
      user: DS.belongsTo('user', { async: true })
    });

    GithubHandle = Handle.extend({
      username: DS.attr('string')
    });

    TwitterHandle = Handle.extend({
      nickname: DS.attr('string')
    });

    Company = DS.Model.extend({
      name: DS.attr('string'),
      employees: DS.hasMany('user', { async: true })
    });

    DevelopmentShop = Company.extend({
      coffee: DS.attr('boolean')
    });

    DesignStudio = Company.extend({
      hipsters: DS.attr('number')
    });

    env = setupStore({
      adapter: DS.JSONAPIAdapter,

      'user': User,
      'post': Post,
      'comment': Comment,
      'handle': Handle,
      'github-handle': GithubHandle,
      'twitter-handle': TwitterHandle,
      'company': Company,
      'development-shop': DevelopmentShop,
      'design-studio': DesignStudio
    });

    store = env.store;
    adapter = env.adapter;
  },

  afterEach: function() {
    run(env.store, 'destroy');
  }
});

function ajaxResponse(responses) {
  var counter = 0;
  var index;

  passedUrl = [];
  passedVerb = [];
  passedHash = [];

  adapter.ajax = function(url, verb, hash) {
    index = counter++;

    passedUrl[index] = url;
    passedVerb[index] = verb;
    passedHash[index] = hash;

    return run(Ember.RSVP, 'resolve', responses[index]);
  };
}

test('find a single record', function(assert) {
  assert.expect(3);

  ajaxResponse([{
    data: {
      type: 'post',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      }
    }
  }]);

  run(function() {
    store.find('post', 1).then(function(post) {
      assert.equal(passedUrl[0], '/posts/1');

      assert.equal(post.get('id'), '1');
      assert.equal(post.get('title'), 'Ember.js rocks');
    });
  });
});

test('find all records with sideloaded relationships', function(assert) {
  assert.expect(9);

  ajaxResponse([{
    data: [{
      type: 'posts',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      },
      relationships: {
        author: {
          data: { type: 'users', id: '3' }
        }
      }
    }, {
      type: 'posts',
      id: '2',
      attributes: {
        title: 'Tomster rules'
      },
      relationships: {
        author: {
          data: { type: 'users', id: '3' }
        },
        comments: {
          data: [
            { type: 'comments', id: '4' },
            { type: 'comments', id: '5' }
          ]
        }
      }
    }],
    included: [{
      type: 'users',
      id: '3',
      attributes: {
        'first-name': 'Yehuda',
        'last-name': 'Katz'
      }
    }, {
      type: 'comments',
      id: '4',
      attributes: {
        text: 'This is the first comment'
      }
    }, {
      type: 'comments',
      id: '5',
      attributes: {
        text: 'This is the second comment'
      }
    }]
  }]);

  run(function() {
    store.findAll('post').then(function(posts) {
      assert.equal(passedUrl[0], '/posts');

      assert.equal(posts.get('length'), '2');
      assert.equal(posts.get('firstObject.title'), 'Ember.js rocks');
      assert.equal(posts.get('lastObject.title'), 'Tomster rules');

      assert.equal(posts.get('firstObject.author.firstName'), 'Yehuda');
      assert.equal(posts.get('lastObject.author.lastName'), 'Katz');

      assert.equal(posts.get('firstObject.comments.length'), 0);

      assert.equal(posts.get('lastObject.comments.firstObject.text'), 'This is the first comment');
      assert.equal(posts.get('lastObject.comments.lastObject.text'), 'This is the second comment');
    });
  });
});

test('find many records', function(assert) {
  assert.expect(4);

  ajaxResponse([{
    data: [{
      type: 'posts',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      }
    }]
  }]);

  run(function() {
    store.query('post', { filter: { id: 1 } }).then(function(posts) {
      assert.equal(passedUrl[0], '/posts');
      assert.deepEqual(passedHash[0], { data: { filter: { id: 1 } } });

      assert.equal(posts.get('length'), '1');
      assert.equal(posts.get('firstObject.title'), 'Ember.js rocks');
    });
  });
});

test('find a single record with belongsTo link as object { related }', function(assert) {
  assert.expect(7);

  ajaxResponse([{
    data: {
      type: 'posts',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      },
      relationships: {
        author: {
          links: {
            related: 'http://example.com/user/2'
          }
        }
      }
    }
  }, {
    data: {
      type: 'users',
      id: '2',
      attributes: {
        'first-name': 'Yehuda',
        'last-name': 'Katz'
      }
    }
  }]);

  run(function() {
    store.find('post', 1).then(function(post) {
      assert.equal(passedUrl[0], '/posts/1');

      assert.equal(post.get('id'), '1');
      assert.equal(post.get('title'), 'Ember.js rocks');

      post.get('author').then(function(author) {
        assert.equal(passedUrl[1], 'http://example.com/user/2');

        assert.equal(author.get('id'), '2');
        assert.equal(author.get('firstName'), 'Yehuda');
        assert.equal(author.get('lastName'), 'Katz');
      });
    });
  });
});

test('find a single record with belongsTo link as object { data }', function(assert) {
  assert.expect(7);

  ajaxResponse([{
    data: {
      type: 'posts',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      },
      relationships: {
        author: {
          data: { type: 'users', id: '2' }
        }
      }
    }
  }, {
    data: {
      type: 'users',
      id: '2',
      attributes: {
        'first-name': 'Yehuda',
        'last-name': 'Katz'
      }
    }
  }]);

  run(function() {
    store.find('post', 1).then(function(post) {
      assert.equal(passedUrl[0], '/posts/1');

      assert.equal(post.get('id'), '1');
      assert.equal(post.get('title'), 'Ember.js rocks');

      post.get('author').then(function(author) {
        assert.equal(passedUrl[1], '/users/2');

        assert.equal(author.get('id'), '2');
        assert.equal(author.get('firstName'), 'Yehuda');
        assert.equal(author.get('lastName'), 'Katz');
      });
    });
  });
});

test('find a single record with belongsTo link as object { data } (polymorphic)', function(assert) {
  assert.expect(8);

  ajaxResponse([{
    data: {
      type: 'users',
      id: '1',
      attributes: {
        'first-name': 'Yehuda',
        'last-name': 'Katz'
      },
      relationships: {
        company: {
          data: { type: 'development-shops', id: '2' }
        }
      }
    }
  }, {
    data: {
      type: 'development-shop',
      id: '2',
      attributes: {
        name: 'Tilde',
        coffee: true
      }
    }
  }]);

  run(function() {
    store.find('user', 1).then(function(user) {
      assert.equal(passedUrl[0], '/users/1');

      assert.equal(user.get('id'), '1');
      assert.equal(user.get('firstName'), 'Yehuda');
      assert.equal(user.get('lastName'), 'Katz');

      user.get('company').then(function(company) {
        assert.equal(passedUrl[1], '/development-shops/2');

        assert.equal(company.get('id'), '2');
        assert.equal(company.get('name'), 'Tilde');
        assert.equal(company.get('coffee'), true);
      });
    });
  });
});

test('find a single record with sideloaded belongsTo link as object { data }', function(assert) {
  assert.expect(7);

  ajaxResponse([{
    data: {
      type: 'post',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      },
      relationships: {
        author: {
          data: { type: 'user', id: '2' }
        }
      }
    },
    included: [{
      type: 'user',
      id: '2',
      attributes: {
        'first-name': 'Yehuda',
        'last-name': 'Katz'
      }
    }]
  }]);

  run(function() {

    store.find('post', 1).then(function(post) {
      assert.equal(passedUrl[0], '/posts/1');

      assert.equal(post.get('id'), '1');
      assert.equal(post.get('title'), 'Ember.js rocks');

      post.get('author').then(function(author) {
        assert.equal(passedUrl.length, 1);

        assert.equal(author.get('id'), '2');
        assert.equal(author.get('firstName'), 'Yehuda');
        assert.equal(author.get('lastName'), 'Katz');
      });
    });
  });
});

test('find a single record with hasMany link as object { related }', function(assert) {
  assert.expect(7);

  ajaxResponse([{
    data: {
      type: 'post',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      },
      relationships: {
        comments: {
          links: {
            related: 'http://example.com/post/1/comments'
          }
        }
      }
    }
  }, {
    data: [{
      type: 'comment',
      id: '2',
      attributes: {
        text: 'This is the first comment'
      }
    }, {
      type: 'comment',
      id: '3',
      attributes: {
        text: 'This is the second comment'
      }
    }]
  }]);

  run(function() {
    store.find('post', 1).then(function(post) {
      assert.equal(passedUrl[0], '/posts/1');

      assert.equal(post.get('id'), '1');
      assert.equal(post.get('title'), 'Ember.js rocks');

      post.get('comments').then(function(comments) {
        assert.equal(passedUrl[1], 'http://example.com/post/1/comments');

        assert.equal(comments.get('length'), 2);
        assert.equal(comments.get('firstObject.text'), 'This is the first comment');
        assert.equal(comments.get('lastObject.text'), 'This is the second comment');
      });
    });
  });
});

test('find a single record with hasMany link as object { data }', function(assert) {
  assert.expect(8);

  ajaxResponse([{
    data: {
      type: 'post',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      },
      relationships: {
        comments: {
          data: [
            { type: 'comment', id: '2' },
            { type: 'comment', id: '3' }
          ]
        }
      }
    }
  }, {
    data: {
      type: 'comment',
      id: '2',
      attributes: {
        text: 'This is the first comment'
      }
    }
  }, {
    data: {
      type: 'comment',
      id: '3',
      attributes: {
        text: 'This is the second comment'
      }
    }
  }]);

  run(function() {
    store.find('post', 1).then(function(post) {
      assert.equal(passedUrl[0], '/posts/1');

      assert.equal(post.get('id'), '1');
      assert.equal(post.get('title'), 'Ember.js rocks');

      post.get('comments').then(function(comments) {
        assert.equal(passedUrl[1], '/comments/2');
        assert.equal(passedUrl[2], '/comments/3');

        assert.equal(comments.get('length'), 2);
        assert.equal(comments.get('firstObject.text'), 'This is the first comment');
        assert.equal(comments.get('lastObject.text'), 'This is the second comment');
      });
    });
  });
});

test('find a single record with hasMany link as object { data } (polymorphic)', function(assert) {
  assert.expect(9);

  ajaxResponse([{
    data: {
      type: 'user',
      id: '1',
      attributes: {
        'first-name': 'Yehuda',
        'last-name': 'Katz'
      },
      relationships: {
        handles: {
          data: [
            { type: 'github-handle', id: '2' },
            { type: 'twitter-handle', id: '3' }
          ]
        }
      }
    }
  }, {
    data: {
      type: 'github-handle',
      id: '2',
      attributes: {
        username: 'wycats'
      }
    }
  }, {
    data: {
      type: 'twitter-handle',
      id: '3',
      attributes: {
        nickname: '@wycats'
      }
    }
  }]);

  run(function() {
    store.find('user', 1).then(function(user) {
      assert.equal(passedUrl[0], '/users/1');

      assert.equal(user.get('id'), '1');
      assert.equal(user.get('firstName'), 'Yehuda');
      assert.equal(user.get('lastName'), 'Katz');

      user.get('handles').then(function(handles) {
        assert.equal(passedUrl[1], '/github-handles/2');
        assert.equal(passedUrl[2], '/twitter-handles/3');

        assert.equal(handles.get('length'), 2);
        assert.equal(handles.get('firstObject.username'), 'wycats');
        assert.equal(handles.get('lastObject.nickname'), '@wycats');
      });
    });
  });
});

test('find a single record with sideloaded hasMany link as object { data }', function(assert) {
  assert.expect(7);

  ajaxResponse([{
    data: {
      type: 'post',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      },
      relationships: {
        comments: {
          data: [
            { type: 'comment', id: '2' },
            { type: 'comment', id: '3' }
          ]
        }
      }
    },
    included: [{
      type: 'comment',
      id: '2',
      attributes: {
        text: 'This is the first comment'
      }
    }, {
      type: 'comment',
      id: '3',
      attributes: {
        text: 'This is the second comment'
      }
    }]
  }]);

  run(function() {
    store.find('post', 1).then(function(post) {
      assert.equal(passedUrl[0], '/posts/1');

      assert.equal(post.get('id'), '1');
      assert.equal(post.get('title'), 'Ember.js rocks');

      post.get('comments').then(function(comments) {
        assert.equal(passedUrl.length, 1);

        assert.equal(comments.get('length'), 2);
        assert.equal(comments.get('firstObject.text'), 'This is the first comment');
        assert.equal(comments.get('lastObject.text'), 'This is the second comment');
      });
    });
  });
});

test('find a single record with sideloaded hasMany link as object { data } (polymorphic)', function(assert) {
  assert.expect(8);

  ajaxResponse([{
    data: {
      type: 'user',
      id: '1',
      attributes: {
        'first-name': 'Yehuda',
        'last-name': 'Katz'
      },
      relationships: {
        handles: {
          data: [
            { type: 'github-handle', id: '2' },
            { type: 'twitter-handle', id: '3' }
          ]
        }
      }
    },
    included: [{
      type: 'github-handle',
      id: '2',
      attributes: {
        username: 'wycats'
      }
    }, {
      type: 'twitter-handle',
      id: '3',
      attributes: {
        nickname: '@wycats'
      }
    }]
  }]);

  run(function() {
    store.find('user', 1).then(function(user) {
      assert.equal(passedUrl[0], '/users/1');

      assert.equal(user.get('id'), '1');
      assert.equal(user.get('firstName'), 'Yehuda');
      assert.equal(user.get('lastName'), 'Katz');

      user.get('handles').then(function(handles) {
        assert.equal(passedUrl.length, 1);

        assert.equal(handles.get('length'), 2);
        assert.equal(handles.get('firstObject.username'), 'wycats');
        assert.equal(handles.get('lastObject.nickname'), '@wycats');
      });
    });
  });
});

test('create record', function(assert) {
  assert.expect(3);

  ajaxResponse([{
    data: {
      type: 'users',
      id: '3'
    }
  }]);

  run(function() {

    var company = store.push({ data: {
      type: 'company',
      id: '1',
      attributes: {
        name: 'Tilde Inc.'
      }
    } });

    var githubHandle = store.push({ data: {
      type: 'github-handle',
      id: '2',
      attributes: {
        username: 'wycats'
      }
    } });

    var user = store.createRecord('user', {
      firstName: 'Yehuda',
      lastName: 'Katz',
      company: company
    });

    user.get('handles').then(function(handles) {
      handles.addObject(githubHandle);

      user.save().then(function() {
        assert.equal(passedUrl[0], '/users');
        assert.equal(passedVerb[0], 'POST');
        assert.deepEqual(passedHash[0], {
          data: {
            data : {
              type: 'users',
              attributes: {
                'first-name': 'Yehuda',
                'last-name': 'Katz'
              },
              relationships: {
                company: {
                  data: { type: 'companies', id: '1' }
                }
              }
            }
          }
        });
      });
    });
  });
});

test('update record', function(assert) {
  assert.expect(3);

  ajaxResponse([{
    data: {
      type: 'users',
      id: '1'
    }
  }]);

  run(function() {
    var user = store.push({ data: {
      type: 'user',
      id: '1',
      attributes: {
        firstName: 'Yehuda',
        lastName: 'Katz'
      }
    } });

    var company = store.push({ data: {
      type: 'company',
      id: '2',
      attributes: {
        name: 'Tilde Inc.'
      }
    } });

    var githubHandle = store.push({ data: {
      type: 'github-handle',
      id: '3',
      attributes: {
        username: 'wycats'
      }
    } });

    user.set('firstName', 'Yehuda!');
    user.set('company', company);

    user.get('handles').then(function(handles) {
      handles.addObject(githubHandle);

      user.save().then(function() {
        assert.equal(passedUrl[0], '/users/1');
        assert.equal(passedVerb[0], 'PATCH');
        assert.deepEqual(passedHash[0], {
          data: {
            data : {
              type: 'users',
              id: '1',
              attributes: {
                'first-name': 'Yehuda!',
                'last-name': 'Katz'
              },
              relationships: {
                company: {
                  data: { type: 'companies', id: '2' }
                }
              }
            }
          }
        });
      });

    });
  });
});

test('update record - serialize hasMany', function(assert) {
  assert.expect(3);

  ajaxResponse([{
    data: {
      type: 'users',
      id: '1'
    }
  }]);

  env.registry.register('serializer:user', DS.JSONAPISerializer.extend({
    attrs: {
      handles: { serialize: true }
    }
  }));

  run(function() {
    var user = store.push({ data: {
      type: 'user',
      id: '1',
      attributes: {
        firstName: 'Yehuda',
        lastName: 'Katz'
      }
    } });

    var githubHandle = store.push({ data: {
      type: 'github-handle',
      id: '2',
      attributes: {
        username: 'wycats'
      }
    } });

    var twitterHandle = store.push({ data: {
      type: 'twitter-handle',
      id: '3',
      attributes: {
        nickname: '@wycats'
      }
    } });

    user.set('firstName', 'Yehuda!');

    user.get('handles').then(function(handles) {
      handles.addObject(githubHandle);
      handles.addObject(twitterHandle);

      user.save().then(function() {
        assert.equal(passedUrl[0], '/users/1');
        assert.equal(passedVerb[0], 'PATCH');
        assert.deepEqual(passedHash[0], {
          data: {
            data : {
              type: 'users',
              id: '1',
              attributes: {
                'first-name': 'Yehuda!',
                'last-name': 'Katz'
              },
              relationships: {
                handles: {
                  data: [
                    { type: 'github-handles', id: '2' },
                    { type: 'twitter-handles', id: '3' }
                  ]
                }
              }
            }
          }
        });
      });

    });
  });
});

test('fetching a belongsTo relationship link that returns null', function(assert) {
  assert.expect(3);

  ajaxResponse([{
    data: {
      type: 'post',
      id: '1',
      attributes: {
        title: 'Ember.js rocks'
      },
      relationships: {
        author: {
          links: {
            related: 'http://example.com/post/1/author'
          }
        }
      }
    }
  }, {
    data: null
  }]);

  run(function() {
    store.find('post', 1).then(function(post) {
      assert.equal(passedUrl[0], '/posts/1');
      return post.get('author');

    }).then(function(author) {
      assert.equal(passedUrl[1], 'http://example.com/post/1/author');
      assert.equal(author, null);
    });
  });
});
