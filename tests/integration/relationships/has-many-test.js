/*eslint no-unused-vars: ["error", { "args": "none", "varsIgnorePattern": "(page)" }]*/

import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

let env, store, User, Contact, Email, Phone, Message, Post, Comment;
let Book, Chapter, Page;

const { get, run } = Ember;
const { resolve } = Ember.RSVP;
const { attr, hasMany, belongsTo } = DS;

module("integration/relationships/has_many - Has-Many Relationships", {
  beforeEach() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', { polymorphic: true, async: false }),
      contacts: hasMany('user', { inverse: null, async: false })
    });
    User.reopenClass({ toString: () => 'User' });

    Contact = DS.Model.extend({
      user: belongsTo('user', { async: false })
    });
    Contact.reopenClass({ toString: () => 'Contact' });

    Email = Contact.extend({
      email: attr('string')
    });
    Email.reopenClass({ toString: () => 'Email' });

    Phone = Contact.extend({
      number: attr('string')
    });
    Phone.reopenClass({ toString: () => 'Phone' });

    Message = DS.Model.extend({
      user: belongsTo('user', { async: false }),
      created_at: attr('date')
    });
    Message.reopenClass({ toString: () => 'Message' });

    Post = Message.extend({
      title: attr('string'),
      comments: hasMany('comment', { async: false })
    });
    Post.reopenClass({ toString: () => 'Post' });

    Comment = Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('post', { polymorphic: true, async: true })
    });
    Comment.reopenClass({ toString: () => 'Comment' });

    Book = DS.Model.extend({
      title: attr(),
      chapters: hasMany('chapter', { async: true })
    });
    Book.reopenClass({ toString: () => 'Book' });

    Chapter = DS.Model.extend({
      title: attr(),
      pages: hasMany('page', { async: false })
    });
    Chapter.reopenClass({ toString: () => 'Chapter' });

    Page = DS.Model.extend({
      number: attr('number'),
      chapter: belongsTo('chapter', { async: false })
    });
    Page.reopenClass({ toString: () => 'Page' });

    env = setupStore({
      user: User,
      contact: Contact,
      email: Email,
      phone: Phone,
      post: Post,
      comment: Comment,
      message: Message,
      book: Book,
      chapter: Chapter,
      page: Page
    });

    store = env.store;
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

test("When a hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function(assert) {
  assert.expect(0);

  let postData = {
    type: 'post',
    id: '1',
    relationships: {
      comments: {
        data: [
          { type: 'comment', id: '1' }
        ]
      }
    }
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.ok(false, "The adapter's find method should not be called");
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { data: postData };
  };

  return run(() => {
    env.store.push({
      data: postData,
      included: [{
        type: 'comment',
        id: '1'
      }]
    });

    return env.store.findRecord('post', 1).then(post => {
      return post.get('comments');
    });
  });
});

test("hasMany + canonical vs currentState + destroyRecord  ", function(assert) {
  assert.expect(6);

  let postData = {
    type: 'user',
    id: '1',
    attributes: {
      name: 'omg'
    },
    relationships: {
      contacts: {
        data: [
          {
            type: 'user',
            id: 2
          },
          {
            type: 'user',
            id: 3
          },
          {
            type: 'user',
            id: 4
          }
        ]
      }
    }
  };

  run(() => {
    env.store.push({
      data: postData,
      included: [
        {
          type: 'user',
          id: 2
        },
        {
          type: 'user',
          id: 3
        },
        {
          type: 'user',
          id: 4
        }
      ]
    });
  });

  let user = env.store.peekRecord('user', 1);
  let contacts = user.get('contacts');

  env.store.adapterFor('user').deleteRecord = function() {
    return { data: { type: 'user', id: 2 } };
  };

  assert.deepEqual(contacts.map(c => c.get('id')), ['2','3','4'], 'user should have expected contacts');

  run(() => {
    contacts.addObject(env.store.createRecord('user', { id: 5 }));
    contacts.addObject(env.store.createRecord('user', { id: 6 }));
    contacts.addObject(env.store.createRecord('user', { id: 7 }));
  });

  assert.deepEqual(contacts.map(c => c.get('id')), ['2','3','4','5','6','7'], 'user should have expected contacts');

  run(() => {
    env.store.peekRecord('user', 2).destroyRecord();
    env.store.peekRecord('user', 6).destroyRecord();
  });

  assert.deepEqual(contacts.map(c => c.get('id')), ['3','4','5','7'], `user's contacts should have expected contacts`);
  assert.equal(contacts, user.get('contacts'));

  run(() => {
    contacts.addObject(env.store.createRecord('user', { id: 8 }));
  });

  assert.deepEqual(contacts.map(c => c.get('id')), ['3','4','5','7','8'], `user's contacts should have expected contacts`);
  assert.equal(contacts, user.get('contacts'));
});

test("hasMany + canonical vs currentState + unloadRecord", function(assert) {
  assert.expect(6);

  let postData = {
    type: 'user',
    id: '1',
    attributes: {
      name: 'omg'
    },
    relationships: {
      contacts: {
        data: [
          {
            type: 'user',
            id: 2
          },
          {
            type: 'user',
            id: 3
          },
          {
            type: 'user',
            id: 4
          }
        ]
      }
    }
  };

  run(() => {
    env.store.push({
      data: postData,
      included: [
        {
          type: 'user',
          id: 2
        },
        {
          type: 'user',
          id: 3
        },
        {
          type: 'user',
          id: 4
        }
      ]
    });
  });

  let user = env.store.peekRecord('user', 1);
  let contacts = user.get('contacts');

  env.store.adapterFor('user').deleteRecord = function() {
    return { data: { type: 'user', id: 2 } };
  };

  assert.deepEqual(contacts.map(c => c.get('id')), ['2','3','4'], 'user should have expected contacts');

  run(() => {
    contacts.addObject(env.store.createRecord('user', { id: 5 }));
    contacts.addObject(env.store.createRecord('user', { id: 6 }));
    contacts.addObject(env.store.createRecord('user', { id: 7 }));
  });

  assert.deepEqual(contacts.map(c => c.get('id')), ['2','3','4','5','6','7'], 'user should have expected contacts');

  run(() => {
    env.store.peekRecord('user', 2).unloadRecord();
    env.store.peekRecord('user', 6).unloadRecord();
  });

  assert.deepEqual(contacts.map(c => c.get('id')), ['3','4','5','7'], `user's contacts should have expected contacts`);
  assert.equal(contacts, user.get('contacts'));

  run(() => {
    contacts.addObject(env.store.createRecord('user', { id: 8 }));
  });

  assert.deepEqual(contacts.map(c => c.get('id')), ['3','4','5','7','8'], `user's contacts should have expected contacts`);
  assert.equal(contacts, user.get('contacts'));
});

test("adapter.findMany only gets unique IDs even if duplicate IDs are present in the hasMany relationship", function(assert) {
  assert.expect(2);

  let bookData = {
    type: 'book',
    id: '1',
    relationships: {
      chapters: {
        data: [
          { type: 'chapter', id: '2' },
          { type: 'chapter', id: '3' },
          { type: 'chapter', id: '3' }
        ]
      }
    }
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.equal(type, Chapter, 'type passed to adapter.findMany is correct');
    assert.deepEqual(ids, ['2', '3'], 'ids passed to adapter.findMany are unique');

    return Ember.RSVP.resolve({
      data: [
        { id: 2, type: 'chapter', attributes: { title: 'Chapter One' } },
        { id: 3, type: 'chapter', attributes: { title: 'Chapter Two' } }
      ]
    });
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { data: bookData };
  };

  return run(() => {
    env.store.push({
      data: bookData
    });

    return env.store.findRecord('book', 1).then(book => {
      return book.get('chapters');
    });
  });
});

// This tests the case where a serializer materializes a has-many
// relationship as a internalModel that it can fetch lazily. The most
// common use case of this is to provide a URL to a collection that
// is loaded later.
test("A serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  // When the store asks the adapter for the record with ID 1,
  // provide some fake data.
  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, "find type was Post");
    assert.equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: {
              related: "/posts/1/comments"
            }
          }
        }
      }
    });
  };
  //({ id: 1, links: { comments: "/posts/1/comments" } });

  env.adapter.findMany = function(store, type, ids, snapshots) {
    throw new Error("Adapter's findMany should not be called");
  };

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    assert.equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");
    assert.equal(relationship.type, "comment", "relationship was passed correctly");

    return Ember.RSVP.resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: "First" } },
        { id: 2, type: 'comment', attributes: { body: "Second" } }
      ]
    });
  };

  return run(() => {
    return env.store.findRecord('post', 1).then(post => {
      return post.get('comments');
    }).then(comments => {
      assert.equal(comments.get('isLoaded'), true, "comments are loaded");
      assert.equal(comments.get('length'), 2, "comments have 2 length");
      assert.equal(comments.objectAt(0).get('body'), 'First', "comment loaded successfully");
    });
  });
});

test("Accessing a hasMany backed by a link multiple times triggers only one request", function(assert) {
  assert.expect(2);
  let count = 0;
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });
  let post;

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    count++;
    assert.equal(count, 1, "findHasMany has only been called once");
    return new Ember.RSVP.Promise((resolve, reject) => {
      setTimeout(() => {
        let value = {
          data: [
            { id: 1, type: 'comment', attributes: { body: "First" } },
            { id: 2, type: 'comment', attributes: { body: "Second" } }
          ]
        };
        resolve(value);
      }, 100);
    });
  };

  let promise1, promise2;

  run(() => {
    promise1 = post.get('comments');
    //Invalidate the post.comments CP
    env.store.push({
      data: {
        type: 'comment',
        id: '1',
        relationships: {
          message: {
            data: { type: 'post', id: '1' }
          }
        }
      }
    });
    promise2 = post.get('comments');
  });

  return Ember.RSVP.all([
    promise1,
    promise2
  ]).then(() => {
    assert.equal(promise1.promise, promise2.promise, "Same promise is returned both times");
  });
});

test("A hasMany backed by a link remains a promise after a record has been added to it", function(assert) {
  assert.expect(1);
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: "First" } },
        { id: 2, type: 'comment', attributes: { body: "Second" } }
      ]
    });
  };
  let post;
  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  return run(() => {
    return post.get('comments').then(() => {
      env.store.push({
        data: {
          type: 'comment',
          id: '3',
          relationships: {
            message: {
              data: { type: 'post', id: '1' }
            }
          }
        }
      });

      return post.get('comments').then(() => {
        assert.ok(true, 'Promise was called');
      });
    });
  });
});

test("A hasMany updated link should not remove new children", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: [] });
  };

  env.adapter.createRecord = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: '/some/link' }
          }
        }
      }
    });
  };

  return run(() => {
    let post = env.store.createRecord('post', {});
    env.store.createRecord('comment', { message: post });

    return post.get('comments')
      .then(comments => {
        assert.equal(comments.get('length'), 1);

        return post.save();
      })
      .then(() => post.get('comments'))
      .then(comments => {
        assert.equal(comments.get('length'), 1);
      });
  });
});

test("A hasMany updated link should not remove new children when the parent record has children already", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: [
      { id: 5, type: 'comment', attributes: { body: 'hello' } }
    ]});
  };

  env.adapter.createRecord = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: '/some/link' }
          }
        }
      }
    });
  };

  return run(() => {
    let post = env.store.createRecord('post', {});
    env.store.createRecord('comment', { message: post });

    return post.get('comments')
      .then(comments => {
        assert.equal(comments.get('length'), 1);
        return post.save();
      })
      .then(() =>post.get('comments'))
      .then(comments => {
        assert.equal(comments.get('length'), 2);
      });
  });
});

test("A hasMany relationship doesn't contain duplicate children, after the canonical state of the relationship is updated via store#push", function(assert) {

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });

  env.adapter.createRecord = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: { id: 1, type: 'post' } });
  };

  return run(() => {
    let post = env.store.createRecord('post', {});

    // create a new comment with id 'local', which is in the 'comments'
    // relationship of post
    let localComment = env.store.createRecord('comment', { id: 'local', message: post });

    return post.get('comments')
      .then(comments => {
        assert.equal(comments.get('length'), 1);
        assert.equal(localComment.get('isNew'), true);

        return post.save();
      })
      .then(() => {

        // Now the post is saved but the locally created comment with the id
        // 'local' is still in the created state since it hasn't been saved
        // yet.
        //
        // As next we are pushing the post into the store again, having the
        // locally created comment in the 'comments' relationship. By this the
        // canonical state of the relationship is defined to consist of one
        // comment: the one with id 'local'.
        //
        // This setup is needed to demonstrate the bug which has been fixed
        // in #4154, where the locally created comment was duplicated in the
        // comment relationship.
        env.store.push({
          data: {
            type: 'post',
            id: 1,
            relationships: {
              comments: {
                data: [
                  { id: 'local', type: 'comment' }
                ]
              }
            }
          }
        });

      })
      .then(() => post.get('comments'))
      .then(comments => {
        assert.equal(comments.get('length'), 1);
        assert.equal(localComment.get('isNew'), true);
      });
  });
});


test("A hasMany relationship can be reloaded if it was fetched via a link", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, "find type was Post");
    assert.equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: "/posts/1/comments" }
          }
        }
      }
    });
  };

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    assert.equal(relationship.type, 'comment', "findHasMany relationship type was Comment");
    assert.equal(relationship.key, 'comments', "findHasMany relationship key was comments");
    assert.equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "First" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };

  run(function() {
    run(env.store, 'findRecord', 'post', 1).then(function(post) {
      return post.get('comments');
    }).then(function(comments) {
      assert.equal(comments.get('isLoaded'), true, "comments are loaded");
      assert.equal(comments.get('length'), 2, "comments have 2 length");

      env.adapter.findHasMany = function(store, snapshot, link, relationship) {
        assert.equal(relationship.type, 'comment', "findHasMany relationship type was Comment");
        assert.equal(relationship.key, 'comments', "findHasMany relationship key was comments");
        assert.equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

        return Ember.RSVP.resolve({ data: [
          { id: 1, type: 'comment', attributes: { body: "First" } },
          { id: 2, type: 'comment', attributes: { body: "Second" } },
          { id: 3, type: 'comment', attributes: { body: "Thirds" } }
        ]});
      };

      return comments.reload();
    }).then(function(newComments) {
      assert.equal(newComments.get('length'), 3, "reloaded comments have 3 length");
    });
  });
});

test("A sync hasMany relationship can be reloaded if it was fetched via ids", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: false })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, "find type was Post");
    assert.equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            data: [
              { id: 1, type: 'comment' },
              { id: 2, type: 'comment' }
            ]
          }
        }
      }
    });
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second'
        }
      }]
    });

    env.store.findRecord('post', '1').then(function(post) {
      let comments = post.get('comments');
      assert.equal(comments.get('isLoaded'), true, "comments are loaded");
      assert.equal(comments.get('length'), 2, "comments have a length of 2");

      env.adapter.findMany = function(store, type, ids, snapshots) {
        return Ember.RSVP.resolve({ data: [
          { id: 1, type: 'comment', attributes: { body: "FirstUpdated" } },
          { id: 2, type: 'comment', attributes: { body: "Second" } }
        ]});
      };

      return comments.reload();
    }).then(function(newComments) {
      assert.equal(newComments.get('firstObject.body'), 'FirstUpdated', "Record body was correctly updated");
    });
  });
});

test("A hasMany relationship can be reloaded if it was fetched via ids", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, "find type was Post");
    assert.equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: 1, type: 'comment' }, { id: 2, type: 'comment' }]
          }
        }
      }
    });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "First" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };

  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
      return post.get('comments');
    }).then(function(comments) {
      assert.equal(comments.get('isLoaded'), true, "comments are loaded");
      assert.equal(comments.get('length'), 2, "comments have 2 length");

      env.adapter.findMany = function(store, type, ids, snapshots) {
        return Ember.RSVP.resolve({ data: [
          { id: 1, type: 'comment', attributes: { body: "FirstUpdated" } },
          { id: 2, type: 'comment', attributes: { body: "Second" } }
        ]});
      };

      return comments.reload();
    }).then(function(newComments) {
      assert.equal(newComments.get('firstObject.body'), 'FirstUpdated', "Record body was correctly updated");
    });
  });
});

test("A hasMany relationship can be reloaded even if it failed at the first time", function(assert) {
  assert.expect(4);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findRecord = function(store, type, id) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: "/posts/1/comments" }
          }
        }
      }
    });
  };

  let loadingCount = -1;
  env.adapter.findHasMany = function(store, record, link, relationship) {
    loadingCount++;
    if (loadingCount % 2 === 0) {
      return Ember.RSVP.reject();
    } else {
      return Ember.RSVP.resolve({ data: [
        { id: 1, type: 'comment', attributes: { body: "FirstUpdated" } },
        { id: 2, type: 'comment', attributes: { body: "Second" } }
      ]});
    }
  };
  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
      let comments = post.get('comments');
      return comments.catch(function() {
        return comments.reload();
      }).then(function(manyArray) {
        assert.equal(manyArray.get('isLoaded'), true, "the reload worked, comments are now loaded");
        return manyArray.reload().catch(function () {
          assert.equal(manyArray.get('isLoaded'), true, "the second reload failed, comments are still loaded though");
          return manyArray.reload().then(function(reloadedManyArray) {
            assert.equal(reloadedManyArray.get('isLoaded'), true, "the third reload worked, comments are loaded again");
            assert.ok(reloadedManyArray === manyArray, "the many array stays the same");
          });
        });
      });
    });
  });
});

test("A hasMany relationship can be directly reloaded if it was fetched via links", function(assert) {
  assert.expect(6);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findRecord = function(store, type, id) {
    assert.equal(type, Post, "find type was Post");
    assert.equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: "/posts/1/comments" }
          }
        }
      }
    });
  };

  env.adapter.findHasMany = function(store, record, link, relationship) {
    assert.equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "FirstUpdated" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };
  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
      return post.get('comments').reload().then(function(comments) {
        assert.equal(comments.get('isLoaded'), true, "comments are loaded");
        assert.equal(comments.get('length'), 2, "comments have 2 length");
        assert.equal(comments.get('firstObject.body'), "FirstUpdated", "Record body was correctly updated");
      });
    });
  });
});

test("Has many via links - Calling reload multiple times does not send a new request if the first one is not settled", function(assert) {
  assert.expect(1);
  let done = assert.async();

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findRecord = function(store, type, id) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: "/posts/1/comments" }
          }
        }
      }
    });
  };

  let count = 0;
  env.adapter.findHasMany = function(store, record, link, relationship) {
    count++;
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "First" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };
  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
      post.get('comments').then(function(comments) {
        Ember.RSVP.all([comments.reload(), comments.reload(), comments.reload()]).then(function(comments) {
          assert.equal(count, 2, "One request for the original access and only one request for the mulitple reloads");
          done();
        });
      });
    });
  });
});

test("A hasMany relationship can be directly reloaded if it was fetched via ids", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, "find type was Post");
    assert.equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: 1, type: 'comment' }, { id: 2, type: 'comment' }]
          }
        }
      }
    });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "FirstUpdated" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };

  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
      return post.get('comments').reload().then(function(comments) {
        assert.equal(comments.get('isLoaded'), true, "comments are loaded");
        assert.equal(comments.get('length'), 2, "comments have 2 length");
        assert.equal(comments.get('firstObject.body'), "FirstUpdated", "Record body was correctly updated");
      });
    });
  });
});

test("Has many via ids - Calling reload multiple times does not send a new request if the first one is not settled", function(assert) {
  assert.expect(1);
  let done = assert.async();

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: 1, type: 'comment' }, { id: 2, type: 'comment' }]
          }
        }
      }
    });
  };

  let count = 0;
  env.adapter.findMany = function(store, type, ids, snapshots) {
    count++;
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "FirstUpdated" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };

  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
      post.get('comments').then(function(comments) {
        Ember.RSVP.all([comments.reload(), comments.reload(), comments.reload()]).then(function(comments) {
          assert.equal(count, 2, "One request for the original access and only one request for the mulitple reloads");
          done();
        });
      });
    });
  });
});

test("PromiseArray proxies createRecord to its ManyArray once the hasMany is loaded", function(assert) {
  assert.expect(4);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "First" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };
  let post;

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: 'someLink'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  run(function() {
    post.get('comments').then(function(comments) {
      assert.equal(comments.get('isLoaded'), true, "comments are loaded");
      assert.equal(comments.get('length'), 2, "comments have 2 length");

      let newComment = post.get('comments').createRecord({ body: 'Third' });
      assert.equal(newComment.get('body'), 'Third', "new comment is returned");
      assert.equal(comments.get('length'), 3, "comments have 3 length, including new record");
    });
  });
});

test("PromiseArray proxies evented methods to its ManyArray", function(assert) {
  assert.expect(6);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "First" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };
  let post, comments;

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: 'someLink'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
    comments = post.get('comments');
  });


  comments.on('on-event', function() {
    assert.ok(true);
  });

  run(function() {
    comments.trigger('on-event');
  });

  assert.equal(comments.has('on-event'), true);

  comments.on('off-event', function() {
    assert.ok(false);
  });

  comments.off('off-event');

  assert.equal(comments.has('off-event'), false);

  comments.one('one-event', function() {
    assert.ok(true);
  });

  assert.equal(comments.has('one-event'), true);

  run(function() {
    comments.trigger('one-event');
  });

  assert.equal(comments.has('one-event'), false);
});

test("An updated `links` value should invalidate a relationship cache", function(assert) {
  assert.expect(8);
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    assert.equal(relationship.type, "comment", "relationship was passed correctly");

    if (link === '/first') {
      return Ember.RSVP.resolve({ data: [
        { id: 1, type: 'comment', attributes: { body: "First" } },
        { id: 2, type: 'comment', attributes: { body: "Second" } }
      ]});
    } else if (link === '/second') {
      return Ember.RSVP.resolve({ data: [
        { id: 3, type: 'comment', attributes: { body: "Third" } },
        { id: 4, type: 'comment', attributes: { body: "Fourth" } },
        { id: 5, type: 'comment', attributes: { body: "Fifth" } }
      ]});
    }
  };
  let post;

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: '/first'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  run(function() {
    post.get('comments').then(function(comments) {
      assert.equal(comments.get('isLoaded'), true, "comments are loaded");
      assert.equal(comments.get('length'), 2, "comments have 2 length");
      assert.equal(comments.objectAt(0).get('body'), 'First', "comment 1 successfully loaded");
      env.store.push({
        data: {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              links: {
                related: '/second'
              }
            }
          }
        }
      });
      post.get('comments').then(function(newComments) {
        assert.equal(comments, newComments, "hasMany array was kept the same");
        assert.equal(newComments.get('length'), 3, "comments updated successfully");
        assert.equal(newComments.objectAt(0).get('body'), 'Third', "third comment loaded successfully");
      });
    });
  });
});

test("When a polymorphic hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function(assert) {
  assert.expect(1);

  let userData = {
    type: 'user',
    id: '1',
    relationships: {
      messages: {
        data: [
          { type: 'post', id: '1' },
          { type: 'comment', id: '3' }
        ]
      }
    }
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.ok(false, "The adapter's find method should not be called");
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { data: userData };
  };

  run(function() {
    env.store.push({
      data: userData,
      included: [{
        type: 'post',
        id: '1'
      }, {
        type: 'comment',
        id: '3'
      }]
    });
  });

  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      let messages = user.get('messages');
      assert.equal(messages.get('length'), 2, "The messages are correctly loaded");
    });
  });
});

test("When a polymorphic hasMany relationship is accessed, the store can call multiple adapters' findMany or find methods if the records are not loaded", function(assert) {
  User.reopen({
    messages: hasMany('message', { polymorphic: true, async: true })
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Post) {
      return Ember.RSVP.resolve({ data: { id: 1, type: 'post' } });
    } else if (type === Comment) {
      return Ember.RSVP.resolve({ data: { id: 3, type: 'comment' } });
    }
  };

  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: [
              { type: 'post', id: '1' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });

  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      return user.get('messages');
    }).then(function(messages) {
      assert.equal(messages.get('length'), 2, "The messages are correctly loaded");
    });
  });
});

test("polymorphic hasMany type-checks check the superclass when MODEL_FACTORY_INJECTIONS is enabled", function(assert) {
  assert.expect(1);

  let injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    run(function () {
      let igor = env.store.createRecord('user', { name: 'Igor' });
      let comment = env.store.createRecord('comment', { body: "Well I thought the title was fine" });

      igor.get('messages').addObject(comment);

      assert.equal(igor.get('messages.firstObject.body'), "Well I thought the title was fine");
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});



test("Type can be inferred from the key of a hasMany relationship", function(assert) {
  assert.expect(1);

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return {
      data: {
        id: 1,
        type: 'user',
        relationships: {
          contacts: {
            data: [{ id: 1, type: 'contact' }]
          }
        }
      }
    };
  };

  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          contacts: {
            data: [
              { type: 'contact', id: '1' }
            ]
          }
        }
      },
      included: [{
        type: 'contact',
        id: '1'
      }]
    });
  });
  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      assert.equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
    });
  });
});

test("Type can be inferred from the key of an async hasMany relationship", function(assert) {
  assert.expect(1);

  User.reopen({
    contacts: DS.hasMany({ async: true })
  });

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return {
      data: {
        id: 1,
        type: 'user',
        relationships: {
          contacts: {
            data: [{ id: 1, type: 'contact' }]
          }
        }
      }
    };
  };

  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          contacts: {
            data: [
              { type: 'contact', id: '1' }
            ]
          }
        }
      },
      included: [{
        type: 'contact',
        id: '1'
      }]
    });
  });
  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      assert.equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
    });
  });
});

test("Polymorphic relationships work with a hasMany whose type is inferred", function(assert) {
  User.reopen({
    contacts: DS.hasMany({ polymorphic: true, async: false })
  });

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { data: { id: 1, type: 'user' } };
  };

  assert.expect(1);
  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          contacts: {
            data: [
              { type: 'email', id: '1' },
              { type: 'phone', id: '2' }
            ]
          }
        }
      },
      included: [{
        type: 'email',
        id: '1'
      }, {
        type: 'phone',
        id: '2'
      }]
    });
  });
  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      assert.equal(contacts.get('length'), 2, "The contacts relationship is correctly set up");
    });
  });
});

test("Polymorphic relationships with a hasMany is set up correctly on both sides", function(assert) {
  assert.expect(2);

  Contact.reopen({
    posts: DS.hasMany('post', { async: false })
  });

  Post.reopen({
    contact: DS.belongsTo('contact', { polymorphic: true, async: false })
  });
  let email, post;

  run(function () {
    email = env.store.createRecord('email');
    post = env.store.createRecord('post', {
      contact: email
    });
  });

  assert.equal(post.get('contact'), email, 'The polymorphic belongsTo is set up correctly');
  assert.equal(get(email, 'posts.length'), 1, "The inverse has many is set up correctly on the email side.");
});

testInDebug("A record can't be created from a polymorphic hasMany relationship", function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: []
          }
        }
      }
    });
  });

  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      return user.get('messages');
    }).then(function(messages) {
      assert.expectAssertion(function() {
        messages.createRecord();
      }, /You cannot add 'message' records to this polymorphic relationship/);
    });
  });
});

testInDebug("Only records of the same type can be added to a monomorphic hasMany relationship", function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: []
          }
        }
      }, {
        type: 'post',
        id: '2'
      }]
    });
  });

  run(function() {
    Ember.RSVP.all([
      env.store.findRecord('post', 1),
      env.store.findRecord('post', 2)
    ]).then(function(records) {
      assert.expectAssertion(function() {
        records[0].get('comments').pushObject(records[1]);
      }, /You cannot add a record of modelClass 'post' to the 'post.comments' relationship \(only 'comment' allowed\)/);
    });
  });
});

testInDebug("Only records of the same base modelClass can be added to a polymorphic hasMany relationship", function(assert) {
  assert.expect(2);
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: [{
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: []
          }
        }
      }, {
        type: 'user',
        id: '2',
        relationships: {
          messages: {
            data: []
          }
        }
      }],
      included: [{
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: []
          }
        }
      }, {
        type: 'comment',
        id: '3'
      }]
    });
  });
  let asyncRecords;

  run(function() {
    asyncRecords = Ember.RSVP.hash({
      user: env.store.findRecord('user', 1),
      anotherUser: env.store.findRecord('user', 2),
      post: env.store.findRecord('post', 1),
      comment: env.store.findRecord('comment', 3)
    });

    asyncRecords.then(function(records) {
      records.messages = records.user.get('messages');
      return Ember.RSVP.hash(records);
    }).then(function(records) {
      records.messages.pushObject(records.post);
      records.messages.pushObject(records.comment);
      assert.equal(records.messages.get('length'), 2, "The messages are correctly added");

      assert.expectAssertion(function() {
        records.messages.pushObject(records.anotherUser);
      }, /You cannot add a record of modelClass 'user' to the 'user.messages' relationship \(only 'message' allowed\)/);
    });
  });
});

test("A record can be removed from a polymorphic association", function(assert) {
  assert.expect(4);
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: [
              { type: 'comment', id: '3' }
            ]
          }
        }
      },
      included: [{
        type: 'comment',
        id: '3'
      }]
    });
  });
  let asyncRecords;

  run(function() {
    asyncRecords = Ember.RSVP.hash({
      user: env.store.findRecord('user', 1),
      comment: env.store.findRecord('comment', 3)
    });

    asyncRecords.then(function(records) {
      records.messages = records.user.get('messages');
      return Ember.RSVP.hash(records);
    }).then(function(records) {
      assert.equal(records.messages.get('length'), 1, "The user has 1 message");

      let removedObject = records.messages.popObject();

      assert.equal(removedObject, records.comment, "The message is correctly removed");
      assert.equal(records.messages.get('length'), 0, "The user does not have any messages");
      assert.equal(records.messages.objectAt(0), null, "No messages can't be fetched");
    });
  });
});

test("When a record is created on the client, its hasMany arrays should be in a loaded state", function(assert) {
  assert.expect(3);

  let post;

  run(function() {
    post = env.store.createRecord('post');
  });

  assert.ok(get(post, 'isLoaded'), "The post should have isLoaded flag");
  let comments;
  run(function() {
    comments = get(post, 'comments');
  });

  assert.equal(get(comments, 'length'), 0, "The comments should be an empty array");

  assert.ok(get(comments, 'isLoaded'), "The comments should have isLoaded flag");
});

test("When a record is created on the client, its async hasMany arrays should be in a loaded state", function(assert) {
  assert.expect(4);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  let post = run(function() {
    return env.store.createRecord('post');
  });

  assert.ok(get(post, 'isLoaded'), "The post should have isLoaded flag");

  run(function() {
    get(post, 'comments').then(function(comments) {
      assert.ok(true, "Comments array successfully resolves");
      assert.equal(get(comments, 'length'), 0, "The comments should be an empty array");
      assert.ok(get(comments, 'isLoaded'), "The comments should have isLoaded flag");
    });
  });
});

test("we can set records SYNC HM relationship", function(assert) {
  assert.expect(1);
  let post = run(function() {
    return env.store.createRecord('post');
  });
  run(function() {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second'
        }
      }]
    });
    post.set('comments', env.store.peekAll('comment'));
  });
  assert.equal(get(post, 'comments.length'), 2, "we can set HM relationship");
});


test("We can set records ASYNC HM relationship", function(assert) {
  assert.expect(1);
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  let post = run(function() {
    return env.store.createRecord('post');
  });
  run(function() {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second'
        }
      }]
    });
    post.set('comments', env.store.peekAll('comment'));
  });

  return post.get('comments').then(comments => {
    assert.equal(comments.get('length')  , 2, "we can set async HM relationship");
  });
});

test("When a record is saved, its unsaved hasMany records should be kept", function(assert) {
  assert.expect(1);

  let post, comment;

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ data: { id: 1, type: snapshot.modelName } });
  };

  return run(() => {
    post = env.store.createRecord('post');
    comment = env.store.createRecord('comment');
    post.get('comments').pushObject(comment);
    return post.save();
  }).then(() => {
    assert.equal(get(post, 'comments.length'), 1, "The unsaved comment should be in the post's comments array");
  });
});

test("dual non-async HM <-> BT", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post', async: false })
  });

  Comment.reopen({
    post: DS.belongsTo('post', { async: false })
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    let serialized = snapshot.record.serialize();
    serialized.data.id = 2;
    return Ember.RSVP.resolve(serialized);
  };
  let post, firstComment;

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });
    env.store.push({
      data: {
        type: 'comment',
        id: '1',
        relationships: {
          comments: {
            post: { type: 'post', id: '1' }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
    firstComment = env.store.peekRecord('comment', 1);

    env.store.createRecord('comment', {
      post: post
    }).save().then(function(comment) {
      let commentPost = comment.get('post');
      let postComments = comment.get('post.comments');
      let postCommentsLength = comment.get('post.comments.length');

      assert.deepEqual(post, commentPost, 'expect the new comments post, to be the correct post');
      assert.ok(postComments, "comments should exist");
      assert.equal(postCommentsLength, 2, "comment's post should have a internalModel back to comment");
      assert.ok(postComments && postComments.indexOf(firstComment) !== -1, 'expect to contain first comment');
      assert.ok(postComments && postComments.indexOf(comment) !== -1, 'expected to contain the new comment');
    });
  });
});

test("When an unloaded record is added to the hasMany, it gets fetched once the hasMany is accessed even if the hasMany has been already fetched", function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: 'first' } },
      { id: 2, type: 'comment', attributes: { body: 'second' } }
    ]});
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({ data: { id: 3, type: 'comment', attributes: { body: 'third' } } });
  };
  let post;

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  return run(() => {
    return post.get('comments').then(fetchedComments => {
      assert.equal(fetchedComments.get('length'), 2, 'comments fetched successfully');
      assert.equal(fetchedComments.objectAt(0).get('body'), 'first', 'first comment loaded successfully');
      env.store.push({
        data: {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
                { type: 'comment', id: '3' }
              ]
            }
          }
        }
      });

      return post.get('comments').then(newlyFetchedComments => {
        assert.equal(newlyFetchedComments.get('length'), 3, 'all three comments fetched successfully');
        assert.equal(newlyFetchedComments.objectAt(2).get('body'), 'third', 'third comment loaded successfully');
      });
    });
  });
});

testInDebug('A sync hasMany errors out if there are unlaoded records in it', function(assert) {
  let post = run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }
    });
    return env.store.peekRecord('post', 1);
  });

  assert.expectAssertion(() => {
    run(post, 'get', 'comments');
  }, /You looked up the 'comments' relationship on a 'post' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \('DS.hasMany\({ async: true }\)'\)/);
});

test('After removing and unloading a record, a hasMany relationship should still be valid', function(assert) {
  const post = run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' }
            ]
          }
        }
      },
      included: [
        { type: 'comment', id: '1' }
      ]
    });
    const post = env.store.peekRecord('post', 1);
    const comments = post.get('comments');
    const comment = comments.objectAt(0);
    comments.removeObject(comment);
    env.store.unloadRecord(comment);
    assert.equal(comments.get('length'), 0);
    return post;
  });

  // Explicitly re-get comments
  assert.equal(run(post, 'get', 'comments.length'), 0);
});

test("If reordered hasMany data has been pushed to the store, the many array reflects the ordering change - sync", function(assert) {
  let comment1, comment2, comment3, comment4;
  let post;

  run(() => {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1'
      }, {
        type: 'comment',
        id: '2'
      }, {
        type: 'comment',
        id: '3'
      }, {
        type: 'comment',
        id: '4'
      }]
    });

    comment1 = env.store.peekRecord('comment', 1);
    comment2 = env.store.peekRecord('comment', 2);
    comment3 = env.store.peekRecord('comment', 3);
    comment4 = env.store.peekRecord('comment', 4);
  });

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);

    assert.deepEqual(post.get('comments').toArray(), [comment1, comment2], 'Initial ordering is correct');
  });

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '2' },
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });
  });
  assert.deepEqual(post.get('comments').toArray(), [comment2, comment1], 'Updated ordering is correct');

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '2' }
            ]
          }
        }
      }
    });
  });
  assert.deepEqual(post.get('comments').toArray(), [comment2], 'Updated ordering is correct');

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
              { type: 'comment', id: '4' }
            ]
          }
        }
      }
    });
  });
  assert.deepEqual(post.get('comments').toArray(), [comment1, comment2, comment3, comment4], 'Updated ordering is correct');

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '4' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });
  assert.deepEqual(post.get('comments').toArray(), [comment4, comment3], 'Updated ordering is correct');

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '4' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });
  });

  assert.deepEqual(post.get('comments').toArray(), [comment4, comment2, comment3, comment1], 'Updated ordering is correct');
});

test("Rollbacking attributes for deleted record restores implicit relationship correctly when the hasMany side has been deleted - async", function(assert) {
  let book, chapter;

  run(() => {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        attributes: {
          title: "Stanley's Amazing Adventures"
        },
        relationships: {
          chapters: {
            data: [
              { type: 'chapter', id: '2' }
            ]
          }
        }
      },
      included: [{
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        }
      }]
    });
    book = env.store.peekRecord('book', 1);
    chapter = env.store.peekRecord('chapter', 2);
  });

  run(() => {
    chapter.deleteRecord();
    chapter.rollbackAttributes();
  });

  return run(() => {
    return book.get('chapters').then(fetchedChapters => {
      assert.equal(fetchedChapters.objectAt(0), chapter, 'Book has a chapter after rollback attributes');
    });
  });
});

test("Rollbacking attributes for deleted record restores implicit relationship correctly when the hasMany side has been deleted - sync", function(assert) {
  let book, chapter;

  run(() => {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        attributes: {
          title: "Stanley's Amazing Adventures"
        },
        relationships: {
          chapters: {
            data: [
              { type: 'chapter', id: '2' }
            ]
          }
        }
      },
      included: [{
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        }
      }]
    });
    book = env.store.peekRecord('book', 1);
    chapter = env.store.peekRecord('chapter', 2);
  });

  run(() => {
    chapter.deleteRecord();
    chapter.rollbackAttributes();
  });

  run(() => {
    assert.equal(book.get('chapters.firstObject'), chapter, "Book has a chapter after rollback attributes");
  });
});

test("Rollbacking attributes for deleted record restores implicit relationship correctly when the belongsTo side has been deleted - async", function(assert) {
  Page.reopen({
    chapter: DS.belongsTo('chapter', { async: true })
  });

  let chapter, page;

  run(() => {
    env.store.push({
      data: {
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        }
      },
      included: [{
        type: 'page',
        id: '3',
        attributes: {
          number: 1
        },
        relationships: {
          chapter: {
            data: { type: 'chapter', id: '2' }
          }
        }
      }]
    });
    chapter = env.store.peekRecord('chapter', 2);
    page = env.store.peekRecord('page', 3);
  });

  run(() => {
    chapter.deleteRecord();
    chapter.rollbackAttributes();
  });

  return run(() => {
    return page.get('chapter').then(fetchedChapter => {
      assert.equal(fetchedChapter, chapter, 'Page has a chapter after rollback attributes');
    });
  });
});

test("Rollbacking attributes for deleted record restores implicit relationship correctly when the belongsTo side has been deleted - sync", function(assert) {
  let chapter, page;
  run(() => {
    env.store.push({
      data: {
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        }
      },
      included: [{
        type: 'page',
        id: '3',
        attributes: {
          number: 1
        },
        relationships: {
          chapter: {
            data: { type: 'chapter', id: '2' }
          }
        }
      }]
    });
    chapter = env.store.peekRecord('chapter', 2);
    page = env.store.peekRecord('page', 3);
  });

  run(() => {
    chapter.deleteRecord();
    chapter.rollbackAttributes();
  });

  run(() => {
    assert.equal(page.get('chapter'), chapter, "Page has a chapter after rollback attributes");
  });
});

test("ManyArray notifies the array observers and flushes bindings when removing", function(assert) {
  assert.expect(2);
  let chapter, page, page2;
  let observe = false;

  run(() => {
    env.store.push({
      data: [{
        type: 'page',
        id: '1',
        attributes: {
          number: 1
        }
      }, {
        type: 'page',
        id: '2',
        attributes: {
          number: 2
        }
      }, {
        type: 'chapter',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          pages: {
            data: [
              { type: 'page', id: '1' },
              { type: 'page', id: '2' }
            ]
          }
        }
      }]
    });
    page = env.store.peekRecord('page', 1);
    page2 = env.store.peekRecord('page', 2);
    chapter = env.store.peekRecord('chapter', 1);

    chapter.get('pages').addEnumerableObserver(this, {
      willChange(pages, removing, addCount) {
        if (observe) {
          assert.equal(removing[0], page2, 'page2 is passed to willChange');
        }
      },
      didChange(pages, removeCount, adding) {
        if (observe) {
          assert.equal(removeCount, 1, 'removeCount is correct');
        }
      }
    });
  });

  run(() => {
    observe = true;
    page2.set('chapter', null);
    observe = false;
  });
});

test("ManyArray notifies the array observers and flushes bindings when adding", function(assert) {
  assert.expect(2);
  let chapter, page, page2;
  let observe = false;

  run(() => {
    env.store.push({
      data: [{
        type: 'page',
        id: '1',
        attributes: {
          number: 1
        }
      }, {
        type: 'page',
        id: '2',
        attributes: {
          number: 2
        }
      }, {
        type: 'chapter',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          pages: {
            data: [
              { type: 'page', id: '1' }
            ]
          }
        }
      }]
    });
    page = env.store.peekRecord('page', 1);
    page2 = env.store.peekRecord('page', 2);
    chapter = env.store.peekRecord('chapter', 1);

    chapter.get('pages').addEnumerableObserver(this, {
      willChange(pages, removing, addCount) {
        if (observe) {
          assert.equal(addCount, 1, 'addCount is correct');
        }
      },
      didChange(pages, removeCount, adding) {
        if (observe) {
          assert.equal(adding[0], page2, 'page2 is passed to didChange');
        }
      }
    });
  });

  run(() => {
    observe = true;
    page2.set('chapter', chapter);
    observe = false;
  });
});

testInDebug("Passing a model as type to hasMany should not work", function(assert) {
  assert.expect(1);

  assert.expectAssertion(() => {
    User = DS.Model.extend();

    Contact = DS.Model.extend({
      users: hasMany(User, { async: false })
    });
  }, /The first argument to DS.hasMany must be a string/);
});

test("Relationship.clear removes all records correctly", function(assert) {
  let post;

  Comment.reopen({
    post: DS.belongsTo('post', { async: false })
  });

  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post', async: false })
  });

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }, {
        type: 'comment',
        id: '1',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }, {
        type: 'comment',
        id: '2',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }, {
        type: 'comment',
        id: '3',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }]
    });
    post = env.store.peekRecord('post', 2);
  });

  run(() => {
    // unclear what the semantics of clearing a yet to be created relationship
    // ought to be.
    env.store.peekAll('comment').mapBy('post');

    post._internalModel._relationships.get('comments').clear();
    let comments = Ember.A(env.store.peekAll('comment'));
    assert.deepEqual(comments.mapBy('post'), [null, null, null]);
  });
});

test('unloading a record with associated records does not prevent the store from tearing down', function(assert) {
  let post;

  Comment.reopen({
    post: DS.belongsTo('post', { async: false })
  });

  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post', async: false })
  });

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }, {
        type: 'comment',
        id: '1',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }, {
        type: 'comment',
        id: '2',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }]
    });
    post = env.store.peekRecord('post', 2);

    // This line triggers the original bug that gets manifested
    // in teardown for apps, e.g. store.destroy that is caused by
    // App.destroy().
    // Relationship#clear uses Ember.Set#forEach, which does incorrect
    // iteration when the set is being mutated (in our case, the index gets off
    // because records are being removed)
    env.store.unloadRecord(post);
  });

  try {
    run(() => {
      env.store.destroy();
    });
    assert.ok(true, "store destroyed correctly");
  } catch (error) {
    assert.ok(false, "store prevented from being destroyed");
  }
});

test("adding and removing records from hasMany relationship #2666", function(assert) {
  assert.expect(4);

  let Post = DS.Model.extend({
    comments: DS.hasMany('comment', { async: true })
  });
  Post.reopenClass({ toString: () => 'Post' });

  let Comment = DS.Model.extend({
    post: DS.belongsTo('post', { async: false })
  });
  Comment.reopenClass({ toString: () => 'Comment' });

  env = setupStore({
    post: Post,
    comment: Comment,
    adapter: DS.RESTAdapter.extend({
      shouldBackgroundReloadRecord: () => false
    })
  });

  let commentId = 4;
  env.registry.register('adapter:comment', DS.RESTAdapter.extend({
    deleteRecord(record) {
      return Ember.RSVP.resolve();
    },
    updateRecord(record) {
      return Ember.RSVP.resolve();
    },
    createRecord() {
      return Ember.RSVP.resolve({ comments: { id: commentId++ }});
    }
  }));

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }, {
        type: 'comment',
        id: '1'
      }, {
        type: 'comment',
        id: '2'
      }, {
        type: 'comment',
        id: '3'
      }]
    });
  });

  return run(() => {
    return env.store.findRecord('post', 1).then(post => {
      let comments = post.get('comments');
      assert.equal(comments.get('length'), 3, "Initial comments count");

      // Add comment #4
      let comment = env.store.createRecord('comment');
      comments.addObject(comment);

      return comment.save().then(() => {
        let comments = post.get('comments');
        assert.equal(comments.get('length'), 4, "Comments count after first add");

        // Delete comment #4
        return comments.get('lastObject').destroyRecord();
      }).then(() => {
        let comments = post.get('comments');
        let length = comments.get('length');

        assert.equal(length, 3, "Comments count after destroy");

        // Add another comment #4
        let comment = env.store.createRecord('comment');
        comments.addObject(comment);
        return comment.save();
      }).then(() => {
        let comments = post.get('comments');
        assert.equal(comments.get('length'), 4, "Comments count after second add");
      });
    });
  });
});

test("hasMany hasData async loaded", function(assert) {
  assert.expect(1);

  Chapter.reopen({
    pages: hasMany('pages', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'chapter',
        attributes: { title: 'The Story Begins' },
        relationships: {
          pages: {
            data: [{ id: 2, type: 'page' }, { id: 3, type: 'page' }]
          }
        }
      }
    });
  };

  return run(() => {
    return store.findRecord('chapter', 1).then(chapter => {
      let relationship = chapter._internalModel._relationships.get('pages');
      assert.equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("hasMany hasData sync loaded", function(assert) {
  assert.expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'chapter',
        attributes: { title: 'The Story Begins' },
        relationships: {
          pages: {
            data: [{ id: 2, type: 'page' }, { id: 3, type: 'page' }]
          }
        }
      }
    });
  };

  return run(() => {
    return store.findRecord('chapter', 1).then(chapter => {
      let relationship = chapter._internalModel._relationships.get('pages');
      assert.equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("hasMany hasData async not loaded", function(assert) {
  assert.expect(1);

  Chapter.reopen({
    pages: hasMany('pages', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'chapter',
        attributes: { title: 'The Story Begins' },
        relationships: {
          pages: {
            links: { related: 'pages' }
          }
        }
      }
    });
  };

  return run(() => {
    return store.findRecord('chapter', 1).then(chapter => {
      let relationship = chapter._internalModel._relationships.get('pages');
      assert.equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("hasMany hasData sync not loaded", function(assert) {
  assert.expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'chapter',
        attributes: { title: 'The Story Begins' }
      }
    });
  };

  return run(() => {
    return store.findRecord('chapter', 1).then(chapter => {
      let relationship = chapter._internalModel._relationships.get('pages');
      assert.equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("hasMany hasData async created", function(assert) {
  assert.expect(2);

  Chapter.reopen({
    pages: hasMany('pages', { async: true })
  });

  run(() => {
    let chapter = store.createRecord('chapter', { title: 'The Story Begins' });
    let page = store.createRecord('page');

    let relationship = chapter._internalModel._relationships.get('pages');
    assert.equal(relationship.hasData, false, 'relationship does not have data');

    chapter = store.createRecord('chapter', {
      title: 'The Story Begins',
      pages: [page]
    });

    relationship = chapter._internalModel._relationships.get('pages');
    assert.equal(relationship.hasData, true, 'relationship has data');
  });
});

test("hasMany hasData sync created", function(assert) {
  assert.expect(2);

  run(() => {
    let chapter = store.createRecord('chapter', { title: 'The Story Begins' });
    let relationship = chapter._internalModel._relationships.get('pages');

    assert.equal(relationship.hasData, false, 'relationship does not have data');

    chapter = store.createRecord('chapter', {
      title: 'The Story Begins',
      pages: [store.createRecord('page')]
    });
    relationship = chapter._internalModel._relationships.get('pages');

    assert.equal(relationship.hasData, true, 'relationship has data');
  });
});

test("Model's hasMany relationship should not be created during model creation", function(assert) {
  let user;
  run(() => {
    env.store.push({
      data: {
        type: 'user',
        id: '1'
      }
    });
    user = env.store.peekRecord('user', 1);
    assert.ok(!user._internalModel._relationships.has('messages'), 'Newly created record should not have relationships');
  });
});

test("Model's belongsTo relationship should be created during 'get' method", function(assert) {
  let user;
  run(() => {
    user = env.store.createRecord('user');
    user.get('messages');
    assert.ok(user._internalModel._relationships.has('messages'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("metadata is accessible when pushed as a meta property for a relationship", function(assert) {
  assert.expect(1);
  let book;
  env.adapter.findHasMany = function() {
    return resolve({});
  };

  run(() => {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          chapters: {
            meta: {
              where: 'the lefkada sea'
            },
            links: {
              related: '/chapters'
            }
          }
        }
      }
    });
    book = env.store.peekRecord('book', 1);
  });

  run(() => {
    assert.equal(book._internalModel._relationships.get('chapters').meta.where, 'the lefkada sea', 'meta is there');
  });
});

test("metadata is accessible when return from a fetchLink", function(assert) {
  assert.expect(1);
  env.registry.register('serializer:application', DS.RESTSerializer);

  env.adapter.findHasMany = function() {
    return resolve({
      meta: {
        foo: 'bar'
      },
      chapters: [
        { id: '2' },
        { id: '3' }
      ]
    });
  };

  let book;

  run(() => {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          chapters: {
            links: {
              related: '/chapters'
            }
          }
        }
      }
    });
    book = env.store.peekRecord('book', 1);
  });

  return run(() => {
    return book.get('chapters').then(chapters => {
      let meta = chapters.get('meta');
      assert.equal(get(meta, 'foo'), 'bar', 'metadata is available');
    });
  });
});

test("metadata should be reset between requests", function(assert) {
  let counter = 0;
  env.registry.register('serializer:application', DS.RESTSerializer);

  env.adapter.findHasMany = function() {
    let data = {
      meta: {
        foo: 'bar'
      },
      chapters: [
        { id: '2' },
        { id: '3' }
      ]
    };

    assert.ok(true, 'findHasMany should be called twice');

    if (counter === 1) {
      delete data.meta;
    }

    counter++;

    return resolve(data);
  };

  let book1, book2;

  run(() => {
    env.store.push({
      data: [{
        type: 'book',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          chapters: {
            links: {
              related: 'chapters'
            }
          }
        }
      }, {
        type: 'book',
        id: '2',
        attributes: {
          title: 'Another book title'
        },
        relationships: {
          chapters: {
            links: {
              related: 'chapters'
            }
          }
        }
      }]
    });
    book1 = env.store.peekRecord('book', 1);
    book2 = env.store.peekRecord('book', 2);
  });

  return run(() => {
    return book1.get('chapters').then(chapters => {
      let meta = chapters.get('meta');
      assert.equal(get(meta, 'foo'), 'bar', 'metadata should available');

      return book2.get('chapters').then(chapters => {
        let meta = chapters.get('meta');
        assert.equal(meta, undefined, 'metadata should not be available');
      });
    });
  });
});

test("Related link should be fetched when no local data is present", function(assert) {
  assert.expect(3);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, url, relationship) {
    assert.equal(url, 'comments', 'url is correct');
    assert.ok(true, "The adapter's findHasMany method should be called");
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: 'This is comment' } }
    ]});
  };

  return run(() => {
    let post = env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: 'comments'
            }
          }
        }
      }
    });

    return post.get('comments').then(comments => {
      assert.equal(comments.get('firstObject.body'), 'This is comment', 'comment body is correct');
    });
  });
});

test("Local data should take precedence over related link", function(assert) {
  assert.expect(1);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, url, relationship) {
    assert.ok(false, "The adapter's findHasMany method should not be called");
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ data: { id: 1, type: 'comment', attributes: { body: 'This is comment' } } });
  };

  return run(() => {
    let post = env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: 'comments'
            },
            data: [
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });

    return post.get('comments').then(comments => {
      assert.equal(comments.get('firstObject.body'), 'This is comment', 'comment body is correct');
    });
  });
});

test("Updated related link should take precedence over local data", function(assert) {
  assert.expect(3);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, url, relationship) {
    assert.equal(url, 'comments-updated-link', 'url is correct');
    assert.ok(true, "The adapter's findHasMany method should be called");
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: 'This is comment' } }
    ]});
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };

  return run(() => {
    let post = env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: 'comments'
            },
            data: [
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });

    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: 'comments-updated-link'
            }
          }
        }
      }
    });

    return post.get('comments').then(comments => {
      assert.equal(comments.get('firstObject.body'), 'This is comment', 'comment body is correct');
    });
  });
});

test("PromiseArray proxies createRecord to its ManyArray before the hasMany is loaded", function(assert) {
  assert.expect(1);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    return Ember.RSVP.resolve({ data: [
      { id: 1, type: 'comment', attributes: { body: "First" } },
      { id: 2, type: 'comment', attributes: { body: "Second" } }
    ]});
  };

  return run(() => {
    let post = env.store.push({
      data: {
        type: 'post',
        id: 1,
        relationships: {
          comments: {
            links: {
              related: 'someLink'
            }
          }
        }
      }
    });

    let comments = post.get('comments');
    comments.createRecord();
    return comments.then(comments => {
      assert.equal(comments.get('length'), 3, "comments have 3 length, including new record");
    });
  });
});

test("deleteRecord + unloadRecord fun", function(assert) {
  User.reopen({
    posts: DS.hasMany('posts', { inverse: null })
  });

  run(() => {
    env.store.push({
      data: [
        {
          type: 'user',
          id: 'user-1',
          attributes: {
            name: 'Adolfo Builes'
          },
          relationships: {
            posts: {
              data: [
                { type: 'post', id: 'post-1' },
                { type: 'post', id: 'post-2' },
                { type: 'post', id: 'post-3' },
                { type: 'post', id: 'post-4' },
                { type: 'post', id: 'post-5' }
              ]
            }
          }
        },
        { type: 'post', id: 'post-1' },
        { type: 'post', id: 'post-2' },
        { type: 'post', id: 'post-3' },
        { type: 'post', id: 'post-4' },
        { type: 'post', id: 'post-5' }
      ]
    });

    let user = env.store.peekRecord('user', 'user-1');
    let posts = user.get('posts');

    env.store.adapterFor('post').deleteRecord = function() {
      // just acknowledge all deletes, but with a noop
      return { data: null };
    };

    assert.deepEqual(posts.map(x => x.get('id')), ['post-1', 'post-2', 'post-3', 'post-4', 'post-5']);

    return run(() => {
      return env.store.peekRecord('post', 'post-2').destroyRecord().then(record => {
        return env.store.unloadRecord(record);
      });
    }).then(() => {
      assert.deepEqual(posts.map(x => x.get('id')), ['post-1', 'post-3', 'post-4', 'post-5']);
      return env.store.peekRecord('post', 'post-3').destroyRecord().then(record => {
        return env.store.unloadRecord(record);
      });
    }).then(() => {
      assert.deepEqual(posts.map(x => x.get('id')), ['post-1', 'post-4', 'post-5']);
      return env.store.peekRecord('post', 'post-4').destroyRecord().then(record => {
        return env.store.unloadRecord(record);
      });
    }).then(() => {
      assert.deepEqual(posts.map(x => x.get('id')), ['post-1', 'post-5']);
    });
  });
});

test("unloading and reloading a record with hasMany relationship - #3084", function(assert) {
  let user;
  let message;

  run(() => {
    env.store.push({
      data: [{
        type: 'user',
        id: 'user-1',
        attributes: {
          name: 'Adolfo Builes'
        },
        relationships: {
          messages: {
            data: [
              { type: 'message', id: 'message-1' }
            ]
          }
        }
      }, {
        type: 'message',
        id: 'message-1'
      }]
    });

    user = env.store.peekRecord('user', 'user-1');
    message = env.store.peekRecord('message', 'message-1');

    assert.equal(get(user, 'messages.firstObject.id'), 'message-1');
    assert.equal(get(message, 'user.id'), 'user-1');
  });

  run(() => {
    env.store.unloadRecord(user);
  });

  run(() => {
    // The record is resurrected for some reason.
    env.store.push({
      data: [{
        type: 'user',
        id: 'user-1',
        attributes: {
          name: 'Adolfo Builes'
        },
        relationships: {
          messages: {
            data: [
              { type: 'message', id: 'message-1' }
            ]
          }
        }
      }]
    });

    user = env.store.peekRecord('user', 'user-1');

    assert.equal(get(user, 'messages.firstObject.id'), 'message-1', 'user points to message');
    assert.equal(get(message, 'user.id'), 'user-1', 'message points to user');
  });
});

test("deleted records should stay deleted", function(assert) {
  let user;
  let message;

  env.adapter.deleteRecord = function(store, type, id) {
    return null;
  };

  run(() => {
    env.store.push({
      data: [{
        type: 'user',
        id: 'user-1',
        attributes: {
          name: 'Adolfo Builes'
        },
        relationships: {
          messages: {
            data: [
              { type: 'message', id: 'message-1' },
              { type: 'message', id: 'message-2' }
            ]
          }
        }
      }, {
        type: 'message',
        id: 'message-1'
      }, {
        type: 'message',
        id: 'message-2'
      }]
    });

    user = env.store.peekRecord('user', 'user-1');
    message = env.store.peekRecord('message', 'message-1');

    assert.equal(get(user, 'messages.length'), 2);
  });

  run(() => message.destroyRecord());

  run(() => {
    // a new message is added to the user should not resurrected the
    // deleted message
    env.store.push({
      data: [{
        type: 'message',
        id: 'message-3',
        relationships: {
          user: {
            data: { type: 'user', id: 'user-1' }
          }
        }
      }]
    });

    assert.deepEqual(
      get(user, 'messages').mapBy('id'),
      ['message-2', 'message-3'],
      'user should have 2 message since 1 was deleted'
    );
  });
});

test("hasMany relationship with links doesn't trigger extra change notifications - #4942", function(assert) {
  run(() => {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          chapters: {
            data: [{ type: 'chapter', id: '1' }],
            links: { related: '/book/1/chapters' }
          }
        }
      },
      included: [{ type: 'chapter', id: '1' }]
    });
  });

  let book = env.store.peekRecord('book', '1');
  let count = 0;

  book.addObserver('chapters', () => {
    count++;
  });

  run(() => {
    book.get('chapters');
  });

  assert.equal(count, 0);
});
