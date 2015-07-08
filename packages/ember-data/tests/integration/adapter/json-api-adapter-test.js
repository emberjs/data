var env, store, adapter;
var passedUrl, passedVerb, passedHash;

var run = Ember.run;

var User, Post, Comment, PingBack, Handle, GithubHandle, TwitterHandle, Company, DevelopmentShop, DesignStudio;

module('integration/adapter/json-api-adapter - JSONAPIAdapter', {
  setup: function() {
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
      comments: DS.hasMany('comment', { async: true }),
      incomingLinks: DS.hasMany('ping-back', { async: true })
    });

    Comment = DS.Model.extend({
      text: DS.attr('string'),
      post: DS.belongsTo('post', { async: true })
    });

    PingBack = DS.Model.extend({
      post: DS.belongsTo('post', { async: true }),
      url:  DS.attr('string')
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
      'ping-back': PingBack,
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

  teardown: function() {
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

test('find a single record', function() {
  expect(3);

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
      equal(passedUrl[0], '/posts/1');

      equal(post.get('id'), '1');
      equal(post.get('title'), 'Ember.js rocks');
    });
  });
});

test('find all records with sideloaded relationships', function() {
  expect(9);

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
      equal(passedUrl[0], '/posts');

      equal(posts.get('length'), '2');
      equal(posts.get('firstObject.title'), 'Ember.js rocks');
      equal(posts.get('lastObject.title'), 'Tomster rules');

      equal(posts.get('firstObject.author.firstName'), 'Yehuda');
      equal(posts.get('lastObject.author.lastName'), 'Katz');

      equal(posts.get('firstObject.comments.length'), 0);

      equal(posts.get('lastObject.comments.firstObject.text'), 'This is the first comment');
      equal(posts.get('lastObject.comments.lastObject.text'), 'This is the second comment');
    });
  });
});

test('find many records', function() {
  expect(4);

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
      equal(passedUrl[0], '/posts');
      deepEqual(passedHash[0], { data: { filter: { id: 1 } } });

      equal(posts.get('length'), '1');
      equal(posts.get('firstObject.title'), 'Ember.js rocks');
    });
  });
});

test('find a single record with belongsTo link as object { related }', function() {
  expect(7);

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
      equal(passedUrl[0], '/posts/1');

      equal(post.get('id'), '1');
      equal(post.get('title'), 'Ember.js rocks');

      post.get('author').then(function(author) {
        equal(passedUrl[1], 'http://example.com/user/2');

        equal(author.get('id'), '2');
        equal(author.get('firstName'), 'Yehuda');
        equal(author.get('lastName'), 'Katz');
      });
    });
  });
});

test('find a single record with belongsTo link as object { data }', function() {
  expect(7);

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
      equal(passedUrl[0], '/posts/1');

      equal(post.get('id'), '1');
      equal(post.get('title'), 'Ember.js rocks');

      post.get('author').then(function(author) {
        equal(passedUrl[1], '/users/2');

        equal(author.get('id'), '2');
        equal(author.get('firstName'), 'Yehuda');
        equal(author.get('lastName'), 'Katz');
      });
    });
  });
});

test('find a single record with belongsTo link as object { data } (polymorphic)', function() {
  expect(8);

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
      equal(passedUrl[0], '/users/1');

      equal(user.get('id'), '1');
      equal(user.get('firstName'), 'Yehuda');
      equal(user.get('lastName'), 'Katz');

      user.get('company').then(function(company) {
        equal(passedUrl[1], '/development-shops/2');

        equal(company.get('id'), '2');
        equal(company.get('name'), 'Tilde');
        equal(company.get('coffee'), true);
      });
    });
  });
});

test('find a single record with sideloaded belongsTo link as object { data }', function() {
  expect(7);

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
      equal(passedUrl[0], '/posts/1');

      equal(post.get('id'), '1');
      equal(post.get('title'), 'Ember.js rocks');

      post.get('author').then(function(author) {
        equal(passedUrl.length, 1);

        equal(author.get('id'), '2');
        equal(author.get('firstName'), 'Yehuda');
        equal(author.get('lastName'), 'Katz');
      });
    });
  });
});

test('find a single record with hasMany link as object { related }', function() {
  expect(7);

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
      equal(passedUrl[0], '/posts/1');

      equal(post.get('id'), '1');
      equal(post.get('title'), 'Ember.js rocks');

      post.get('comments').then(function(comments) {
        equal(passedUrl[1], 'http://example.com/post/1/comments');

        equal(comments.get('length'), 2);
        equal(comments.get('firstObject.text'), 'This is the first comment');
        equal(comments.get('lastObject.text'), 'This is the second comment');
      });
    });
  });
});

test('find a single record with hasMany link as object { data }', function() {
  expect(8);

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
      equal(passedUrl[0], '/posts/1');

      equal(post.get('id'), '1');
      equal(post.get('title'), 'Ember.js rocks');

      post.get('comments').then(function(comments) {
        equal(passedUrl[1], '/comments/2');
        equal(passedUrl[2], '/comments/3');

        equal(comments.get('length'), 2);
        equal(comments.get('firstObject.text'), 'This is the first comment');
        equal(comments.get('lastObject.text'), 'This is the second comment');
      });
    });
  });
});

test('find a single record with hasMany link as object { data } (polymorphic)', function() {
  expect(9);

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
      equal(passedUrl[0], '/users/1');

      equal(user.get('id'), '1');
      equal(user.get('firstName'), 'Yehuda');
      equal(user.get('lastName'), 'Katz');

      user.get('handles').then(function(handles) {
        equal(passedUrl[1], '/github-handles/2');
        equal(passedUrl[2], '/twitter-handles/3');

        equal(handles.get('length'), 2);
        equal(handles.get('firstObject.username'), 'wycats');
        equal(handles.get('lastObject.nickname'), '@wycats');
      });
    });
  });
});

test('find a single record with sideloaded hasMany link as object { data }', function() {
  expect(7);

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
      equal(passedUrl[0], '/posts/1');

      equal(post.get('id'), '1');
      equal(post.get('title'), 'Ember.js rocks');

      post.get('comments').then(function(comments) {
        equal(passedUrl.length, 1);

        equal(comments.get('length'), 2);
        equal(comments.get('firstObject.text'), 'This is the first comment');
        equal(comments.get('lastObject.text'), 'This is the second comment');
      });
    });
  });
});

test('find a single record with sideloaded hasMany link as object { data } (polymorphic)', function() {
  expect(8);

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
      equal(passedUrl[0], '/users/1');

      equal(user.get('id'), '1');
      equal(user.get('firstName'), 'Yehuda');
      equal(user.get('lastName'), 'Katz');

      user.get('handles').then(function(handles) {
        equal(passedUrl.length, 1);

        equal(handles.get('length'), 2);
        equal(handles.get('firstObject.username'), 'wycats');
        equal(handles.get('lastObject.nickname'), '@wycats');
      });
    });
  });
});

test('create record', function() {
  expect(3);

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
        equal(passedUrl[0], '/users');
        equal(passedVerb[0], 'POST');
        deepEqual(passedHash[0], {
          data: {
            data : {
              type: 'users',
              attributes: {
                'first-name': 'Yehuda',
                'last-name': 'Katz'
              },
              relationships: {
                company: {
                  inverse: 'employees',
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

test('create record with belongsTo', function() {
  expect(3);

  ajaxResponse([{
    data: {
      type: 'ping-backs',
      id: '3'
    }
  }]);

  run(function() {
    var post = store.push({ data: {
      type: 'post',
      id: '1',
      attributes: {
        title: 'First posting ever!'
      }
    } });

    var pingBack = store.createRecord('ping-back', {
      url: 'http://www.example.com/first-postings',
      post: post
    });

    pingBack.save().then(function() {
      equal(passedUrl[0], '/ping-backs');
      equal(passedVerb[0], 'POST');
      deepEqual(passedHash[0], {
        data: {
          data : {
            type: 'ping-backs',
            attributes: {
              url: "http://www.example.com/first-postings"
            },
            relationships: {
              post: {
                inverse: 'incoming-links',
                data: { type: 'posts', id: '1' }
              }
            }
          }
        }
      });
    });// end save
  });
});


test('update record', function() {
  expect(3);

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
        equal(passedUrl[0], '/users/1');
        equal(passedVerb[0], 'PATCH');
        deepEqual(passedHash[0], {
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
                  inverse: 'employees',
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

test('update record - serialize hasMany', function() {
  expect(3);

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
        equal(passedUrl[0], '/users/1');
        equal(passedVerb[0], 'PATCH');
        deepEqual(passedHash[0], {
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

test('fetching a belongsTo relationship link that returns null', function() {
  expect(3);

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
      equal(passedUrl[0], '/posts/1');
      return post.get('author');

    }).then(function(author) {
      equal(passedUrl[1], 'http://example.com/post/1/author');
      equal(author, null);
    });
  });
});
