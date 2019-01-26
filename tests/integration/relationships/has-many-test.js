/*eslint no-unused-vars: ["error", { "args": "none", "varsIgnorePattern": "(page)" }]*/

import { A } from '@ember/array';
import { resolve, Promise as EmberPromise, all, reject, hash } from 'rsvp';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test, skip } from 'qunit';
import { relationshipStateFor, relationshipsFor } from 'ember-data/-private';
import DS from 'ember-data';
import { settled } from '@ember/test-helpers';

let env, store, User, Contact, Email, Phone, Message, Post, Comment;
let Book, Chapter, Page;

const { attr, hasMany, belongsTo } = DS;

module('integration/relationships/has_many - Has-Many Relationships', {
  beforeEach() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', { polymorphic: true, async: false }),
      contacts: hasMany('user', { inverse: null, async: false }),
    });

    Contact = DS.Model.extend({
      user: belongsTo('user', { async: false }),
    });
    Contact.reopenClass({ toString: () => 'Contact' });

    Email = Contact.extend({
      email: attr('string'),
    });
    Email.reopenClass({ toString: () => 'Email' });

    Phone = Contact.extend({
      number: attr('string'),
    });
    Phone.reopenClass({ toString: () => 'Phone' });

    Message = DS.Model.extend({
      user: belongsTo('user', { async: false }),
      created_at: attr('date'),
    });
    Message.reopenClass({ toString: () => 'Message' });

    Post = Message.extend({
      title: attr('string'),
      comments: hasMany('comment', { async: false }),
    });
    Post.reopenClass({ toString: () => 'Post' });

    Comment = Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('post', { polymorphic: true, async: true }),
    });
    Comment.reopenClass({ toString: () => 'Comment' });

    Book = DS.Model.extend({
      title: attr(),
      chapters: hasMany('chapter', { async: true }),
    });
    Book.reopenClass({ toString: () => 'Book' });

    Chapter = DS.Model.extend({
      title: attr(),
      pages: hasMany('page', { async: false }),
    });
    Chapter.reopenClass({ toString: () => 'Chapter' });

    Page = DS.Model.extend({
      number: attr('number'),
      chapter: belongsTo('chapter', { async: false }),
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
      page: Page,
    });

    store = env.store;
  },

  afterEach() {
    run(env.container, 'destroy');
  },
});

testInDebug('Invalid hasMany relationship identifiers throw errors', function(assert) {
  let { store } = env;

  // test null id
  assert.expectAssertion(() => {
    let post = store.push({
      data: {
        id: '1',
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: null, type: 'comment' }],
          },
        },
      },
    });
    post.get('comments');
  }, `Assertion Failed: Encountered a relationship identifier without an id for the hasMany relationship 'comments' on <post:1>, expected a json-api identifier but found '{"id":null,"type":"comment"}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`);

  // test missing type
  assert.expectAssertion(() => {
    let post = store.push({
      data: {
        id: '2',
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: '1', type: null }],
          },
        },
      },
    });
    post.get('comments');
  }, `Assertion Failed: Encountered a relationship identifier without a type for the hasMany relationship 'comments' on <post:2>, expected a json-api identifier with type 'comment' but found '{"id":"1","type":null}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`);
});

test("When a hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", async function(assert) {
  assert.expect(0);
  let postData = {
    type: 'post',
    id: '1',
    relationships: {
      comments: {
        data: [{ type: 'comment', id: '1' }],
      },
    },
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.ok(false, "The adapter's find method should not be called");
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { data: postData };
  };

  store.push({
    data: postData,
    included: [
      {
        type: 'comment',
        id: '1',
      },
    ],
  });

  let post = await env.store.findRecord('post', 1);
  await post.get('comments');
});

test('hasMany + canonical vs currentState + destroyRecord  ', async function(assert) {
  let postData = {
    type: 'user',
    id: '1',
    attributes: {
      name: 'omg',
    },
    relationships: {
      contacts: {
        data: [
          {
            type: 'user',
            id: 2,
          },
          {
            type: 'user',
            id: 3,
          },
          {
            type: 'user',
            id: 4,
          },
        ],
      },
    },
  };

  env.store.push({
    data: postData,
    included: [
      {
        type: 'user',
        id: 2,
      },
      {
        type: 'user',
        id: 3,
      },
      {
        type: 'user',
        id: 4,
      },
    ],
  });

  let user = env.store.peekRecord('user', 1);
  let contacts = user.get('contacts');

  env.store.adapterFor('user').deleteRecord = function() {
    return { data: { type: 'user', id: 2 } };
  };

  assert.deepEqual(
    contacts.map(c => c.get('id')),
    ['2', '3', '4'],
    'user should have expected contacts'
  );

  contacts.addObject(env.store.createRecord('user', { id: 5 }));
  contacts.addObject(env.store.createRecord('user', { id: 6 }));
  contacts.addObject(env.store.createRecord('user', { id: 7 }));

  assert.deepEqual(
    contacts.map(c => c.get('id')),
    ['2', '3', '4', '5', '6', '7'],
    'user should have expected contacts'
  );

  await env.store.peekRecord('user', 2).destroyRecord();
  await env.store.peekRecord('user', 6).destroyRecord();

  assert.deepEqual(
    contacts.map(c => c.get('id')),
    ['3', '4', '5', '7'],
    `user's contacts should have expected contacts`
  );
  assert.equal(contacts, user.get('contacts'));

  contacts.addObject(env.store.createRecord('user', { id: 8 }));

  assert.deepEqual(
    contacts.map(c => c.get('id')),
    ['3', '4', '5', '7', '8'],
    `user's contacts should have expected contacts`
  );
  assert.equal(contacts, user.get('contacts'));
});

test('hasMany + canonical vs currentState + unloadRecord', async function(assert) {
  let postData = {
    type: 'user',
    id: '1',
    attributes: {
      name: 'omg',
    },
    relationships: {
      contacts: {
        data: [
          {
            type: 'user',
            id: 2,
          },
          {
            type: 'user',
            id: 3,
          },
          {
            type: 'user',
            id: 4,
          },
        ],
      },
    },
  };

  env.store.push({
    data: postData,
    included: [
      {
        type: 'user',
        id: 2,
      },
      {
        type: 'user',
        id: 3,
      },
      {
        type: 'user',
        id: 4,
      },
    ],
  });

  let user = env.store.peekRecord('user', 1);
  let contacts = user.get('contacts');

  env.store.adapterFor('user').deleteRecord = function() {
    return { data: { type: 'user', id: 2 } };
  };

  assert.deepEqual(
    contacts.map(c => c.get('id')),
    ['2', '3', '4'],
    'user should have expected contacts'
  );

  contacts.addObject(env.store.createRecord('user', { id: 5 }));
  contacts.addObject(env.store.createRecord('user', { id: 6 }));
  contacts.addObject(env.store.createRecord('user', { id: 7 }));

  assert.deepEqual(
    contacts.map(c => c.get('id')),
    ['2', '3', '4', '5', '6', '7'],
    'user should have expected contacts'
  );

  env.store.peekRecord('user', 2).unloadRecord();
  env.store.peekRecord('user', 6).unloadRecord();

  assert.deepEqual(
    contacts.map(c => c.get('id')),
    ['3', '4', '5', '7'],
    `user's contacts should have expected contacts`
  );
  assert.equal(contacts, user.get('contacts'));

  contacts.addObject(env.store.createRecord('user', { id: 8 }));

  assert.deepEqual(
    contacts.map(c => c.get('id')),
    ['3', '4', '5', '7', '8'],
    `user's contacts should have expected contacts`
  );
  assert.equal(contacts, user.get('contacts'));
});

test('adapter.findMany only gets unique IDs even if duplicate IDs are present in the hasMany relationship', async function(assert) {
  let bookData = {
    type: 'book',
    id: '1',
    relationships: {
      chapters: {
        data: [
          { type: 'chapter', id: '2' },
          { type: 'chapter', id: '3' },
          { type: 'chapter', id: '3' },
        ],
      },
    },
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.equal(type, Chapter, 'type passed to adapter.findMany is correct');
    assert.deepEqual(ids, ['2', '3'], 'ids passed to adapter.findMany are unique');

    return resolve({
      data: [
        { id: 2, type: 'chapter', attributes: { title: 'Chapter One' } },
        { id: 3, type: 'chapter', attributes: { title: 'Chapter Two' } },
      ],
    });
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { data: bookData };
  };

  env.store.push({
    data: bookData,
  });

  let book = await env.store.findRecord('book', 1);
  await book.get('chapters');
});

// This tests the case where a serializer materializes a has-many
// relationship as a internalModel that it can fetch lazily. The most
// common use case of this is to provide a URL to a collection that
// is loaded later.
test("A serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  // When the store asks the adapter for the record with ID 1,
  // provide some fake data.
  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, 'find type was Post');
    assert.equal(id, '1', 'find id was 1');

    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments',
            },
          },
        },
      },
    });
  };
  //({ id: 1, links: { comments: "/posts/1/comments" } });

  env.adapter.findMany = function(store, type, ids, snapshots) {
    throw new Error("Adapter's findMany should not be called");
  };

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    assert.equal(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');
    assert.equal(relationship.type, 'comment', 'relationship was passed correctly');

    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let post = await env.store.findRecord('post', 1);
  let comments = await post.get('comments');
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');
  assert.equal(comments.objectAt(0).get('body'), 'First', 'comment loaded successfully');
});

test('Accessing a hasMany backed by a link multiple times triggers only one request', async function(assert) {
  let count = 0;
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true }),
  });

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: '/posts/1/comments',
          },
        },
      },
    },
  });
  let post = env.store.peekRecord('post', 1);

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    count++;
    assert.equal(count, 1, 'findHasMany has only been called once');
    return new EmberPromise((resolve, reject) => {
      setTimeout(() => {
        let value = {
          data: [
            { id: 1, type: 'comment', attributes: { body: 'First' } },
            { id: 2, type: 'comment', attributes: { body: 'Second' } },
          ],
        };
        resolve(value);
      }, 100);
    });
  };

  let promise1 = post.get('comments');
  //Invalidate the post.comments CP
  env.store.push({
    data: {
      type: 'comment',
      id: '1',
      relationships: {
        message: {
          data: { type: 'post', id: '1' },
        },
      },
    },
  });
  let promise2 = post.get('comments');

  await all([promise1, promise2]);
  assert.equal(
    promise1.get('promise'),
    promise2.get('promise'),
    'Same promise is returned both times'
  );
});

test('A hasMany backed by a link remains a promise after a record has been added to it', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true }),
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: '/posts/1/comments',
          },
        },
      },
    },
  });
  let post = env.store.peekRecord('post', 1);

  await post.get('comments');
  env.store.push({
    data: {
      type: 'comment',
      id: '3',
      relationships: {
        message: {
          data: { type: 'post', id: '1' },
        },
      },
    },
  });

  await post.get('comments');
  assert.ok(true, 'Promise was called');
});

test('A hasMany updated link should not remove new children', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true }),
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return resolve({ data: [] });
  };

  env.adapter.createRecord = function(store, snapshot, link, relationship) {
    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: '/some/link' },
          },
        },
      },
    });
  };

  let post = env.store.createRecord('post', {});
  env.store.createRecord('comment', { message: post });

  let comments = await post.get('comments');
  assert.equal(comments.get('length'), 1, 'initially we have one comment');

  await post.save();
  comments = await post.get('comments');
  assert.equal(comments.get('length'), 1, 'after saving, we still have one comment');
});

test('A hasMany updated link should not remove new children when the parent record has children already', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true }),
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return resolve({
      data: [{ id: 5, type: 'comment', attributes: { body: 'hello' } }],
    });
  };

  env.adapter.createRecord = function(store, snapshot, link, relationship) {
    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: '/some/link' },
          },
        },
      },
    });
  };

  let post = env.store.createRecord('post', {});
  env.store.createRecord('comment', { message: post });

  let comments = await post.get('comments');
  assert.equal(comments.get('length'), 1);
  await post.save();
  comments = await post.get('comments');
  assert.equal(comments.get('length'), 2);
});

test("A hasMany relationship doesn't contain duplicate children, after the canonical state of the relationship is updated via store#push", async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true }),
  });

  env.adapter.createRecord = function(store, snapshot, link, relationship) {
    return resolve({ data: { id: 1, type: 'post' } });
  };

  let post = env.store.createRecord('post', {});

  // create a new comment with id 'local', which is in the 'comments'
  // relationship of post
  let localComment = env.store.createRecord('comment', { id: 'local', message: post });

  let comments = await post.get('comments');
  assert.equal(comments.get('length'), 1);
  assert.equal(localComment.get('isNew'), true);

  await post.save();
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
          data: [{ id: 'local', type: 'comment' }],
        },
      },
    },
  });
  comments = await post.get('comments');
  assert.equal(comments.get('length'), 1);
  assert.equal(localComment.get('isNew'), true);
});

test('A hasMany relationship can be reloaded if it was fetched via a link', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, 'find type was Post');
    assert.equal(id, '1', 'find id was 1');

    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: '/posts/1/comments' },
          },
        },
      },
    });
  };

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    assert.equal(relationship.type, 'comment', 'findHasMany relationship type was Comment');
    assert.equal(relationship.key, 'comments', 'findHasMany relationship key was comments');
    assert.equal(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');

    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let post = await env.store.findRecord('post', 1);
  let comments = await post.get('comments');
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    assert.equal(relationship.type, 'comment', 'findHasMany relationship type was Comment');
    assert.equal(relationship.key, 'comments', 'findHasMany relationship key was comments');
    assert.equal(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');

    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
        { id: 3, type: 'comment', attributes: { body: 'Thirds' } },
      ],
    });
  };

  let newComments = await comments.reload();
  assert.equal(newComments.get('length'), 3, 'reloaded comments have 3 length');
});

test('A sync hasMany relationship can be reloaded if it was fetched via ids', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: false }),
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, 'find type was Post');
    assert.equal(id, '1', 'find id was 1');

    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: 1, type: 'comment' }, { id: 2, type: 'comment' }],
          },
        },
      },
    });
  };

  env.store.push({
    data: [
      {
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First',
        },
      },
      {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second',
        },
      },
    ],
  });

  let post = await env.store.findRecord('post', '1');
  let comments = await post.get('comments');
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(comments.get('length'), 2, 'comments have a length of 2');

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'FirstUpdated' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let newComments = await comments.reload();
  assert.equal(
    newComments.get('firstObject.body'),
    'FirstUpdated',
    'Record body was correctly updated'
  );
});

test('A hasMany relationship can be reloaded if it was fetched via ids', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, 'find type was Post');
    assert.equal(id, '1', 'find id was 1');

    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: 1, type: 'comment' }, { id: 2, type: 'comment' }],
          },
        },
      },
    });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let post = await env.store.findRecord('post', 1);
  let comments = await post.get('comments');
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'FirstUpdated' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let newComments = await comments.reload();
  assert.equal(
    newComments.get('firstObject.body'),
    'FirstUpdated',
    'Record body was correctly updated'
  );
});

skip('A hasMany relationship can be reloaded even if it failed at the first time', async function(assert) {
  const { store, adapter } = env;

  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  adapter.findRecord = function(store, type, id) {
    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: '/posts/1/comments' },
          },
        },
      },
    });
  };

  let loadingCount = -1;
  adapter.findHasMany = function(store, record, link, relationship) {
    loadingCount++;
    if (loadingCount % 2 === 0) {
      return reject({ data: null });
    } else {
      return resolve({
        data: [
          { id: 1, type: 'comment', attributes: { body: 'FirstUpdated' } },
          { id: 2, type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    }
  };

  let post = await store.findRecord('post', 1);
  let comments = post.get('comments');
  let manyArray = await comments.catch(() => {
    assert.ok(true, 'An error was thrown on the first reload of comments');
    return comments.reload();
  });

  assert.equal(manyArray.get('isLoaded'), true, 'the reload worked, comments are now loaded');

  await manyArray.reload().catch(() => {
    assert.ok(true, 'An error was thrown on the second reload via manyArray');
  });

  assert.equal(
    manyArray.get('isLoaded'),
    true,
    'the second reload failed, comments are still loaded though'
  );

  let reloadedManyArray = await manyArray.reload();

  assert.equal(
    reloadedManyArray.get('isLoaded'),
    true,
    'the third reload worked, comments are loaded again'
  );
  assert.ok(reloadedManyArray === manyArray, 'the many array stays the same');
});

test('A hasMany relationship can be directly reloaded if it was fetched via links', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findRecord = function(store, type, id) {
    assert.equal(type, Post, 'find type was Post');
    assert.equal(id, '1', 'find id was 1');

    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: '/posts/1/comments' },
          },
        },
      },
    });
  };

  env.adapter.findHasMany = function(store, record, link, relationship) {
    assert.equal(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');

    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'FirstUpdated' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };
  let post = await env.store.findRecord('post', 1);
  let comments = await post.get('comments');
  comments = await comments.reload();
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');
  assert.equal(
    comments.get('firstObject.body'),
    'FirstUpdated',
    'Record body was correctly updated'
  );
});

test('Has many via links - Calling reload multiple times does not send a new request if the first one is not settled', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findRecord = function(store, type, id) {
    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            links: { related: '/posts/1/comments' },
          },
        },
      },
    });
  };

  let count = 0;
  env.adapter.findHasMany = function(store, record, link, relationship) {
    count++;
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let post = await env.store.findRecord('post', 1);
  let comments = await post.get('comments');
  await all([comments.reload(), comments.reload(), comments.reload()]);
  assert.equal(
    count,
    2,
    'One request for the original access and only one request for the multiple reloads'
  );
});

test('A hasMany relationship can be directly reloaded if it was fetched via ids', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Post, 'find type was Post');
    assert.equal(id, '1', 'find id was 1');

    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: 1, type: 'comment' }, { id: 2, type: 'comment' }],
          },
        },
      },
    });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'FirstUpdated' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let post = await env.store.findRecord('post', 1);
  let comments = await post.get('comments');
  comments = await comments.reload();
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');
  assert.equal(
    comments.get('firstObject.body'),
    'FirstUpdated',
    'Record body was correctly updated'
  );
});

test('Has many via ids - Calling reload multiple times does not send a new request if the first one is not settled', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({
      data: {
        id: 1,
        type: 'post',
        relationships: {
          comments: {
            data: [{ id: 1, type: 'comment' }, { id: 2, type: 'comment' }],
          },
        },
      },
    });
  };

  let count = 0;
  env.adapter.findMany = function(store, type, ids, snapshots) {
    count++;
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'FirstUpdated' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let post = await env.store.findRecord('post', 1);
  let comments = await post.get('comments');
  await all([comments.reload(), comments.reload(), comments.reload()]);
  assert.equal(
    count,
    2,
    'One request for the original access and only one request for the mulitple reloads'
  );
});

test('PromiseArray proxies createRecord to its ManyArray once the hasMany is loaded', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: 'someLink',
          },
        },
      },
    },
  });
  let post = env.store.peekRecord('post', 1);

  let comments = await post.get('comments');
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');

  let newComment = await comments.createRecord({ body: 'Third' });
  assert.equal(newComment.get('body'), 'Third', 'new comment is returned');
  assert.equal(comments.get('length'), 3, 'comments have 3 length, including new record');
});

test('PromiseArray proxies evented methods to its ManyArray', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: 'someLink',
          },
        },
      },
    },
  });
  let post = env.store.peekRecord('post', 1);
  let comments = await post.get('comments');

  comments.on('on-event', function() {
    assert.ok(true);
  });

  comments.trigger('on-event');

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

  comments.trigger('one-event');

  assert.equal(comments.has('one-event'), false);
});

test('An updated `links` value should invalidate a relationship cache', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    assert.equal(relationship.type, 'comment', 'relationship was passed correctly');

    if (link === '/first') {
      return resolve({
        data: [
          { id: 1, type: 'comment', attributes: { body: 'First' } },
          { id: 2, type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    } else if (link === '/second') {
      return resolve({
        data: [
          { id: 3, type: 'comment', attributes: { body: 'Third' } },
          { id: 4, type: 'comment', attributes: { body: 'Fourth' } },
          { id: 5, type: 'comment', attributes: { body: 'Fifth' } },
        ],
      });
    }
  };

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: '/first',
          },
        },
      },
    },
  });
  let post = env.store.peekRecord('post', 1);

  let comments = await post.get('comments');
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');
  assert.equal(comments.objectAt(0).get('body'), 'First', 'comment 1 successfully loaded');
  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: '/second',
          },
        },
      },
    },
  });
  let newComments = await post.get('comments');
  assert.equal(comments, newComments, 'hasMany array was kept the same');
  assert.equal(newComments.get('length'), 3, 'comments updated successfully');
  assert.equal(newComments.objectAt(0).get('body'), 'Third', 'third comment loaded successfully');
});

test("When a polymorphic hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", async function(assert) {
  let userData = {
    type: 'user',
    id: '1',
    relationships: {
      messages: {
        data: [{ type: 'post', id: '1' }, { type: 'comment', id: '3' }],
      },
    },
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.ok(false, "The adapter's find method should not be called");
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { data: userData };
  };

  env.store.push({
    data: userData,
    included: [
      {
        type: 'post',
        id: '1',
      },
      {
        type: 'comment',
        id: '3',
      },
    ],
  });

  let user = await env.store.findRecord('user', 1);
  let messages = await user.get('messages');
  assert.equal(messages.get('length'), 2, 'The messages are correctly loaded');
});

test("When a polymorphic hasMany relationship is accessed, the store can call multiple adapters' findMany or find methods if the records are not loaded", async function(assert) {
  User.reopen({
    messages: hasMany('message', { polymorphic: true, async: true }),
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Post) {
      return resolve({ data: { id: 1, type: 'post' } });
    } else if (type === Comment) {
      return resolve({ data: { id: 3, type: 'comment' } });
    }
  };

  env.store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        messages: {
          data: [{ type: 'post', id: '1' }, { type: 'comment', id: '3' }],
        },
      },
    },
  });

  let user = await env.store.findRecord('user', 1);
  let messages = await user.get('messages');
  assert.equal(messages.get('length'), 2, 'The messages are correctly loaded');
});

test('polymorphic hasMany type-checks check the superclass', async function(assert) {
  let igor = env.store.createRecord('user', { name: 'Igor' });
  let comment = env.store.createRecord('comment', {
    body: 'Well I thought the title was fine',
  });

  let messages = await igor.get('messages');
  messages.addObject(comment);

  assert.equal(igor.get('messages.firstObject.body'), 'Well I thought the title was fine');
});

test('Type can be inferred from the key of a hasMany relationship', async function(assert) {
  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return {
      data: {
        id: 1,
        type: 'user',
        relationships: {
          contacts: {
            data: [{ id: 1, type: 'contact' }],
          },
        },
      },
    };
  };

  env.store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        contacts: {
          data: [{ type: 'contact', id: '1' }],
        },
      },
    },
    included: [
      {
        type: 'contact',
        id: '1',
      },
    ],
  });
  let user = await env.store.findRecord('user', 1);
  let contacts = await user.get('contacts');
  assert.equal(contacts.get('length'), 1, 'The contacts relationship is correctly set up');
});

test('Type can be inferred from the key of an async hasMany relationship', async function(assert) {
  User.reopen({
    contacts: DS.hasMany({ async: true }),
  });

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return {
      data: {
        id: 1,
        type: 'user',
        relationships: {
          contacts: {
            data: [{ id: 1, type: 'contact' }],
          },
        },
      },
    };
  };

  env.store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        contacts: {
          data: [{ type: 'contact', id: '1' }],
        },
      },
    },
    included: [
      {
        type: 'contact',
        id: '1',
      },
    ],
  });
  let user = await env.store.findRecord('user', 1);
  let contacts = await user.get('contacts');
  assert.equal(contacts.get('length'), 1, 'The contacts relationship is correctly set up');
});

test('Polymorphic relationships work with a hasMany whose type is inferred', async function(assert) {
  User.reopen({
    contacts: DS.hasMany({ polymorphic: true, async: false }),
  });

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { data: { id: 1, type: 'user' } };
  };

  env.store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        contacts: {
          data: [{ type: 'email', id: '1' }, { type: 'phone', id: '2' }],
        },
      },
    },
    included: [
      {
        type: 'email',
        id: '1',
      },
      {
        type: 'phone',
        id: '2',
      },
    ],
  });
  let user = await env.store.findRecord('user', 1);
  let contacts = await user.get('contacts');
  assert.equal(contacts.get('length'), 2, 'The contacts relationship is correctly set up');
});

test('Polymorphic relationships with a hasMany is set up correctly on both sides', async function(assert) {
  Contact.reopen({
    posts: DS.hasMany('post', { async: false }),
  });

  Post.reopen({
    contact: DS.belongsTo('contact', { polymorphic: true, async: false }),
  });

  let email = env.store.createRecord('email');
  let post = env.store.createRecord('post', {
    contact: email,
  });

  assert.equal(post.get('contact'), email, 'The polymorphic belongsTo is set up correctly');
  assert.equal(
    get(email, 'posts.length'),
    1,
    'The inverse has many is set up correctly on the email side.'
  );
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
            data: [],
          },
        },
      },
    });
  });

  run(function() {
    env.store
      .findRecord('user', 1)
      .then(function(user) {
        return user.get('messages');
      })
      .then(function(messages) {
        assert.expectAssertion(function() {
          messages.createRecord();
        }, /You cannot add 'message' records to this polymorphic relationship/);
      });
  });
});

testInDebug(
  'Only records of the same type can be added to a monomorphic hasMany relationship',
  async function(assert) {
    env.adapter.shouldBackgroundReloadRecord = () => false;
    env.store.push({
      data: [
        {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              data: [],
            },
          },
        },
        {
          type: 'post',
          id: '2',
        },
      ],
    });
    let records = await all([env.store.findRecord('post', 1), env.store.findRecord('post', 2)]);
    assert.expectAssertion(function() {
      records[0].get('comments').pushObject(records[1]);
    }, /The 'post' type does not implement 'comment' and thus cannot be assigned to the 'comments' relationship in 'post'/);
  }
);

testInDebug(
  'Only records of the same base modelClass can be added to a polymorphic hasMany relationship',
  async function(assert) {
    env.adapter.shouldBackgroundReloadRecord = () => false;
    env.store.push({
      data: [
        {
          type: 'user',
          id: '1',
          relationships: {
            messages: {
              data: [],
            },
          },
        },
        {
          type: 'user',
          id: '2',
          relationships: {
            messages: {
              data: [],
            },
          },
        },
      ],
      included: [
        {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              data: [],
            },
          },
        },
        {
          type: 'comment',
          id: '3',
        },
      ],
    });

    let asyncRecords = hash({
      user: env.store.findRecord('user', 1),
      anotherUser: env.store.findRecord('user', 2),
      post: env.store.findRecord('post', 1),
      comment: env.store.findRecord('comment', 3),
    });

    let records = await asyncRecords;
    records.messages = records.user.get('messages');
    records = await hash(records);
    records.messages.pushObject(records.post);
    records.messages.pushObject(records.comment);
    assert.equal(records.messages.get('length'), 2, 'The messages are correctly added');

    assert.expectAssertion(function() {
      records.messages.pushObject(records.anotherUser);
    }, /The 'user' type does not implement 'message' and thus cannot be assigned to the 'messages' relationship in 'user'. Make it a descendant of 'message'/);
  }
);

test('A record can be removed from a polymorphic association', async function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.store.push({
    data: {
      type: 'user',
      id: '1',
      relationships: {
        messages: {
          data: [{ type: 'comment', id: '3' }],
        },
      },
    },
    included: [
      {
        type: 'comment',
        id: '3',
      },
    ],
  });
  let asyncRecords = hash({
    user: env.store.findRecord('user', 1),
    comment: env.store.findRecord('comment', 3),
  });

  let records = await asyncRecords;
  records.messages = records.user.get('messages');
  records = await hash(records);
  assert.equal(records.messages.get('length'), 1, 'The user has 1 message');

  let removedObject = records.messages.popObject();

  assert.equal(removedObject, records.comment, 'The message is correctly removed');
  assert.equal(records.messages.get('length'), 0, 'The user does not have any messages');
  assert.equal(records.messages.objectAt(0), null, "No messages can't be fetched");
});

test('When a record is created on the client, its hasMany arrays should be in a loaded state', async function(assert) {
  let post = env.store.createRecord('post');

  assert.ok(get(post, 'isLoaded'), 'The post should have isLoaded flag');
  let comments = await get(post, 'comments');

  assert.equal(get(comments, 'length'), 0, 'The comments should be an empty array');

  assert.ok(get(comments, 'isLoaded'), 'The comments should have isLoaded flag');
});

test('When a record is created on the client, its async hasMany arrays should be in a loaded state', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  let post = env.store.createRecord('post');

  assert.ok(get(post, 'isLoaded'), 'The post should have isLoaded flag');

  let comments = await get(post, 'comments');
  assert.ok(true, 'Comments array successfully resolves');
  assert.equal(get(comments, 'length'), 0, 'The comments should be an empty array');
  assert.ok(get(comments, 'isLoaded'), 'The comments should have isLoaded flag');
});

test('we can set records SYNC HM relationship', async function(assert) {
  let post = env.store.createRecord('post');

  env.store.push({
    data: [
      {
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First',
        },
      },
      {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second',
        },
      },
    ],
  });
  await post.set('comments', env.store.peekAll('comment'));
  assert.equal(get(post, 'comments.length'), 2, 'we can set HM relationship');
});

test('We can set records ASYNC HM relationship', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  let post = env.store.createRecord('post');

  env.store.push({
    data: [
      {
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First',
        },
      },
      {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second',
        },
      },
    ],
  });
  post.set('comments', env.store.peekAll('comment'));

  let comments = await post.get('comments');
  assert.equal(comments.get('length'), 2, 'we can set async HM relationship');
});

test('When a record is saved, its unsaved hasMany records should be kept', async function(assert) {
  let post, comment;

  env.adapter.createRecord = function(store, type, snapshot) {
    return resolve({ data: { id: 1, type: snapshot.modelName } });
  };

  post = env.store.createRecord('post');
  comment = env.store.createRecord('comment');
  post.get('comments').pushObject(comment);
  await post.save();
  assert.equal(
    get(post, 'comments.length'),
    1,
    "The unsaved comment should be in the post's comments array"
  );
});

test('dual non-async HM <-> BT', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post', async: false }),
  });

  Comment.reopen({
    post: DS.belongsTo('post', { async: false }),
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    let serialized = snapshot.record.serialize();
    serialized.data.id = 2;
    return resolve(serialized);
  };
  let post, firstComment;

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '1' }],
        },
      },
    },
  });
  env.store.push({
    data: {
      type: 'comment',
      id: '1',
      relationships: {
        comments: {
          post: { type: 'post', id: '1' },
        },
      },
    },
  });
  post = env.store.peekRecord('post', 1);
  firstComment = env.store.peekRecord('comment', 1);

  let comment = env.store.createRecord('comment', {
    post: post,
  });
  await comment.save();
  let commentPost = await comment.get('post');
  let postComments = await comment.get('post.comments');
  let postCommentsLength = await comment.get('post.comments.length');

  assert.deepEqual(post, commentPost, 'expect the new comments post, to be the correct post');
  assert.ok(postComments, 'comments should exist');
  assert.equal(postCommentsLength, 2, "comment's post should have a internalModel back to comment");
  assert.ok(
    postComments && postComments.indexOf(firstComment) !== -1,
    'expect to contain first comment'
  );
  assert.ok(
    postComments && postComments.indexOf(comment) !== -1,
    'expected to contain the new comment'
  );
});

test('When an unloaded record is added to the hasMany, it gets fetched once the hasMany is accessed even if the hasMany has been already fetched', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  const { store, adapter } = env;

  let findManyCalls = 0;
  let findRecordCalls = 0;

  adapter.findMany = function(store, type, ids, snapshots) {
    assert.ok(true, `findMany called ${++findManyCalls}x`);
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'first' } },
        { id: 2, type: 'comment', attributes: { body: 'second' } },
      ],
    });
  };

  adapter.findRecord = function(store, type, id, snapshot) {
    assert.ok(true, `findRecord called ${++findRecordCalls}x`);

    return resolve({ data: { id: 3, type: 'comment', attributes: { body: 'third' } } });
  };

  let post = store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '1' }, { type: 'comment', id: '2' }],
        },
      },
    },
  });

  let fetchedComments = await post.get('comments');

  assert.equal(fetchedComments.get('length'), 2, 'comments fetched successfully');
  assert.equal(
    fetchedComments.objectAt(0).get('body'),
    'first',
    'first comment loaded successfully'
  );

  store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [
            { type: 'comment', id: '1' },
            { type: 'comment', id: '2' },
            { type: 'comment', id: '3' },
          ],
        },
      },
    },
  });

  let newlyFetchedComments = await post.get('comments');

  assert.equal(newlyFetchedComments.get('length'), 3, 'all three comments fetched successfully');
  assert.equal(
    newlyFetchedComments.objectAt(2).get('body'),
    'third',
    'third comment loaded successfully'
  );
});

skip('A sync hasMany errors out if there are unloaded records in it', function(assert) {
  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '1' }, { type: 'comment', id: '2' }],
        },
      },
    },
  });
  let post = env.store.peekRecord('post', 1);

  assert.expectAssertion(() => {
    run(post, 'get', 'comments');
  }, /You looked up the 'comments' relationship on a 'post' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`DS.hasMany\({ async: true }\)`\)/);
});

test('After removing and unloading a record, a hasMany relationship should still be valid', async function(assert) {
  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '1' }],
        },
      },
    },
    included: [{ type: 'comment', id: '1' }],
  });
  const post = env.store.peekRecord('post', 1);
  const comments = await post.get('comments');
  const comment = comments.objectAt(0);
  comments.removeObject(comment);
  env.store.unloadRecord(comment);
  assert.equal(comments.get('length'), 0);

  // Explicitly re-get comments
  assert.equal(run(post, 'get', 'comments.length'), 0);
});

test('If reordered hasMany data has been pushed to the store, the many array reflects the ordering change - sync', async function(assert) {
  let comment1, comment2, comment3, comment4;
  let post;

  env.store.push({
    data: [
      {
        type: 'comment',
        id: '1',
      },
      {
        type: 'comment',
        id: '2',
      },
      {
        type: 'comment',
        id: '3',
      },
      {
        type: 'comment',
        id: '4',
      },
    ],
  });

  comment1 = env.store.peekRecord('comment', 1);
  comment2 = env.store.peekRecord('comment', 2);
  comment3 = env.store.peekRecord('comment', 3);
  comment4 = env.store.peekRecord('comment', 4);

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '1' }, { type: 'comment', id: '2' }],
        },
      },
    },
  });
  post = env.store.peekRecord('post', 1);

  assert.deepEqual(
    post.get('comments').toArray(),
    [comment1, comment2],
    'Initial ordering is correct'
  );

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '2' }, { type: 'comment', id: '1' }],
        },
      },
    },
  });
  assert.deepEqual(
    post.get('comments').toArray(),
    [comment2, comment1],
    'Updated ordering is correct'
  );

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '2' }],
        },
      },
    },
  });
  assert.deepEqual(post.get('comments').toArray(), [comment2], 'Updated ordering is correct');

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
            { type: 'comment', id: '4' },
          ],
        },
      },
    },
  });
  assert.deepEqual(
    post.get('comments').toArray(),
    [comment1, comment2, comment3, comment4],
    'Updated ordering is correct'
  );

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '4' }, { type: 'comment', id: '3' }],
        },
      },
    },
  });
  assert.deepEqual(
    post.get('comments').toArray(),
    [comment4, comment3],
    'Updated ordering is correct'
  );

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
            { type: 'comment', id: '1' },
          ],
        },
      },
    },
  });

  assert.deepEqual(
    post.get('comments').toArray(),
    [comment4, comment2, comment3, comment1],
    'Updated ordering is correct'
  );
});

test('Rolling back attributes for deleted record restores implicit relationship correctly when the hasMany side has been deleted - async', async function(assert) {
  let book, chapter;

  env.store.push({
    data: {
      type: 'book',
      id: '1',
      attributes: {
        title: "Stanley's Amazing Adventures",
      },
      relationships: {
        chapters: {
          data: [{ type: 'chapter', id: '2' }],
        },
      },
    },
    included: [
      {
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas',
        },
      },
    ],
  });
  book = env.store.peekRecord('book', 1);
  chapter = env.store.peekRecord('chapter', 2);

  chapter.deleteRecord();
  chapter.rollbackAttributes();

  let fetchedChapters = await book.get('chapters');
  assert.equal(
    fetchedChapters.objectAt(0),
    chapter,
    'Book has a chapter after rollback attributes'
  );
});

test('Rolling back attributes for deleted record restores implicit relationship correctly when the hasMany side has been deleted - sync', async function(assert) {
  let book, chapter;

  env.store.push({
    data: {
      type: 'book',
      id: '1',
      attributes: {
        title: "Stanley's Amazing Adventures",
      },
      relationships: {
        chapters: {
          data: [{ type: 'chapter', id: '2' }],
        },
      },
    },
    included: [
      {
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas',
        },
      },
    ],
  });
  book = env.store.peekRecord('book', 1);
  chapter = env.store.peekRecord('chapter', 2);
  chapter.deleteRecord();
  chapter.rollbackAttributes();
  assert.equal(
    book.get('chapters.firstObject'),
    chapter,
    'Book has a chapter after rollback attributes'
  );
});

test('Rolling back attributes for deleted record restores implicit relationship correctly when the belongsTo side has been deleted - async', async function(assert) {
  Page.reopen({
    chapter: DS.belongsTo('chapter', { async: true }),
  });

  let chapter, page;

  env.store.push({
    data: {
      type: 'chapter',
      id: '2',
      attributes: {
        title: 'Sailing the Seven Seas',
      },
    },
    included: [
      {
        type: 'page',
        id: '3',
        attributes: {
          number: 1,
        },
        relationships: {
          chapter: {
            data: { type: 'chapter', id: '2' },
          },
        },
      },
    ],
  });
  chapter = env.store.peekRecord('chapter', 2);
  page = env.store.peekRecord('page', 3);
  chapter.deleteRecord();
  chapter.rollbackAttributes();
  let fetchedChapter = await page.get('chapter');
  assert.equal(fetchedChapter, chapter, 'Page has a chapter after rollback attributes');
});

test('Rolling back attributes for deleted record restores implicit relationship correctly when the belongsTo side has been deleted - sync', async function(assert) {
  let chapter, page;
  env.store.push({
    data: {
      type: 'chapter',
      id: '2',
      attributes: {
        title: 'Sailing the Seven Seas',
      },
    },
    included: [
      {
        type: 'page',
        id: '3',
        attributes: {
          number: 1,
        },
        relationships: {
          chapter: {
            data: { type: 'chapter', id: '2' },
          },
        },
      },
    ],
  });
  chapter = env.store.peekRecord('chapter', 2);
  page = env.store.peekRecord('page', 3);
  chapter.deleteRecord();
  chapter.rollbackAttributes();
  assert.equal(await page.get('chapter'), chapter, 'Page has a chapter after rollback attributes');
});

test('ManyArray notifies the array observers and flushes bindings when removing', async function(assert) {
  let chapter, page, page2;
  let observe = false;

  env.store.push({
    data: [
      {
        type: 'page',
        id: '1',
        attributes: {
          number: 1,
        },
      },
      {
        type: 'page',
        id: '2',
        attributes: {
          number: 2,
        },
      },
      {
        type: 'chapter',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas',
        },
        relationships: {
          pages: {
            data: [{ type: 'page', id: '1' }, { type: 'page', id: '2' }],
          },
        },
      },
    ],
  });
  page = env.store.peekRecord('page', 1);
  page2 = env.store.peekRecord('page', 2);
  chapter = env.store.peekRecord('chapter', 1);

  chapter.get('pages').addArrayObserver(this, {
    willChange(pages, index, removeCount, addCount) {
      if (observe) {
        assert.equal(pages.objectAt(index), page2, 'page2 is passed to willChange');
      }
    },
    didChange(pages, index, removeCount, addCount) {
      if (observe) {
        assert.equal(removeCount, 1, 'removeCount is correct');
      }
    },
  });

  observe = true;
  page2.set('chapter', null);
  observe = false;
});

test('ManyArray notifies the array observers and flushes bindings when adding', async function(assert) {
  let chapter, page, page2;
  let observe = false;

  env.store.push({
    data: [
      {
        type: 'page',
        id: '1',
        attributes: {
          number: 1,
        },
      },
      {
        type: 'page',
        id: '2',
        attributes: {
          number: 2,
        },
      },
      {
        type: 'chapter',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas',
        },
        relationships: {
          pages: {
            data: [{ type: 'page', id: '1' }],
          },
        },
      },
    ],
  });
  page = env.store.peekRecord('page', 1);
  page2 = env.store.peekRecord('page', 2);
  chapter = env.store.peekRecord('chapter', 1);

  chapter.get('pages').addArrayObserver(this, {
    willChange(pages, index, removeCount, addCount) {
      if (observe) {
        assert.equal(addCount, 1, 'addCount is correct');
      }
    },
    didChange(pages, index, removeCount, addCount) {
      if (observe) {
        assert.equal(pages.objectAt(index), page2, 'page2 is passed to didChange');
      }
    },
  });

  observe = true;
  page2.set('chapter', chapter);
  observe = false;
});

testInDebug('Passing a model as type to hasMany should not work', async function(assert) {
  assert.expectAssertion(() => {
    User = DS.Model.extend();

    Contact = DS.Model.extend({
      users: hasMany(User, { async: false }),
    });
  }, /The first argument to DS.hasMany must be a string/);
});

test('Relationship.clear removes all records correctly', async function(assert) {
  let post;

  Comment.reopen({
    post: DS.belongsTo('post', { async: false }),
  });

  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post', async: false }),
  });

  env.store.push({
    data: [
      {
        type: 'post',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas',
        },
        relationships: {
          comments: {
            data: [{ type: 'comment', id: '1' }, { type: 'comment', id: '2' }],
          },
        },
      },
      {
        type: 'comment',
        id: '1',
        relationships: {
          post: {
            data: { type: 'post', id: '2' },
          },
        },
      },
      {
        type: 'comment',
        id: '2',
        relationships: {
          post: {
            data: { type: 'post', id: '2' },
          },
        },
      },
      {
        type: 'comment',
        id: '3',
        relationships: {
          post: {
            data: { type: 'post', id: '2' },
          },
        },
      },
    ],
  });
  post = env.store.peekRecord('post', 2);

  relationshipStateFor(post, 'comments').clear();
  let comments = A(env.store.peekAll('comment'));
  assert.deepEqual(comments.mapBy('post'), [null, null, null]);
});

test('unloading a record with associated records does not prevent the store from tearing down', async function(assert) {
  let post;

  Comment.reopen({
    post: DS.belongsTo('post', { async: false }),
  });

  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post', async: false }),
  });

  env.store.push({
    data: [
      {
        type: 'post',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas',
        },
        relationships: {
          comments: {
            data: [{ type: 'comment', id: '1' }, { type: 'comment', id: '2' }],
          },
        },
      },
      {
        type: 'comment',
        id: '1',
        relationships: {
          post: {
            data: { type: 'post', id: '2' },
          },
        },
      },
      {
        type: 'comment',
        id: '2',
        relationships: {
          post: {
            data: { type: 'post', id: '2' },
          },
        },
      },
    ],
  });
  post = env.store.peekRecord('post', 2);

  // This line triggers the original bug that gets manifested
  // in teardown for apps, e.g. store.destroy that is caused by
  // App.destroy().
  // Relationship#clear uses Ember.Set#forEach, which does incorrect
  // iteration when the set is being mutated (in our case, the index gets off
  // because records are being removed)
  env.store.unloadRecord(post);

  try {
    env.store.destroy();
    assert.ok(true, 'store destroyed correctly');
  } catch (error) {
    assert.ok(false, 'store prevented from being destroyed');
  }
});

test('adding and removing records from hasMany relationship #2666', async function(assert) {
  let Post = DS.Model.extend({
    comments: DS.hasMany('comment', { async: true }),
  });
  Post.reopenClass({ toString: () => 'Post' });

  let Comment = DS.Model.extend({
    post: DS.belongsTo('post', { async: false }),
  });
  Comment.reopenClass({ toString: () => 'Comment' });

  env = setupStore({
    post: Post,
    comment: Comment,
    adapter: DS.RESTAdapter.extend({
      shouldBackgroundReloadRecord: () => false,
    }),
  });

  let commentId = 4;
  env.owner.register(
    'adapter:comment',
    DS.RESTAdapter.extend({
      deleteRecord(record) {
        return resolve();
      },
      updateRecord(record) {
        return resolve();
      },
      createRecord() {
        return resolve({ comments: { id: commentId++ } });
      },
    })
  );

  env.store.push({
    data: [
      {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
      {
        type: 'comment',
        id: '1',
      },
      {
        type: 'comment',
        id: '2',
      },
      {
        type: 'comment',
        id: '3',
      },
    ],
  });

  let post = await env.store.findRecord('post', 1);
  let comments = await post.get('comments');
  assert.equal(comments.get('length'), 3, 'Initial comments count');

  // Add comment #4
  let comment = env.store.createRecord('comment');
  comments.addObject(comment);

  await comment.save();
  comments = await post.get('comments');
  assert.equal(comments.get('length'), 4, 'Comments count after first add');

  // Delete comment #4
  await comments.get('lastObject').destroyRecord();
  comments = await post.get('comments');
  let length = comments.get('length');

  assert.equal(length, 3, 'Comments count after destroy');

  // Add another comment #4
  comment = env.store.createRecord('comment');
  comments.addObject(comment);
  await comment.save();

  comments = await post.get('comments');
  assert.equal(comments.get('length'), 4, 'Comments count after second add');
});

test('hasMany hasAnyRelationshipData async loaded', async function(assert) {
  Chapter.reopen({
    pages: hasMany('pages', { async: true }),
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({
      data: {
        id: 1,
        type: 'chapter',
        attributes: { title: 'The Story Begins' },
        relationships: {
          pages: {
            data: [{ id: 2, type: 'page' }, { id: 3, type: 'page' }],
          },
        },
      },
    });
  };

  let chapter = await store.findRecord('chapter', 1);
  let relationship = relationshipStateFor(chapter, 'pages');
  assert.equal(relationship.hasAnyRelationshipData, true, 'relationship has data');
});

test('hasMany hasAnyRelationshipData sync loaded', async function(assert) {
  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({
      data: {
        id: 1,
        type: 'chapter',
        attributes: { title: 'The Story Begins' },
        relationships: {
          pages: {
            data: [{ id: 2, type: 'page' }, { id: 3, type: 'page' }],
          },
        },
      },
    });
  };

  let chapter = await store.findRecord('chapter', 1);
  let relationship = relationshipStateFor(chapter, 'pages');
  assert.equal(relationship.hasAnyRelationshipData, true, 'relationship has data');
});

test('hasMany hasAnyRelationshipData async not loaded', async function(assert) {
  Chapter.reopen({
    pages: hasMany('pages', { async: true }),
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({
      data: {
        id: 1,
        type: 'chapter',
        attributes: { title: 'The Story Begins' },
        relationships: {
          pages: {
            links: { related: 'pages' },
          },
        },
      },
    });
  };

  let chapter = await store.findRecord('chapter', 1);
  let relationship = relationshipStateFor(chapter, 'pages');
  assert.equal(relationship.hasAnyRelationshipData, false, 'relationship does not have data');
});

test('hasMany hasAnyRelationshipData sync not loaded', async function(assert) {
  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({
      data: {
        id: 1,
        type: 'chapter',
        attributes: { title: 'The Story Begins' },
      },
    });
  };

  let chapter = await store.findRecord('chapter', 1);
  let relationship = relationshipStateFor(chapter, 'pages');
  assert.equal(relationship.hasAnyRelationshipData, false, 'relationship does not have data');
});

test('hasMany hasAnyRelationshipData async created', async function(assert) {
  Chapter.reopen({
    pages: hasMany('pages', { async: true }),
  });

  let chapter = store.createRecord('chapter', { title: 'The Story Begins' });
  let page = store.createRecord('page');

  let relationship = relationshipStateFor(chapter, 'pages');
  assert.equal(relationship.hasAnyRelationshipData, false, 'relationship does not have data');

  chapter = store.createRecord('chapter', {
    title: 'The Story Begins',
    pages: [page],
  });

  relationship = relationshipStateFor(chapter, 'pages');
  assert.equal(relationship.hasAnyRelationshipData, true, 'relationship has data');
});

test('hasMany hasAnyRelationshipData sync created', async function(assert) {
  let chapter = store.createRecord('chapter', { title: 'The Story Begins' });
  let relationship = relationshipStateFor(chapter, 'pages');

  assert.equal(relationship.hasAnyRelationshipData, false, 'relationship does not have data');

  chapter = store.createRecord('chapter', {
    title: 'The Story Begins',
    pages: [store.createRecord('page')],
  });
  relationship = relationshipStateFor(chapter, 'pages');

  assert.equal(relationship.hasAnyRelationshipData, true, 'relationship has data');
});

test("Model's hasMany relationship should not be created during model creation", async function(assert) {
  let user;

  env.store.push({
    data: {
      type: 'user',
      id: '1',
    },
  });
  user = env.store.peekRecord('user', 1);
  assert.ok(
    !relationshipsFor(user).has('messages'),
    'Newly created record should not have relationships'
  );
});

test("Model's belongsTo relationship should be created during 'get' method", async function(assert) {
  let user;

  user = env.store.createRecord('user');
  user.get('messages');
  assert.ok(
    relationshipsFor(user).has('messages'),
    'Newly created record with relationships in params passed in its constructor should have relationships'
  );
});

test('metadata is accessible when pushed as a meta property for a relationship', async function(assert) {
  env.adapter.findHasMany = function() {
    return resolve({});
  };

  env.store.push({
    data: {
      type: 'book',
      id: '1',
      attributes: {
        title: 'Sailing the Seven Seas',
      },
      relationships: {
        chapters: {
          meta: {
            where: 'the lefkada sea',
          },
          links: {
            related: '/chapters',
          },
        },
      },
    },
  });
  let book = env.store.peekRecord('book', 1);

  assert.equal(
    relationshipStateFor(book, 'chapters').meta.where,
    'the lefkada sea',
    'meta is there'
  );
});

test('metadata is accessible when return from a fetchLink', async function(assert) {
  env.owner.register('serializer:application', DS.RESTSerializer);

  env.adapter.findHasMany = function() {
    return resolve({
      meta: {
        foo: 'bar',
      },
      chapters: [{ id: '2' }, { id: '3' }],
    });
  };

  env.store.push({
    data: {
      type: 'book',
      id: '1',
      attributes: {
        title: 'Sailing the Seven Seas',
      },
      relationships: {
        chapters: {
          links: {
            related: '/chapters',
          },
        },
      },
    },
  });
  let book = env.store.peekRecord('book', 1);

  let chapters = await book.get('chapters');
  let meta = chapters.get('meta');
  assert.equal(get(meta, 'foo'), 'bar', 'metadata is available');
});

test('metadata should be reset between requests', async function(assert) {
  let counter = 0;
  env.owner.register('serializer:application', DS.RESTSerializer);

  env.adapter.findHasMany = function() {
    let data = {
      meta: {
        foo: 'bar',
      },
      chapters: [{ id: '2' }, { id: '3' }],
    };

    assert.ok(true, 'findHasMany should be called twice');

    if (counter === 1) {
      delete data.meta;
    }

    counter++;

    return resolve(data);
  };

  env.store.push({
    data: [
      {
        type: 'book',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas',
        },
        relationships: {
          chapters: {
            links: {
              related: 'chapters',
            },
          },
        },
      },
      {
        type: 'book',
        id: '2',
        attributes: {
          title: 'Another book title',
        },
        relationships: {
          chapters: {
            links: {
              related: 'chapters',
            },
          },
        },
      },
    ],
  });
  let book1 = env.store.peekRecord('book', 1);
  let book2 = env.store.peekRecord('book', 2);

  let chapters = await book1.get('chapters');
  let meta = chapters.get('meta');
  assert.equal(get(meta, 'foo'), 'bar', 'metadata should available');

  chapters = await book2.get('chapters');
  meta = chapters.get('meta');

  assert.equal(meta, undefined, 'metadata should not be available');
});

test('Related link should be fetched when no relationship data is present', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true, inverse: 'post' }),
  });
  Comment.reopen({
    post: DS.belongsTo('post', { async: false, inverse: 'comments' }),
  });
  env.adapter.shouldBackgroundReloadRecord = () => {
    return false;
  };
  env.adapter.findRecord = () => {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };
  env.adapter.findMany = () => {
    assert.ok(false, "The adapter's findMany method should not be called");
  };

  env.adapter.findHasMany = function(store, snapshot, url, relationship) {
    assert.equal(url, 'get-comments', 'url is correct');
    assert.ok(true, "The adapter's findHasMany method should be called");
    return resolve({
      data: [
        {
          id: '1',
          type: 'comment',
          attributes: {
            body: 'This is comment',
          },
        },
      ],
    });
  };

  let post = env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: 'get-comments',
          },
        },
      },
    },
  });

  let comments = await post.get('comments');
  assert.equal(comments.get('firstObject.body'), 'This is comment', 'comment body is correct');
});

test('Related link should take precedence over relationship data when local record data is missing', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true, inverse: 'post' }),
  });
  Comment.reopen({
    post: DS.belongsTo('post', { async: false, inverse: 'comments' }),
  });
  env.adapter.shouldBackgroundReloadRecord = () => {
    return false;
  };
  env.adapter.findRecord = () => {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };
  env.adapter.findMany = () => {
    assert.ok(false, "The adapter's findMany method should not be called");
  };

  env.adapter.findHasMany = function(store, snapshot, url, relationship) {
    assert.equal(url, 'get-comments', 'url is correct');
    assert.ok(true, "The adapter's findHasMany method should be called");
    return resolve({
      data: [
        {
          id: '1',
          type: 'comment',
          attributes: {
            body: 'This is comment',
          },
        },
      ],
    });
  };

  let post = env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: 'get-comments',
          },
          data: [{ type: 'comment', id: '1' }],
        },
      },
    },
  });

  let comments = await post.get('comments');
  assert.equal(comments.get('firstObject.body'), 'This is comment', 'comment body is correct');
});

test('Local relationship data should take precedence over related link when local record data is available', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true, inverse: 'post' }),
  });
  Comment.reopen({
    post: DS.belongsTo('post', { async: false, inverse: 'comments' }),
  });
  env.adapter.shouldBackgroundReloadRecord = () => {
    return false;
  };
  env.adapter.findRecord = () => {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };
  env.adapter.findMany = () => {
    assert.ok(false, "The adapter's findMany method should not be called");
  };

  env.adapter.findHasMany = function(store, snapshot, url, relationship) {
    assert.ok(false, "The adapter's findHasMany method should not be called");
  };

  let post = env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: 'get-comments',
          },
          data: [{ type: 'comment', id: '1' }],
        },
      },
    },
    included: [
      {
        id: '1',
        type: 'comment',
        attributes: {
          body: 'This is comment',
        },
      },
    ],
  });

  let comments = await post.get('comments');
  assert.equal(comments.get('firstObject.body'), 'This is comment', 'comment body is correct');
});

test('Related link should take precedence over local record data when relationship data is not initially available', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true, inverse: 'post' }),
  });
  Comment.reopen({
    post: DS.belongsTo('post', { async: false, inverse: 'comments' }),
  });
  env.adapter.shouldBackgroundReloadRecord = () => {
    return false;
  };
  env.adapter.findRecord = () => {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };
  env.adapter.findMany = () => {
    assert.ok(false, "The adapter's findMany method should not be called");
  };

  env.adapter.findHasMany = function(store, snapshot, url, relationship) {
    assert.equal(url, 'get-comments', 'url is correct');
    assert.ok(true, "The adapter's findHasMany method should be called");
    return resolve({
      data: [
        {
          id: '1',
          type: 'comment',
          attributes: {
            body: 'This is comment fetched by link',
          },
        },
      ],
    });
  };

  let post = env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: 'get-comments',
          },
        },
      },
    },
    included: [
      {
        id: '1',
        type: 'comment',
        attributes: {
          body: 'This is comment',
        },
        relationships: {
          post: {
            data: {
              type: 'post',
              id: '1',
            },
          },
        },
      },
    ],
  });

  let comments = await post.get('comments');
  assert.equal(
    comments.get('firstObject.body'),
    'This is comment fetched by link',
    'comment body is correct'
  );
});

test('Updated related link should take precedence over relationship data and local record data', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findHasMany = function(store, snapshot, url, relationship) {
    assert.equal(url, 'comments-updated-link', 'url is correct');
    assert.ok(true, "The adapter's findHasMany method should be called");
    return resolve({
      data: [{ id: 1, type: 'comment', attributes: { body: 'This is updated comment' } }],
    });
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };

  let post = env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: 'comments',
          },
          data: [{ type: 'comment', id: '1' }],
        },
      },
    },
  });

  env.store.push({
    data: {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          links: {
            related: 'comments-updated-link',
          },
        },
      },
    },
  });

  let comments = await post.get('comments');
  assert.equal(
    comments.get('firstObject.body'),
    'This is updated comment',
    'comment body is correct'
  );
});

test('PromiseArray proxies createRecord to its ManyArray before the hasMany is loaded', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  let post = env.store.push({
    data: {
      type: 'post',
      id: 1,
      relationships: {
        comments: {
          links: {
            related: 'someLink',
          },
        },
      },
    },
  });

  let comments = post.get('comments');
  comments.createRecord();
  await comments;
  assert.equal(comments.get('length'), 3, 'comments have 3 length, including new record');
});

test('deleteRecord + unloadRecord fun', async function(assert) {
  User.reopen({
    posts: DS.hasMany('post', { inverse: null }),
  });
  Post.reopen({
    user: DS.belongsTo('user', { inverse: null, async: false }),
  });

  env.store.push({
    data: [
      {
        type: 'user',
        id: 'user-1',
        attributes: {
          name: 'Adolfo Builes',
        },
        relationships: {
          posts: {
            data: [
              { type: 'post', id: 'post-1' },
              { type: 'post', id: 'post-2' },
              { type: 'post', id: 'post-3' },
              { type: 'post', id: 'post-4' },
              { type: 'post', id: 'post-5' },
            ],
          },
        },
      },
      { type: 'post', id: 'post-1' },
      { type: 'post', id: 'post-2' },
      { type: 'post', id: 'post-3' },
      { type: 'post', id: 'post-4' },
      { type: 'post', id: 'post-5' },
    ],
  });

  let user = env.store.peekRecord('user', 'user-1');
  let posts = await user.get('posts');

  env.store.adapterFor('post').deleteRecord = function() {
    // just acknowledge all deletes, but with a noop
    return { data: null };
  };

  assert.deepEqual(posts.map(x => x.get('id')), ['post-1', 'post-2', 'post-3', 'post-4', 'post-5']);

  let record = await env.store.peekRecord('post', 'post-2').destroyRecord();
  await env.store.unloadRecord(record);
  assert.deepEqual(posts.map(x => x.get('id')), ['post-1', 'post-3', 'post-4', 'post-5']);

  record = await env.store.peekRecord('post', 'post-3').destroyRecord();
  await env.store.unloadRecord(record);
  assert.deepEqual(posts.map(x => x.get('id')), ['post-1', 'post-4', 'post-5']);

  record = await env.store.peekRecord('post', 'post-4').destroyRecord();
  await env.store.unloadRecord(record);
  assert.deepEqual(posts.map(x => x.get('id')), ['post-1', 'post-5']);
});

test('unloading and reloading a record with hasMany relationship in run-loop - #3084', async function(assert) {
  let user;
  let message;

  run(() => {
    env.store.push({
      data: [
        {
          type: 'user',
          id: 'user-1',
          attributes: {
            name: 'Adolfo Builes',
          },
          relationships: {
            messages: {
              data: [{ type: 'message', id: 'message-1' }],
            },
          },
        },
        {
          type: 'message',
          id: 'message-1',
        },
      ],
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
      data: [
        {
          type: 'user',
          id: 'user-1',
          attributes: {
            name: 'Adolfo Builes',
          },
          relationships: {
            messages: {
              data: [{ type: 'message', id: 'message-1' }],
            },
          },
        },
      ],
    });

    user = env.store.peekRecord('user', 'user-1');

    assert.equal(get(user, 'messages.firstObject.id'), 'message-1', 'user points to message');
    assert.equal(get(message, 'user.id'), 'user-1', 'message points to user');
  });
});

test('unloading and reloading a record with hasMany relationship using async - #3084', async function(assert) {
  env.store.push({
    data: [
      {
        type: 'user',
        id: 'user-1',
        attributes: {
          name: 'Adolfo Builes',
        },
        relationships: {
          messages: {
            data: [{ type: 'message', id: 'message-1' }],
          },
        },
      },
      {
        type: 'message',
        id: 'message-1',
      },
    ],
  });

  let user = env.store.peekRecord('user', 'user-1');
  let message = env.store.peekRecord('message', 'message-1');

  assert.equal(await get(user, 'messages.firstObject.id'), 'message-1');
  assert.equal(await get(message, 'user.id'), 'user-1');

  env.store.unloadRecord(user);

  // The record is resurrected for some reason.
  env.store.push({
    data: [
      {
        type: 'user',
        id: 'user-1',
        attributes: {
          name: 'Adolfo Builes',
        },
        relationships: {
          messages: {
            data: [{ type: 'message', id: 'message-1' }],
          },
        },
      },
    ],
  });

  user = env.store.peekRecord('user', 'user-1');

  await settled();

  assert.equal(await get(user, 'messages.firstObject.id'), 'message-1', 'user points to message');
  let messageUser = await get(message, 'user');
  assert.equal(get(messageUser, 'id'), 'user-1', 'message points to user');
});

test('deleted records should stay deleted', async function(assert) {
  env.adapter.deleteRecord = function(store, type, id) {
    return null;
  };

  env.store.push({
    data: [
      {
        type: 'user',
        id: 'user-1',
        attributes: {
          name: 'Adolfo Builes',
        },
        relationships: {
          messages: {
            data: [{ type: 'message', id: 'message-1' }, { type: 'message', id: 'message-2' }],
          },
        },
      },
      {
        type: 'message',
        id: 'message-1',
      },
      {
        type: 'message',
        id: 'message-2',
      },
    ],
  });

  let user = env.store.peekRecord('user', 'user-1');
  let message = env.store.peekRecord('message', 'message-1');

  assert.equal(get(user, 'messages.length'), 2);

  await message.destroyRecord();

  // a new message is added to the user should not resurrected the
  // deleted message
  env.store.push({
    data: [
      {
        type: 'message',
        id: 'message-3',
        relationships: {
          user: {
            data: { type: 'user', id: 'user-1' },
          },
        },
      },
    ],
  });

  assert.deepEqual(
    get(user, 'messages').mapBy('id'),
    ['message-2', 'message-3'],
    'user should have 2 message since 1 was deleted'
  );
});

test("hasMany relationship with links doesn't trigger extra change notifications - #4942", async function(assert) {
  env.store.push({
    data: {
      type: 'book',
      id: '1',
      relationships: {
        chapters: {
          data: [{ type: 'chapter', id: '1' }],
          links: { related: '/book/1/chapters' },
        },
      },
    },
    included: [{ type: 'chapter', id: '1' }],
  });

  let book = env.store.peekRecord('book', '1');
  let count = 0;

  book.addObserver('chapters', () => {
    count++;
  });

  await book.get('chapters');

  assert.equal(count, 0);
});

test('A hasMany relationship with a link will trigger the link request even if a inverse related object is pushed to the store', async function(assert) {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true }),
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true }),
  });

  const postID = '1';

  // load a record with a link hasMany relationship
  env.store.push({
    data: {
      type: 'post',
      id: postID,
      relationships: {
        comments: {
          links: {
            related: '/posts/1/comments',
          },
        },
      },
    },
  });

  // if a related comment is pushed into the store,
  // the post.comments.link will not be requested
  //
  // If this comment is not inserted into the store, everything works properly
  env.store.push({
    data: {
      type: 'comment',
      id: '1',
      attributes: { body: 'First' },
      relationships: {
        message: {
          data: { type: 'post', id: postID },
        },
      },
    },
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    throw new Error(`findRecord for ${type} should not be called`);
  };

  let hasManyCounter = 0;
  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    assert.equal(relationship.type, 'comment', 'findHasMany relationship type was Comment');
    assert.equal(relationship.key, 'comments', 'findHasMany relationship key was comments');
    assert.equal(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');
    hasManyCounter++;

    return resolve({
      data: [
        { id: 1, type: 'comment', attributes: { body: 'First' } },
        { id: 2, type: 'comment', attributes: { body: 'Second' } },
      ],
    });
  };

  const post = env.store.peekRecord('post', postID);
  let comments = await post.get('comments');
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(hasManyCounter, 1, 'link was requested');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');

  comments = await post.hasMany('comments').reload();
  assert.equal(comments.get('isLoaded'), true, 'comments are loaded');
  assert.equal(hasManyCounter, 2, 'link was requested');
  assert.equal(comments.get('length'), 2, 'comments have 2 length');
});
