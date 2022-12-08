/*eslint no-unused-vars: ["error", { "args": "none", "varsIgnorePattern": "(page)" }]*/

import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { all, hash, Promise as EmberPromise, reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { DEPRECATE_ARRAY_LIKE } from '@ember-data/private-build-infra/deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer from '@ember-data/serializer/rest';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

import { getRelationshipStateForRecord, hasRelationshipForRecord } from '../../helpers/accessors';

module('integration/relationships/has_many - Has-Many Relationships', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    class User extends Model {
      @attr name;
      @hasMany('message', { polymorphic: true, async: false, inverse: 'user' }) messages;
      @hasMany('user', { inverse: null, async: false }) contacts;
    }

    class Contact extends Model {
      @belongsTo('user', { async: false, inverse: null }) user;
    }

    class Email extends Model {
      @belongsTo('user', { async: false, inverse: null }) user;
      @attr email;
    }

    class Phone extends Model {
      @belongsTo('user', { async: false, inverse: null }) user;
      @attr number;
    }

    class Message extends Model {
      @attr('date') created_at;
      @belongsTo('user', { async: false, inverse: 'messages', as: 'message' }) user;
    }

    class Post extends Model {
      @attr('date') created_at;
      @belongsTo('user', { async: false, inverse: 'messages', as: 'message' }) user;
      @attr title;
      @hasMany('comment', { async: false, inverse: 'message', as: 'post' }) comments;
    }

    class Comment extends Model {
      @attr('date') created_at;
      @belongsTo('user', { async: false, inverse: 'messages', as: 'message' }) user;
      @attr body;
      @belongsTo('post', { polymorphic: true, async: true, inverse: 'comments' }) message;
    }

    class Book extends Model {
      @attr title;
      @hasMany('chapter', { async: true, inverse: null }) chapters;
    }

    class Chapter extends Model {
      @attr title;
      @hasMany('page', { async: false, inverse: 'chapter' }) pages;
    }

    class Page extends Model {
      @attr number;
      @belongsTo('chapter', { async: false, inverse: 'pages' }) chapter;
    }

    this.owner.register('model:user', User);
    this.owner.register('model:contact', Contact);
    this.owner.register('model:email', Email);
    this.owner.register('model:phone', Phone);
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:message', Message);
    this.owner.register('model:book', Book);
    this.owner.register('model:chapter', Chapter);
    this.owner.register('model:page', Page);

    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  testInDebug(
    'hasMany relationships fetched by link should error if no data member is present in the returned payload',
    async function (assert) {
      class Company extends Model {
        @hasMany('employee', { inverse: null, async: true })
        employees;
        @attr name;
      }
      class Employee extends Model {
        @attr name;
      }
      this.owner.register('model:employee', Employee);
      this.owner.register('model:company', Company);
      this.owner.register(
        'adapter:company',
        JSONAPIAdapter.extend({
          findHasMany(store, type, snapshot) {
            return resolve({
              links: {
                related: 'company/1/employees',
              },
              meta: {},
            });
          },
        })
      );

      const store = this.owner.lookup('service:store');
      const company = store.push({
        data: {
          type: 'company',
          id: '1',
          attributes: {
            name: 'Github',
          },
          relationships: {
            employees: {
              links: {
                related: 'company/1/employees',
              },
            },
          },
        },
      });

      try {
        await company.employees;
        assert.ok(false, 'We should have thrown an error');
      } catch (e) {
        assert.strictEqual(
          e.message,
          `Assertion Failed: fetched the hasMany relationship 'employees' for company:1 with link 'company/1/employees', but no data member is present in the response. If no data exists, the response should set { data: [] }`,
          'We error appropriately'
        );
      }
    }
  );

  testInDebug('Invalid hasMany relationship identifiers throw errors for missing id', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    // test null id
    assert.expectAssertion(() => {
      run(() => {
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

        post.comments;
      });
    }, /Assertion Failed: Encountered a relationship identifier without an id for the hasMany relationship 'comments' on <post:1>, expected an identifier but found/);
  });

  testInDebug('Invalid hasMany relationship identifiers throw errors for missing type', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    // test missing type
    assert.expectAssertion(() => {
      run(() => {
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
        post.comments;
      });
    }, /Assertion Failed: Encountered a relationship identifier without a type for the hasMany relationship 'comments' on <post:2>, expected an identifier with type 'comment' but found/);
  });

  test("When a hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function (assert) {
    assert.expect(0);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let postData = {
      type: 'post',
      id: '1',
      relationships: {
        comments: {
          data: [{ type: 'comment', id: '1' }],
        },
      },
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(false, "The adapter's find method should not be called");
    };

    adapter.findRecord = function (store, type, ids, snapshots) {
      return { data: postData };
    };

    return run(() => {
      store.push({
        data: postData,
        included: [
          {
            type: 'comment',
            id: '1',
          },
        ],
      });

      return store.findRecord('post', 1).then((post) => {
        return post.comments;
      });
    });
  });

  test('hasMany + canonical vs currentState + destroyRecord  ', async function (assert) {
    assert.expect(7);

    let store = this.owner.lookup('service:store');

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
              id: '2',
            },
            {
              type: 'user',
              id: '3',
            },
            {
              type: 'user',
              id: '4',
            },
          ],
        },
      },
    };

    let user = store.push({
      data: postData,
      included: [
        {
          type: 'user',
          id: '2',
        },
        {
          type: 'user',
          id: '3',
        },
        {
          type: 'user',
          id: '4',
        },
      ],
    });

    store.adapterFor('user').deleteRecord = function () {
      return { data: { type: 'user', id: '2' } };
    };

    let contacts = user.contacts;
    assert.deepEqual(
      contacts.map((c) => c.id),
      ['2', '3', '4'],
      'user should have expected contacts'
    );

    contacts.push(store.createRecord('user', { id: '5', name: 'chris' }));
    contacts.push(store.createRecord('user', { id: '6' }));
    contacts.push(store.createRecord('user', { id: '7' }));

    assert.deepEqual(
      contacts.map((c) => c.id),
      ['2', '3', '4', '5', '6', '7'],
      'user should have expected contacts'
    );

    await store.peekRecord('user', 2).destroyRecord();
    await store.peekRecord('user', 6).destroyRecord();

    assert.deepEqual(
      contacts.map((c) => c.id),
      ['3', '4', '5', '7'],
      `user's contacts should have expected contacts`
    );
    assert.strictEqual(contacts, user.contacts);

    assert.ok(!user.contacts.initialState || !user.contacts.initialState.find((model) => model.id === '2'));

    run(() => {
      contacts.push(store.createRecord('user', { id: '8' }));
    });

    assert.deepEqual(
      contacts.map((c) => c.id),
      ['3', '4', '5', '7', '8'],
      `user's contacts should have expected contacts`
    );
    assert.strictEqual(contacts, user.contacts);
  });

  test('hasMany + canonical vs currentState + unloadRecord', function (assert) {
    assert.expect(6);

    let store = this.owner.lookup('service:store');

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
              id: '2',
            },
            {
              type: 'user',
              id: '3',
            },
            {
              type: 'user',
              id: '4',
            },
          ],
        },
      },
    };

    let user = store.push({
      data: postData,
      included: [
        {
          type: 'user',
          id: '2',
        },
        {
          type: 'user',
          id: '3',
        },
        {
          type: 'user',
          id: '4',
        },
      ],
    });
    let contacts = user.contacts;

    store.adapterFor('user').deleteRecord = function () {
      return { data: { type: 'user', id: '2' } };
    };

    assert.deepEqual(
      contacts.map((c) => c.id),
      ['2', '3', '4'],
      'user should have expected contacts'
    );

    run(() => {
      contacts.push(store.createRecord('user', { id: '5' }));
      contacts.push(store.createRecord('user', { id: '6' }));
      contacts.push(store.createRecord('user', { id: '7' }));
    });

    assert.deepEqual(
      contacts.map((c) => c.id),
      ['2', '3', '4', '5', '6', '7'],
      'user should have expected contacts'
    );

    store.peekRecord('user', 2).unloadRecord();
    store.peekRecord('user', 6).unloadRecord();

    assert.deepEqual(
      contacts.map((c) => c.id),
      ['3', '4', '5', '7'],
      `user's contacts should have expected contacts`
    );
    assert.strictEqual(contacts, user.contacts);

    contacts.push(store.createRecord('user', { id: '8' }));
    assert.deepEqual(
      contacts.map((c) => c.id),
      ['3', '4', '5', '7', '8'],
      `user's contacts should have expected contacts`
    );
    assert.strictEqual(contacts, user.contacts);
  });

  test('adapter.findMany only gets unique IDs even if duplicate IDs are present in the hasMany relationship', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Chapter = store.modelFor('chapter');

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

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.strictEqual(type, Chapter, 'type passed to adapter.findMany is correct');
      assert.deepEqual(ids, ['2', '3'], 'ids passed to adapter.findMany are unique');

      return resolve({
        data: [
          { id: '2', type: 'chapter', attributes: { title: 'Chapter One' } },
          { id: '3', type: 'chapter', attributes: { title: 'Chapter Two' } },
        ],
      });
    };

    adapter.findRecord = function (store, type, ids, snapshots) {
      return { data: bookData };
    };

    return run(() => {
      store.push({
        data: bookData,
      });

      return store.findRecord('book', 1).then((book) => {
        return book.chapters;
      });
    });
  });

  // This tests the case where a serializer materializes a has-many
  // relationship as an identifier  that it can fetch lazily. The most
  // common use case of this is to provide a URL to a collection that
  // is loaded later.
  test("A serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: true, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    // When the store asks the adapter for the record with ID 1,
    // provide some fake data.
    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(type, Post, 'find type was Post');
      assert.strictEqual(id, '1', 'find id was 1');

      return resolve({
        data: {
          id: '1',
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
    //({ id: '1', links: { comments: "/posts/1/comments" } });

    adapter.findMany = function (store, type, ids, snapshots) {
      throw new Error("Adapter's findMany should not be called");
    };

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      assert.strictEqual(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');
      assert.strictEqual(relationship.type, 'comment', 'relationship was passed correctly');

      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'First' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    };

    return run(() => {
      return store
        .findRecord('post', 1)
        .then((post) => {
          return post.comments;
        })
        .then((comments) => {
          assert.true(comments.isLoaded, 'comments are loaded');
          assert.strictEqual(comments.length, 2, 'comments have 2 length');
          assert.strictEqual(comments.at(0).body, 'First', 'comment loaded successfully');
        });
    });
  });

  test('Accessing a hasMany backed by a link multiple times triggers only one request', async function (assert) {
    assert.expect(2);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: true, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let post = store.push({
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

    let count = 0;
    adapter.findHasMany = function (store, snapshot, link, relationship) {
      count++;
      assert.strictEqual(count, 1, 'findHasMany has only been called once');
      return new EmberPromise((resolve, reject) => {
        setTimeout(() => {
          let value = {
            data: [
              { id: '1', type: 'comment', attributes: { body: 'First' } },
              { id: '2', type: 'comment', attributes: { body: 'Second' } },
            ],
          };
          resolve(value);
        }, 1);
      });
    };

    let promise1, promise2;

    promise1 = post.comments;
    //Invalidate the post.comments CP
    store.push({
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
    promise2 = post.comments;

    await all([promise1, promise2]);
    assert.strictEqual(promise1.promise, promise2.promise, 'Same promise is returned both times');
  });

  test('A hasMany backed by a link remains a promise after a record has been added to it', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: true, inverse: 'comments' }) message;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'First' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    };

    let post;
    run(() => {
      store.push({
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
      post = store.peekRecord('post', 1);
    });

    return run(() => {
      return post.comments.then(() => {
        store.push({
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

        return post.comments.then(() => {
          assert.ok(true, 'Promise was called');
        });
      });
    });
  });

  test('A hasMany updated link should not remove new children', function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: true, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      return resolve({ data: [] });
    };

    adapter.createRecord = function (store, snapshot, link, relationship) {
      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              links: { related: '/some/link' },
            },
          },
        },
      });
    };

    return run(() => {
      let post = store.createRecord('post', {});
      store.createRecord('comment', { message: post });

      return post.comments
        .then((comments) => {
          assert.strictEqual(comments.length, 1, 'initially we have one comment');

          return post.save();
        })
        .then(() => post.comments)
        .then((comments) => {
          assert.strictEqual(comments.length, 1, 'after saving, we still have one comment');
        });
    });
  });

  test('A hasMany updated link should not remove new children when the parent record has children already', function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: true, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      return resolve({
        data: [{ id: '5', type: 'comment', attributes: { body: 'hello' } }],
      });
    };

    adapter.createRecord = function (store, snapshot, link, relationship) {
      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              links: { related: '/some/link' },
            },
          },
        },
      });
    };

    return run(() => {
      let post = store.createRecord('post', {});
      store.createRecord('comment', { message: post });

      return post.comments
        .then((comments) => {
          assert.strictEqual(comments.length, 1);
          return post.save();
        })
        .then(() => post.comments)
        .then((comments) => {
          assert.strictEqual(comments.length, 2);
        });
    });
  });

  test("A hasMany relationship doesn't contain duplicate children, after the canonical state of the relationship is updated via store#push", function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: true, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function (store, snapshot, link, relationship) {
      return resolve({ data: { id: '1', type: 'post' } });
    };

    return run(() => {
      let post = store.createRecord('post', {});

      // create a new comment with id 'local', which is in the 'comments'
      // relationship of post
      let localComment = store.createRecord('comment', { id: 'local', message: post });

      return post.comments
        .then((comments) => {
          assert.strictEqual(comments.length, 1);
          assert.true(localComment.isNew);

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
          store.push({
            data: {
              type: 'post',
              id: '1',
              relationships: {
                comments: {
                  data: [{ id: 'local', type: 'comment' }],
                },
              },
            },
          });
        })
        .then(() => post.comments)
        .then((comments) => {
          assert.strictEqual(comments.length, 1);
          assert.true(localComment.isNew);
        });
    });
  });

  test('A hasMany relationship can be reloaded if it was fetched via a link', async function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(type, Post, 'find type was Post');
      assert.strictEqual(id, '1', 'find id was 1');

      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              links: { related: '/posts/1/comments' },
            },
          },
        },
      });
    };

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      assert.strictEqual(relationship.type, 'comment', 'findHasMany relationship type was Comment');
      assert.strictEqual(relationship.key, 'comments', 'findHasMany relationship key was comments');
      assert.strictEqual(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');

      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'First' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    };

    let post = await store.findRecord('post', 1);
    let comments = await post.comments;
    assert.true(comments.isLoaded, 'comments are loaded');
    assert.strictEqual(comments.length, 2, 'comments have 2 length');

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      assert.strictEqual(relationship.type, 'comment', 'findHasMany relationship type was Comment');
      assert.strictEqual(relationship.key, 'comments', 'findHasMany relationship key was comments');
      assert.strictEqual(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');

      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'First' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
          { id: '3', type: 'comment', attributes: { body: 'Thirds' } },
        ],
      });
    };

    await comments.reload();

    assert.strictEqual(comments.length, 3, 'reloaded comments have 3 length');
  });

  test('A sync hasMany relationship can be reloaded if it was fetched via ids', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(type, store.modelFor('post'), 'find type was Post');
      assert.strictEqual(id, '1', 'find id was 1');

      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              data: [
                { id: '1', type: 'comment' },
                { id: '2', type: 'comment' },
              ],
            },
          },
        },
      });
    };

    run(function () {
      store.push({
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

      store
        .findRecord('post', '1')
        .then(function (post) {
          let comments = post.comments;
          assert.true(comments.isLoaded, 'comments are loaded');
          assert.strictEqual(comments.length, 2, 'comments have a length of 2');

          adapter.findMany = function (store, type, ids, snapshots) {
            return resolve({
              data: [
                { id: '1', type: 'comment', attributes: { body: 'FirstUpdated' } },
                { id: '2', type: 'comment', attributes: { body: 'Second' } },
              ],
            });
          };

          return comments.reload();
        })
        .then(function (newComments) {
          assert.strictEqual(newComments.at(0).body, 'FirstUpdated', 'Record body was correctly updated');
        });
    });
  });

  test('A hasMany relationship can be reloaded if it was fetched via ids', function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(type, Post, 'find type was Post');
      assert.strictEqual(id, '1', 'find id was 1');

      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              data: [
                { id: '1', type: 'comment' },
                { id: '2', type: 'comment' },
              ],
            },
          },
        },
      });
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'First' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    };

    run(function () {
      store
        .findRecord('post', 1)
        .then(function (post) {
          return post.comments;
        })
        .then(function (comments) {
          assert.true(comments.isLoaded, 'comments are loaded');
          assert.strictEqual(comments.length, 2, 'comments have 2 length');

          adapter.findMany = function (store, type, ids, snapshots) {
            return resolve({
              data: [
                { id: '1', type: 'comment', attributes: { body: 'FirstUpdated' } },
                { id: '2', type: 'comment', attributes: { body: 'Second' } },
              ],
            });
          };

          return comments.reload();
        })
        .then(function (newComments) {
          assert.strictEqual(newComments.at(0).body, 'FirstUpdated', 'Record body was correctly updated');
        });
    });
  });

  test('A hasMany relationship can be reloaded even if it failed at the first time', async function (assert) {
    assert.expect(7);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function () {
      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              links: { related: '/posts/1/comments' },
            },
          },
        },
      });
    };

    let loadingCount = 0;
    adapter.findHasMany = function () {
      loadingCount++;
      if (loadingCount % 2 === 1) {
        return reject({ data: null });
      } else {
        return resolve({
          data: [
            { id: '1', type: 'comment', attributes: { body: 'FirstUpdated' } },
            { id: '2', type: 'comment', attributes: { body: 'Second' } },
          ],
        });
      }
    };

    let post = await store.findRecord('post', '1');
    let commentsPromiseArray = post.comments;
    let manyArray;

    try {
      manyArray = await commentsPromiseArray;
      assert.ok(false, 'Expected exception to be raised');
    } catch (e) {
      assert.ok(true, `An error was thrown on the first reload of comments: ${e.message}`);
      manyArray = await commentsPromiseArray.reload();
    }

    assert.true(manyArray.isLoaded, 'the reload worked, comments are now loaded');

    try {
      await manyArray.reload();
      assert.ok(false, 'Expected exception to be raised');
    } catch (e) {
      assert.ok(true, `An error was thrown on the second reload via manyArray: ${e.message}`);
    }

    assert.true(manyArray.isLoaded, 'the second reload failed, comments are still loaded though');

    let reloadedManyArray = await manyArray.reload();

    assert.true(reloadedManyArray.isLoaded, 'the third reload worked, comments are loaded again');
    assert.strictEqual(reloadedManyArray, manyArray, 'the many array stays the same');
    assert.strictEqual(loadingCount, 4, 'We only fired 4 requests');
  });

  test('A hasMany relationship can be directly reloaded if it was fetched via links', function (assert) {
    assert.expect(6);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id) {
      assert.strictEqual(type, Post, 'find type was Post');
      assert.strictEqual(id, '1', 'find id was 1');

      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              links: { related: '/posts/1/comments' },
            },
          },
        },
      });
    };

    adapter.findHasMany = function (store, record, link, relationship) {
      assert.strictEqual(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');

      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'FirstUpdated' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    };
    run(function () {
      store.findRecord('post', 1).then(function (post) {
        return post.comments.reload().then(function (comments) {
          assert.true(comments.isLoaded, 'comments are loaded');
          assert.strictEqual(comments.length, 2, 'comments have 2 length');
          assert.strictEqual(comments.at(0).body, 'FirstUpdated', 'Record body was correctly updated');
        });
      });
    });
  });

  test('Has many via links - Calling reload multiple times does not send a new request if the first one is not settled', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id) {
      return resolve({
        data: {
          id: '1',
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
    adapter.findHasMany = function (store, record, link, relationship) {
      count++;
      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'First' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    };
    run(function () {
      store.findRecord('post', 1).then(function (post) {
        post.comments.then(function (comments) {
          all([comments.reload(), comments.reload(), comments.reload()]).then(function (comments) {
            assert.strictEqual(
              count,
              2,
              'One request for the original access and only one request for the mulitple reloads'
            );
            done();
          });
        });
      });
    });
  });

  test('A hasMany relationship can be directly reloaded if it was fetched via ids', function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(type, Post, 'find type was Post');
      assert.strictEqual(id, '1', 'find id was 1');

      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              data: [
                { id: '1', type: 'comment' },
                { id: '2', type: 'comment' },
              ],
            },
          },
        },
      });
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'FirstUpdated' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    };

    run(function () {
      store.findRecord('post', 1).then(function (post) {
        return post.comments.reload().then(function (comments) {
          assert.true(comments.isLoaded, 'comments are loaded');
          assert.strictEqual(comments.length, 2, 'comments have 2 length');
          assert.strictEqual(comments.at(0).body, 'FirstUpdated', 'Record body was correctly updated');
        });
      });
    });
  });

  test('Has many via ids - Calling reload multiple times does not send a new request if the first one is not settled', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
          type: 'post',
          relationships: {
            comments: {
              data: [
                { id: '1', type: 'comment' },
                { id: '2', type: 'comment' },
              ],
            },
          },
        },
      });
    };

    let count = 0;
    adapter.findMany = function (store, type, ids, snapshots) {
      count++;
      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'FirstUpdated' } },
          { id: '2', type: 'comment', attributes: { body: 'Second' } },
        ],
      });
    };

    run(function () {
      store.findRecord('post', 1).then(function (post) {
        post.comments.then(function (comments) {
          all([comments.reload(), comments.reload(), comments.reload()]).then(function (comments) {
            assert.strictEqual(
              count,
              2,
              'One request for the original access and only one request for the mulitple reloads'
            );
            done();
          });
        });
      });
    });
  });

  deprecatedTest(
    'PromiseArray proxies createRecord to its ManyArray once the hasMany is loaded',
    { id: 'ember-data:deprecate-promise-many-array-behaviors', until: '5.0', count: 1 },
    function (assert) {
      assert.expect(4);
      class Post extends Model {
        @attr title;
        @hasMany('comment', { async: true, inverse: 'message' }) comments;
      }

      class Comment extends Model {
        @attr body;
        @belongsTo('post', { async: false, inverse: 'comments' }) message;
      }
      this.owner.register('model:post', Post);
      this.owner.register('model:comment', Comment);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.findHasMany = function (store, snapshot, link, relationship) {
        return resolve({
          data: [
            { id: '1', type: 'comment', attributes: { body: 'First' } },
            { id: '2', type: 'comment', attributes: { body: 'Second' } },
          ],
        });
      };
      let post;

      run(function () {
        store.push({
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
        post = store.peekRecord('post', 1);
      });

      run(function () {
        post.comments.then(function (comments) {
          assert.true(comments.isLoaded, 'comments are loaded');
          assert.strictEqual(comments.length, 2, 'comments have 2 length');

          let newComment = post.comments.createRecord({ body: 'Third' });
          assert.strictEqual(newComment.body, 'Third', 'new comment is returned');
          assert.strictEqual(comments.length, 3, 'comments have 3 length, including new record');
        });
      });
    }
  );

  test('An updated `links` value should invalidate a relationship cache', async function (assert) {
    assert.expect(8);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      assert.strictEqual(relationship.type, 'comment', 'relationship was passed correctly');

      if (link === '/first') {
        return resolve({
          data: [
            { id: '1', type: 'comment', attributes: { body: 'First' } },
            { id: '2', type: 'comment', attributes: { body: 'Second' } },
          ],
        });
      } else if (link === '/second') {
        return resolve({
          data: [
            { id: '3', type: 'comment', attributes: { body: 'Third' } },
            { id: '4', type: 'comment', attributes: { body: 'Fourth' } },
            { id: '5', type: 'comment', attributes: { body: 'Fifth' } },
          ],
        });
      }
    };
    let post;

    run(function () {
      store.push({
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
      post = store.peekRecord('post', 1);
    });

    const comments = await post.comments;
    assert.true(comments.isLoaded, 'comments are loaded');
    assert.strictEqual(comments.length, 2, 'comments have 2 length');
    assert.strictEqual(comments.at(0).body, 'First', 'comment 1 successfully loaded');
    store.push({
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
    const newComments = await post.comments;
    assert.strictEqual(comments, newComments, 'hasMany array was kept the same');
    assert.strictEqual(newComments.length, 3, 'comments updated successfully');
    assert.strictEqual(newComments.at(0).body, 'Third', 'third comment loaded successfully');
  });

  test("When a polymorphic hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function (assert) {
    assert.expect(1);

    let userData = {
      type: 'user',
      id: '1',
      relationships: {
        messages: {
          data: [
            { type: 'post', id: '1' },
            { type: 'comment', id: '3' },
          ],
        },
      },
    };

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(false, "The adapter's find method should not be called");
    };

    adapter.findRecord = function (store, type, ids, snapshots) {
      return { data: userData };
    };

    run(function () {
      store.push({
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
    });

    run(function () {
      store.findRecord('user', 1).then(function (user) {
        let messages = user.messages;
        assert.strictEqual(messages.length, 2, 'The messages are correctly loaded');
      });
    });
  });

  test("When a polymorphic hasMany relationship is accessed, the store can call multiple adapters' findMany or find methods if the records are not loaded", function (assert) {
    class User extends Model {
      @attr name;
      @hasMany('message', { polymorphic: true, async: true, inverse: 'user' }) messages;
      @hasMany('user', { inverse: null, async: false }) contacts;
    }
    this.owner.register('model:user', User);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.findRecord = function (store, type, id, snapshot) {
      if (type === store.modelFor('post')) {
        return resolve({ data: { id: '1', type: 'post' } });
      } else if (type === store.modelFor('comment')) {
        return resolve({ data: { id: '3', type: 'comment' } });
      }
    };

    run(function () {
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            messages: {
              data: [
                { type: 'post', id: '1' },
                { type: 'comment', id: '3' },
              ],
            },
          },
        },
      });
    });

    run(function () {
      store
        .findRecord('user', 1)
        .then(function (user) {
          return user.messages;
        })
        .then(function (messages) {
          assert.strictEqual(messages.length, 2, 'The messages are correctly loaded');
        });
    });
  });

  test('polymorphic hasMany type-checks check the superclass', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    let igor = store.createRecord('user', { name: 'Igor' });
    let comment = store.createRecord('comment', {
      body: 'Well I thought the title was fine',
    });

    igor.messages.push(comment);

    assert.strictEqual(igor.messages.at(0)?.body, 'Well I thought the title was fine');
  });

  deprecatedTest(
    'Type can be inferred from the key of a hasMany relationship',
    { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 1 },
    async function (assert) {
      assert.expect(1);

      const User = Model.extend({
        name: attr(),
        contacts: hasMany({ inverse: null, async: false }),
      });

      const Contact = Model.extend({
        name: attr(),
        user: belongsTo('user', { async: false, inverse: null }),
      });

      this.owner.register('model:user', User);
      this.owner.register('model:contact', Contact);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.findRecord = function () {
        return {
          data: {
            id: '1',
            type: 'user',
            relationships: {
              contacts: {
                data: [{ id: '1', type: 'contact' }],
              },
            },
          },
        };
      };

      const user = store.push({
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
      const contacts = await user.contacts;
      assert.strictEqual(contacts.length, 1, 'The contacts relationship is correctly set up');
    }
  );

  deprecatedTest(
    'Type can be inferred from the key of an async hasMany relationship',
    { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 1 },
    function (assert) {
      assert.expect(1);
      class User extends Model {
        @attr name;
        @hasMany('message', { polymorphic: true, async: false, inverse: 'user' }) messages;
        @hasMany({ async: true, inverse: null }) contacts;
      }
      this.owner.register('model:user', User);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.findRecord = function (store, type, ids, snapshots) {
        return {
          data: {
            id: '1',
            type: 'user',
            relationships: {
              contacts: {
                data: [{ id: '1', type: 'contact' }],
              },
            },
          },
        };
      };

      run(function () {
        store.push({
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
      });
      run(function () {
        store
          .findRecord('user', 1)
          .then(function (user) {
            return user.contacts;
          })
          .then(function (contacts) {
            assert.strictEqual(contacts.length, 1, 'The contacts relationship is correctly set up');
          });
      });
    }
  );

  deprecatedTest(
    'Polymorphic relationships work with a hasMany whose type is inferred',
    { id: 'ember-data:deprecate-non-strict-relationships', until: '5.0', count: 1 },
    function (assert) {
      assert.expect(1);
      class User extends Model {
        @attr name;
        @hasMany('message', { polymorphic: true, async: false, inverse: 'user' }) messages;
        @hasMany({ async: false, polymorphic: true, inverse: null }) contacts;
      }
      this.owner.register('model:user', User);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.findRecord = function (store, type, ids, snapshots) {
        return { data: { id: '1', type: 'user' } };
      };

      run(function () {
        store.push({
          data: {
            type: 'user',
            id: '1',
            relationships: {
              contacts: {
                data: [
                  { type: 'email', id: '1' },
                  { type: 'phone', id: '2' },
                ],
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
      });
      run(function () {
        store
          .findRecord('user', 1)
          .then(function (user) {
            return user.contacts;
          })
          .then(function (contacts) {
            assert.strictEqual(contacts.length, 2, 'The contacts relationship is correctly set up');
          });
      });
    }
  );

  test('Polymorphic relationships with a hasMany is set up correctly on both sides', function (assert) {
    assert.expect(2);
    class Contact extends Model {
      @hasMany('post', { async: false, inverse: 'contact', as: 'contact' }) posts;
    }
    class Email extends Model {
      @attr email;
      @hasMany('post', { async: false, inverse: 'contact', as: 'contact' }) posts;
    }

    class Phone extends Model {
      @attr number;
      @hasMany('post', { async: false, inverse: 'contact', as: 'contact' }) posts;
    }
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: false, inverse: 'message' }) comments;
      @belongsTo('contact', { async: false, polymorphic: true, inverse: 'posts' }) contact;
    }
    this.owner.register('model:contact', Contact);
    this.owner.register('model:email', Email);
    this.owner.register('model:phone', Phone);
    this.owner.register('model:post', Post);

    let store = this.owner.lookup('service:store');

    let email = store.createRecord('email');
    let post = store.createRecord('post', {
      contact: email,
    });

    assert.strictEqual(post.contact, email, 'The polymorphic belongsTo is set up correctly');
    assert.strictEqual(email.posts.length, 1, 'The inverse has many is set up correctly on the email side.');
  });

  testInDebug('Only records of the same type can be added to a monomorphic hasMany relationship', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    run(function () {
      store.push({
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
    });

    run(function () {
      all([store.findRecord('post', 1), store.findRecord('post', 2)]).then(function (records) {
        assert.expectAssertion(function () {
          records[0].comments.push(records[1]);
        }, /The 'post' type does not implement 'comment' and thus cannot be assigned to the 'comments' relationship in 'post'/);
      });
    });
  });

  testInDebug(
    'Only records of the same base modelClass can be added to a polymorphic hasMany relationship',
    function (assert) {
      assert.expect(2);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.shouldBackgroundReloadRecord = () => false;

      run(function () {
        store.push({
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
      });
      let asyncRecords;

      run(function () {
        asyncRecords = hash({
          user: store.findRecord('user', 1),
          anotherUser: store.findRecord('user', 2),
          post: store.findRecord('post', 1),
          comment: store.findRecord('comment', 3),
        });

        asyncRecords
          .then(function (records) {
            records.messages = records.user.messages;
            return hash(records);
          })
          .then(function (records) {
            records.messages.push(records.post);
            records.messages.push(records.comment);
            assert.strictEqual(records.messages.length, 2, 'The messages are correctly added');

            assert.expectAssertion(function () {
              records.messages.push(records.anotherUser);
            }, /The 'user' type does not implement 'message' and thus cannot be assigned to the 'messages' relationship in 'user'. Make it a descendant of 'message'/);
          });
      });
    }
  );

  test('A record can be removed from a polymorphic association', async function (assert) {
    assert.expect(4);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    const [user, comment] = store.push({
      data: [
        {
          type: 'user',
          id: '1',
          relationships: {
            messages: {
              data: [{ type: 'comment', id: '3' }],
            },
          },
        },
        {
          type: 'comment',
          id: '3',
          attributes: {},
        },
      ],
    });

    const messages = await user.messages;

    assert.strictEqual(messages.length, 1, 'The user has 1 message');

    let removedObject = messages.pop();

    assert.strictEqual(removedObject, comment, 'The message is correctly removed');
    assert.strictEqual(messages.length, 0, 'The user does not have any messages');
    assert.strictEqual(messages.at(0), undefined, "Null messages can't be fetched");
  });

  test('When a record is created on the client, its hasMany arrays should be in a loaded state', function (assert) {
    assert.expect(3);

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post');

    assert.ok(get(post, 'isLoaded'), 'The post should have isLoaded flag');
    let comments;
    run(function () {
      comments = get(post, 'comments');
    });

    assert.strictEqual(get(comments, 'length'), 0, 'The comments should be an empty array');

    assert.ok(get(comments, 'isLoaded'), 'The comments should have isLoaded flag');
  });

  test('When a record is created on the client, its async hasMany arrays should be in a loaded state', function (assert) {
    assert.expect(4);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post');

    assert.ok(get(post, 'isLoaded'), 'The post should have isLoaded flag');

    run(function () {
      get(post, 'comments').then(function (comments) {
        assert.ok(true, 'Comments array successfully resolves');
        assert.strictEqual(get(comments, 'length'), 0, 'The comments should be an empty array');
        assert.ok(get(comments, 'isLoaded'), 'The comments should have isLoaded flag');
      });
    });
  });

  test('we can set records SYNC HM relationship', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post');

    run(function () {
      store.push({
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
      post.set('comments', store.peekAll('comment').slice());
    });

    assert.strictEqual(get(post, 'comments.length'), 2, 'we can set HM relationship');
  });

  test('We can set records ASYNC HM relationship', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post');

    run(function () {
      store.push({
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
      post.set('comments', store.peekAll('comment').slice());
    });

    return post.comments.then((comments) => {
      assert.strictEqual(comments.length, 2, 'we can set async HM relationship');
    });
  });

  test('When a record is saved, its unsaved hasMany records should be kept', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function (store, type, snapshot) {
      return resolve({ data: { id: '1', type: snapshot.modelName } });
    };

    let post, comment;
    return run(() => {
      post = store.createRecord('post');
      comment = store.createRecord('comment');
      post.comments.push(comment);
      return post.save();
    }).then(() => {
      assert.strictEqual(get(post, 'comments.length'), 1, "The unsaved comment should be in the post's comments array");
    });
  });

  test('dual non-async HM <-> BT', async function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function (store, type, snapshot) {
      let serialized = snapshot.record.serialize();
      serialized.data.id = 2;
      return resolve(serialized);
    };

    let post = store.push({
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
    let firstComment = store.push({
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

    const comment = store.createRecord('comment', { post });
    await comment.save();

    let commentPost = comment.post;
    let postComments = comment.post.comments;
    let postCommentsLength = comment.get('post.comments.length');

    assert.deepEqual(post, commentPost, 'expect the new comments post, to be the correct post');
    assert.ok(postComments, 'comments should exist');
    assert.strictEqual(postCommentsLength, 2, "comment's post should have an identifier back to comment");
    assert.ok(postComments && postComments.indexOf(firstComment) !== -1, 'expect to contain first comment');
    assert.ok(postComments && postComments.indexOf(comment) !== -1, 'expected to contain the new comment');
  });

  test('When an unloaded record is added to the hasMany, it gets fetched once the hasMany is accessed even if the hasMany has been already fetched', async function (assert) {
    assert.expect(6);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let findManyCalls = 0;
    let findRecordCalls = 0;

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(true, `findMany called ${++findManyCalls}x`);
      return resolve({
        data: [
          { id: '1', type: 'comment', attributes: { body: 'first' } },
          { id: '2', type: 'comment', attributes: { body: 'second' } },
        ],
      });
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(true, `findRecord called ${++findRecordCalls}x`);

      return resolve({ data: { id: '3', type: 'comment', attributes: { body: 'third' } } });
    };

    let post = store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
            ],
          },
        },
      },
    });

    let fetchedComments = await post.comments;

    assert.strictEqual(fetchedComments.length, 2, 'comments fetched successfully');
    assert.strictEqual(fetchedComments.at(0).body, 'first', 'first comment loaded successfully');

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

    let newlyFetchedComments = await post.comments;

    assert.strictEqual(newlyFetchedComments.length, 3, 'all three comments fetched successfully');
    assert.strictEqual(newlyFetchedComments.at(2).body, 'third', 'third comment loaded successfully');
  });

  testInDebug('A sync hasMany errors out if there are unloaded records in it', function (assert) {
    let store = this.owner.lookup('service:store');

    let post = store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
            ],
          },
        },
      },
    });

    const assertionMessage =
      /You looked up the 'comments' relationship on a 'post' with id 1 but some of the associated records were not loaded./;

    try {
      post.comments;
      assert.ok(false, 'expected assertion');
    } catch (e) {
      assert.ok(assertionMessage.test(e.message), 'correct assertion');
    }
  });

  testInDebug('An async hasMany does not fetch with a model created with no options', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    adapter.findRecord = function () {
      assert.ok(false, 'no request should be made');
    };
    adapter.findMany = function () {
      assert.ok(false, 'no request should be made');
    };

    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let comment = store.createRecord('comment');
    let post = store.push({
      data: {
        type: 'post',
        id: '1',
      },
    });

    const comments = await post.comments;
    comments.push(comment);
    assert.ok(post.comments.length, 1, 'expected length for comments');
  });

  test('After removing and unloading a record, a hasMany relationship should still be valid', function (assert) {
    let store = this.owner.lookup('service:store');

    const post = run(() => {
      store.push({
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
      const post = store.peekRecord('post', 1);
      const comments = post.comments;
      const comment = comments.at(0);
      comments.splice(0, 1);
      store.unloadRecord(comment);
      assert.strictEqual(comments.length, 0);
      return post;
    });

    // Explicitly re-get comments
    assert.strictEqual(run(post, 'get', 'comments.length'), 0);
  });

  test('If reordered hasMany data has been pushed to the store, the many array reflects the ordering change - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let comment1, comment2, comment3, comment4;
    let post;

    run(() => {
      store.push({
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

      comment1 = store.peekRecord('comment', 1);
      comment2 = store.peekRecord('comment', 2);
      comment3 = store.peekRecord('comment', 3);
      comment4 = store.peekRecord('comment', 4);
    });

    run(() => {
      store.push({
        data: {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
              ],
            },
          },
        },
      });
      post = store.peekRecord('post', 1);

      assert.deepEqual(post.comments.slice(), [comment1, comment2], 'Initial ordering is correct');
    });

    run(() => {
      store.push({
        data: {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '2' },
                { type: 'comment', id: '1' },
              ],
            },
          },
        },
      });
    });
    assert.deepEqual(post.comments.slice(), [comment2, comment1], 'Updated ordering is correct');

    run(() => {
      store.push({
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
    });
    assert.deepEqual(post.comments.slice(), [comment2], 'Updated ordering is correct');

    run(() => {
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
                { type: 'comment', id: '4' },
              ],
            },
          },
        },
      });
    });
    assert.deepEqual(post.comments.slice(), [comment1, comment2, comment3, comment4], 'Updated ordering is correct');

    run(() => {
      store.push({
        data: {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '4' },
                { type: 'comment', id: '3' },
              ],
            },
          },
        },
      });
    });
    assert.deepEqual(post.comments.slice(), [comment4, comment3], 'Updated ordering is correct');

    run(() => {
      store.push({
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
    });

    assert.deepEqual(post.comments.slice(), [comment4, comment2, comment3, comment1], 'Updated ordering is correct');
  });

  test('Rollbacking attributes for deleted record restores implicit relationship correctly when the hasMany side has been deleted - async', async function (assert) {
    let store = this.owner.lookup('service:store');
    let book = store.push({
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
    let chapter = store.peekRecord('chapter', '2');

    chapter.deleteRecord();
    chapter.rollbackAttributes();

    const fetchedChapters = await book.chapters;
    assert.strictEqual(fetchedChapters.at(0), chapter, 'Book has a chapter after rollback attributes');
  });

  test('Rollbacking attributes for deleted record restores implicit relationship correctly when the hasMany side has been deleted - sync', async function (assert) {
    let store = this.owner.lookup('service:store');
    let chapter = store.push({
      data: {
        type: 'chapter',
        id: '1',
        attributes: {
          title: "Stanley's Amazing Adventures",
        },
        relationships: {
          pages: {
            data: [{ type: 'page', id: '2' }],
          },
        },
      },
      included: [
        {
          type: 'page',
          id: '2',
          attributes: {
            title: 'Sailing the Seven Seas',
          },
        },
      ],
    });
    let page = store.peekRecord('page', '2');

    page.deleteRecord();
    page.rollbackAttributes();

    assert.strictEqual(chapter.pages.at(0), page, 'Chapter has a page after rollback attributes');
  });

  test('Rollbacking attributes for deleted record restores implicit relationship correctly when the belongsTo side has been deleted - async', function (assert) {
    class Page extends Model {
      @attr number;
      @belongsTo('chapter', { async: true, inverse: 'pages' }) chapter;
    }
    this.owner.register('model:page', Page);

    let store = this.owner.lookup('service:store');

    let chapter, page;

    run(() => {
      store.push({
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
      chapter = store.peekRecord('chapter', 2);
      page = store.peekRecord('page', 3);
    });

    run(() => {
      chapter.deleteRecord();
      chapter.rollbackAttributes();
    });

    return run(() => {
      return page.chapter.then((fetchedChapter) => {
        assert.strictEqual(fetchedChapter, chapter, 'Page has a chapter after rollback attributes');
      });
    });
  });

  test('Rollbacking attributes for deleted record restores implicit relationship correctly when the belongsTo side has been deleted - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let chapter, page;
    run(() => {
      store.push({
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
      chapter = store.peekRecord('chapter', 2);
      page = store.peekRecord('page', 3);
    });

    run(() => {
      chapter.deleteRecord();
      chapter.rollbackAttributes();
    });

    run(() => {
      assert.strictEqual(page.chapter, chapter, 'Page has a chapter after rollback attributes');
    });
  });

  testInDebug('Passing a model as type to hasMany should not work', function (assert) {
    assert.expect(3);

    assert.expectAssertion(() => {
      const User = Model.extend();

      Model.extend({
        users: hasMany(User, { async: false, inverse: null }),
      });
    }, /The first argument to hasMany must be a string/);

    assert.expectDeprecation({ id: 'ember-data:deprecate-early-static' });
    assert.expectDeprecation({ id: 'ember-data:deprecate-non-strict-relationships' });
  });

  test('Relationship.clear removes all records correctly', async function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');

    const [post] = store.push({
      data: [
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Sailing the Seven Seas',
          },
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
              ],
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

    const comments = store.peekAll('comment');
    assert.deepEqual(
      comments.map((comment) => comment.post.id),
      ['2', '2', '2']
    );

    const postComments = await post.comments;

    if (DEPRECATE_ARRAY_LIKE) {
      postComments.clear();
      assert.expectDeprecation({ id: 'ember-data:deprecate-array-like' });
    } else {
      postComments.length = 0;
    }

    assert.deepEqual(
      comments.map((comment) => comment.post),
      [null, null, null]
    );
  });

  test('unloading a record with associated records does not prevent the store from tearing down', function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: false, inverse: 'post' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');

    let post;
    run(() => {
      store.push({
        data: [
          {
            type: 'post',
            id: '2',
            attributes: {
              title: 'Sailing the Seven Seas',
            },
            relationships: {
              comments: {
                data: [
                  { type: 'comment', id: '1' },
                  { type: 'comment', id: '2' },
                ],
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
      post = store.peekRecord('post', 2);

      // This line triggers the original bug that gets manifested
      // in teardown for apps, e.g. store.destroy that is caused by
      // App.destroy().
      // Relationship#clear uses Ember.Set#forEach, which does incorrect
      // iteration when the set is being mutated (in our case, the index gets off
      // because records are being removed)
      store.unloadRecord(post);
    });

    try {
      run(() => {
        store.destroy();
      });
      assert.ok(true, 'store destroyed correctly');
    } catch (error) {
      assert.ok(false, 'store prevented from being destroyed');
    }
  });

  test('adding and removing records from hasMany relationship #2666', async function (assert) {
    assert.expect(4);

    const Post = Model.extend({
      comments: hasMany('comment', { async: true, inverse: 'post' }),
      toString: () => 'Post',
    });

    const Comment = Model.extend({
      post: belongsTo('post', { async: false, inverse: 'comments' }),
      toString: () => 'Comment',
    });

    const ApplicationAdapter = RESTAdapter.extend({
      shouldBackgroundReloadRecord: () => false,
    });

    let commentId = 4;
    this.owner.register(
      'adapter:comment',
      RESTAdapter.extend({
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

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');

    store.push({
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

    const post = await store.findRecord('post', '1');
    let commentsPromiseArray = post.comments;
    let comments = await commentsPromiseArray;
    assert.strictEqual(commentsPromiseArray.length, 3, 'Initial comments count');

    // Add comment #4
    let comment = store.createRecord('comment');
    comments.push(comment);

    await comment.save();
    commentsPromiseArray = post.comments;
    assert.strictEqual(commentsPromiseArray.length, 4, 'Comments count after first add');

    // Delete comment #4
    await comments.at(-1).destroyRecord();

    commentsPromiseArray = post.comments;
    assert.strictEqual(commentsPromiseArray.length, 3, 'Comments count after destroy');

    // Add another comment #4
    comment = store.createRecord('comment');
    comments.push(comment);
    await comment.save();

    commentsPromiseArray = post.comments;
    assert.strictEqual(commentsPromiseArray.length, 4, 'Comments count after second add');
  });

  test('hasMany hasAnyRelationshipData async loaded', function (assert) {
    assert.expect(1);
    class Chapter extends Model {
      @attr title;
      @hasMany('page', { async: true, inverse: 'chapter' }) pages;
    }
    this.owner.register('model:chapter', Chapter);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
          type: 'chapter',
          attributes: { title: 'The Story Begins' },
          relationships: {
            pages: {
              data: [
                { id: '2', type: 'page' },
                { id: '3', type: 'page' },
              ],
            },
          },
        },
      });
    };

    return run(() => {
      return store.findRecord('chapter', 1).then((chapter) => {
        let relationship = getRelationshipStateForRecord(chapter, 'pages');
        assert.true(relationship.state.hasReceivedData, 'relationship has data');
      });
    });
  });

  test('hasMany hasAnyRelationshipData sync loaded', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
          type: 'chapter',
          attributes: { title: 'The Story Begins' },
          relationships: {
            pages: {
              data: [
                { id: '2', type: 'page' },
                { id: '3', type: 'page' },
              ],
            },
          },
        },
      });
    };

    return run(() => {
      return store.findRecord('chapter', 1).then((chapter) => {
        let relationship = getRelationshipStateForRecord(chapter, 'pages');
        assert.true(relationship.state.hasReceivedData, 'relationship has data');
      });
    });
  });

  test('hasMany hasAnyRelationshipData async not loaded', function (assert) {
    assert.expect(1);
    class Chapter extends Model {
      @attr title;
      @hasMany('page', { async: true, inverse: 'chapter' }) pages;
    }
    this.owner.register('model:chapter', Chapter);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
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

    return run(() => {
      return store.findRecord('chapter', 1).then((chapter) => {
        let relationship = getRelationshipStateForRecord(chapter, 'pages');
        assert.false(relationship.state.hasReceivedData, 'relationship does not have data');
      });
    });
  });

  test('hasMany hasAnyRelationshipData sync not loaded', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      return resolve({
        data: {
          id: '1',
          type: 'chapter',
          attributes: { title: 'The Story Begins' },
        },
      });
    };

    return run(() => {
      return store.findRecord('chapter', 1).then((chapter) => {
        let relationship = getRelationshipStateForRecord(chapter, 'pages');
        assert.false(relationship.state.hasReceivedData, 'relationship does not have data');
      });
    });
  });

  test('hasMany hasAnyRelationshipData async created', function (assert) {
    assert.expect(2);
    class Chapter extends Model {
      @attr title;
      @hasMany('page', { async: true, inverse: 'chapter' }) pages;
    }
    this.owner.register('model:chapter', Chapter);

    let store = this.owner.lookup('service:store');
    let chapter = store.createRecord('chapter', { title: 'The Story Begins' });
    let page = store.createRecord('page');

    let relationship = getRelationshipStateForRecord(chapter, 'pages');
    assert.false(relationship.state.hasReceivedData, 'relationship does not have data');

    chapter = store.createRecord('chapter', {
      title: 'The Story Begins',
      pages: [page],
    });

    relationship = getRelationshipStateForRecord(chapter, 'pages');
    assert.true(relationship.state.hasReceivedData, 'relationship has data');
  });

  test('hasMany hasAnyRelationshipData sync created', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let chapter = store.createRecord('chapter', { title: 'The Story Begins' });
    let relationship = getRelationshipStateForRecord(chapter, 'pages');

    assert.false(relationship.state.hasReceivedData, 'relationship does not have data');

    chapter = store.createRecord('chapter', {
      title: 'The Story Begins',
      pages: [store.createRecord('page')],
    });
    relationship = getRelationshipStateForRecord(chapter, 'pages');

    assert.true(relationship.state.hasReceivedData, 'relationship has data');
  });

  test("Model's hasMany relationship should not be created during model creation", function (assert) {
    let store = this.owner.lookup('service:store');

    let user;
    run(() => {
      store.push({
        data: {
          type: 'user',
          id: '1',
        },
      });
      user = store.peekRecord('user', 1);
      assert.notOk(hasRelationshipForRecord(user, 'messages'), 'Newly created record should not have relationships');
    });
  });

  test("Model's belongsTo relationship should be created during 'get' method", function (assert) {
    let store = this.owner.lookup('service:store');

    let user;
    run(() => {
      user = store.createRecord('user');
      user.messages;
      assert.ok(
        hasRelationshipForRecord(user, 'messages'),
        'Newly created record with relationships in params passed in its constructor should have relationships'
      );
    });
  });

  test('metadata is accessible when pushed as a meta property for a relationship', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findHasMany = function () {
      return resolve({});
    };

    let book;
    run(() => {
      store.push({
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
      book = store.peekRecord('book', 1);
    });

    run(() => {
      assert.strictEqual(
        getRelationshipStateForRecord(book, 'chapters').meta.where,
        'the lefkada sea',
        'meta is there'
      );
    });
  });

  test('metadata is accessible when return from a fetchLink', async function (assert) {
    assert.expect(1);

    this.owner.register('serializer:application', RESTSerializer);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findHasMany = function () {
      return resolve({
        meta: {
          foo: 'bar',
        },
        chapters: [{ id: '2' }, { id: '3' }],
      });
    };

    const book = store.push({
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
    const chapters = await book.chapters;

    let meta = chapters.meta;
    assert.strictEqual(meta?.foo, 'bar', 'metadata is available');
  });

  test('metadata should be reset between requests', function (assert) {
    this.owner.register('serializer:application', RESTSerializer);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let counter = 0;

    adapter.findHasMany = function () {
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

    let book1, book2;

    run(() => {
      store.push({
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
      book1 = store.peekRecord('book', 1);
      book2 = store.peekRecord('book', 2);
    });

    return run(() => {
      return book1.chapters.then((chapters) => {
        let meta = chapters.meta;
        assert.strictEqual(get(meta, 'foo'), 'bar', 'metadata should available');

        return book2.chapters.then((chapters) => {
          let meta = chapters.meta;
          assert.strictEqual(meta, null, 'metadata should not be available');
        });
      });
    });
  });

  test('Related link should be fetched when no relationship data is present', function (assert) {
    assert.expect(3);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => {
      return false;
    };
    adapter.findRecord = () => {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };
    adapter.findMany = () => {
      assert.ok(false, "The adapter's findMany method should not be called");
    };

    adapter.findHasMany = function (store, snapshot, url, relationship) {
      assert.strictEqual(url, 'get-comments', 'url is correct');
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

    return run(() => {
      let post = store.push({
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

      return post.comments.then((comments) => {
        assert.strictEqual(comments.at(0).body, 'This is comment', 'comment body is correct');
      });
    });
  });

  test('Related link should take precedence over relationship data when local record data is missing', function (assert) {
    assert.expect(3);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => {
      return false;
    };
    adapter.findRecord = () => {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };
    adapter.findMany = () => {
      assert.ok(false, "The adapter's findMany method should not be called");
    };

    adapter.findHasMany = function (store, snapshot, url, relationship) {
      assert.strictEqual(url, 'get-comments', 'url is correct');
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

    return run(() => {
      let post = store.push({
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

      return post.comments.then((comments) => {
        assert.strictEqual(comments.at(0).body, 'This is comment', 'comment body is correct');
      });
    });
  });

  test('Local relationship data should take precedence over related link when local record data is available', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => {
      return false;
    };
    adapter.findRecord = () => {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };
    adapter.findMany = () => {
      assert.ok(false, "The adapter's findMany method should not be called");
    };

    adapter.findHasMany = function (store, snapshot, url, relationship) {
      assert.ok(false, "The adapter's findHasMany method should not be called");
    };

    return run(() => {
      let post = store.push({
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

      return post.comments.then((comments) => {
        assert.strictEqual(comments.at(0).body, 'This is comment', 'comment body is correct');
      });
    });
  });

  test('Related link should take precedence over local record data when relationship data is not initially available', function (assert) {
    assert.expect(3);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'post' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) post;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => {
      return false;
    };
    adapter.findRecord = () => {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };
    adapter.findMany = () => {
      assert.ok(false, "The adapter's findMany method should not be called");
    };

    adapter.findHasMany = function (store, snapshot, url, relationship) {
      assert.strictEqual(url, 'get-comments', 'url is correct');
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

    return run(() => {
      let post = store.push({
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

      return post.comments.then((comments) => {
        assert.strictEqual(comments.at(0).body, 'This is comment fetched by link', 'comment body is correct');
      });
    });
  });

  test('Updated related link should take precedence over relationship data and local record data', function (assert) {
    assert.expect(3);
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: false, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findHasMany = function (store, snapshot, url, relationship) {
      assert.strictEqual(url, 'comments-updated-link', 'url is correct');
      assert.ok(true, "The adapter's findHasMany method should be called");
      return resolve({
        data: [{ id: '1', type: 'comment', attributes: { body: 'This is updated comment' } }],
      });
    };

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(false, "The adapter's findRecord method should not be called");
    };

    return run(() => {
      let post = store.push({
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

      store.push({
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

      return post.comments.then((comments) => {
        assert.strictEqual(comments.at(0).body, 'This is updated comment', 'comment body is correct');
      });
    });
  });

  deprecatedTest(
    'PromiseArray proxies createRecord to its ManyArray before the hasMany is loaded',
    { id: 'ember-data:deprecate-promise-many-array-behaviors', until: '5.0', count: 1 },
    function (assert) {
      assert.expect(1);
      class Post extends Model {
        @attr title;
        @hasMany('comment', { async: true, inverse: 'message' }) comments;
      }
      class Comment extends Model {
        @attr body;
        @belongsTo('post', { async: false, inverse: 'comments' }) message;
      }
      this.owner.register('model:post', Post);
      this.owner.register('model:comment', Comment);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.findHasMany = function (store, record, link, relationship) {
        return resolve({
          data: [
            { id: '1', type: 'comment', attributes: { body: 'First' } },
            { id: '2', type: 'comment', attributes: { body: 'Second' } },
          ],
        });
      };

      return run(() => {
        let post = store.push({
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

        let comments = post.comments;
        comments.createRecord();
        return comments.then((comments) => {
          assert.strictEqual(comments.length, 3, 'comments have 3 length, including new record');
        });
      });
    }
  );

  test('deleteRecord + unloadRecord', async function (assert) {
    class User extends Model {
      @attr name;
      @hasMany('user', { inverse: null, async: false }) contacts;
      @hasMany('post', { async: true, inverse: null }) posts;
    }

    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: false, inverse: 'message' }) comments;
      @belongsTo('user', { inverse: null, async: false }) user;
    }
    this.owner.register('model:user', User);
    this.owner.register('model:post', Post);

    let store = this.owner.lookup('service:store');

    store.push({
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

    let user = store.peekRecord('user', 'user-1');
    let postsPromiseArray = user.posts;
    let posts = await postsPromiseArray;

    store.adapterFor('post').deleteRecord = function () {
      // just acknowledge all deletes, but with a noop
      return { data: null };
    };

    assert.deepEqual(
      posts.map((x) => x.id),
      ['post-1', 'post-2', 'post-3', 'post-4', 'post-5']
    );
    assert.strictEqual(postsPromiseArray.length, 5, 'promise array length is correct');

    await store.peekRecord('post', 'post-2').destroyRecord();

    assert.deepEqual(
      posts.map((x) => x.id),
      ['post-1', 'post-3', 'post-4', 'post-5']
    );
    assert.strictEqual(postsPromiseArray.length, 4, 'promise array length is correct');

    await store.peekRecord('post', 'post-3').destroyRecord();

    assert.deepEqual(
      posts.map((x) => x.id),
      ['post-1', 'post-4', 'post-5']
    );
    assert.strictEqual(postsPromiseArray.length, 3, 'promise array length is correct');

    await store.peekRecord('post', 'post-4').destroyRecord();

    assert.deepEqual(
      posts.map((x) => x.id),
      ['post-1', 'post-5']
    );
    assert.strictEqual(postsPromiseArray.length, 2, 'promise array length is correct');
  });

  test('unloading and reloading a record with hasMany relationship - #3084', function (assert) {
    let store = this.owner.lookup('service:store');

    store.push({
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

    let user = store.peekRecord('user', 'user-1');
    let message = store.peekRecord('message', 'message-1');

    assert.strictEqual(user.messages.at(0).id, 'message-1');
    assert.strictEqual(message.user.id, 'user-1');

    run(() => {
      store.unloadRecord(user);
    });

    // The record is resurrected for some reason.
    store.push({
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

    user = store.peekRecord('user', 'user-1');

    assert.strictEqual(user.messages.at(0).id, 'message-1', 'user points to message');
    assert.strictEqual(message.user.id, 'user-1', 'message points to user');
  });

  test('deleted records should stay deleted', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let user;
    let message;

    adapter.deleteRecord = function (store, type, id) {
      return null;
    };

    run(() => {
      store.push({
        data: [
          {
            type: 'user',
            id: 'user-1',
            attributes: {
              name: 'Adolfo Builes',
            },
            relationships: {
              messages: {
                data: [
                  { type: 'message', id: 'message-1' },
                  { type: 'message', id: 'message-2' },
                ],
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

      user = store.peekRecord('user', 'user-1');
      message = store.peekRecord('message', 'message-1');

      assert.strictEqual(get(user, 'messages.length'), 2);
    });

    run(() => message.destroyRecord());

    run(() => {
      // a new message is added to the user should not resurrected the
      // deleted message
      store.push({
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
        get(user, 'messages').map((r) => r.id),
        ['message-2', 'message-3'],
        'user should have 2 message since 1 was deleted'
      );
    });
  });

  test("hasMany relationship with links doesn't trigger extra change notifications - #4942", function (assert) {
    let store = this.owner.lookup('service:store');

    run(() => {
      store.push({
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
    });

    let book = store.peekRecord('book', '1');
    let count = 0;

    book.addObserver('chapters', () => {
      count++;
    });

    run(() => {
      book.chapters;
    });

    assert.strictEqual(count, 0);
  });

  test('A hasMany relationship with a link will trigger the link request even if a inverse related object is pushed to the store', function (assert) {
    class Post extends Model {
      @attr title;
      @hasMany('comment', { async: true, inverse: 'message' }) comments;
    }

    class Comment extends Model {
      @attr body;
      @belongsTo('post', { async: true, inverse: 'comments' }) message;
    }
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    const postID = '1';

    run(function () {
      // load a record with a link hasMany relationship
      store.push({
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
      store.push({
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

      adapter.findRecord = function (store, type, id, snapshot) {
        throw new Error(`findRecord for ${type} should not be called`);
      };

      let hasManyCounter = 0;
      adapter.findHasMany = function (store, snapshot, link, relationship) {
        assert.strictEqual(relationship.type, 'comment', 'findHasMany relationship type was Comment');
        assert.strictEqual(relationship.key, 'comments', 'findHasMany relationship key was comments');
        assert.strictEqual(link, '/posts/1/comments', 'findHasMany link was /posts/1/comments');
        hasManyCounter++;

        return resolve({
          data: [
            { id: '1', type: 'comment', attributes: { body: 'First' } },
            { id: '2', type: 'comment', attributes: { body: 'Second' } },
          ],
        });
      };

      const post = store.peekRecord('post', postID);
      post.comments.then(function (comments) {
        assert.true(comments.isLoaded, 'comments are loaded');
        assert.strictEqual(hasManyCounter, 1, 'link was requested');
        assert.strictEqual(comments.length, 2, 'comments have 2 length');

        post
          .hasMany('comments')
          .reload()
          .then(function (comments) {
            assert.true(comments.isLoaded, 'comments are loaded');
            assert.strictEqual(hasManyCounter, 2, 'link was requested');
            assert.strictEqual(comments.length, 2, 'comments have 2 length');
          });
      });
    });
  });

  test('Pushing a relationship with duplicate identifiers results in a single entry for the record in the relationship', async function (assert) {
    class PhoneUser extends Model {
      @hasMany('phone-number', { async: false, inverse: null })
      phoneNumbers;
      @attr name;
    }
    class PhoneNumber extends Model {
      @attr number;
    }
    const { owner } = this;

    owner.register('model:phone-user', PhoneUser);
    owner.register('model:phone-number', PhoneNumber);

    const store = owner.lookup('service:store');

    store.push({
      data: {
        id: 'call-me-anytime',
        type: 'phone-number',
        attributes: {
          number: '1-800-DATA',
        },
      },
    });

    const person = store.push({
      data: {
        id: '1',
        type: 'phone-user',
        attributes: {},
        relationships: {
          phoneNumbers: {
            data: [
              { type: 'phone-number', id: 'call-me-anytime' },
              { type: 'phone-number', id: 'call-me-anytime' },
              { type: 'phone-number', id: 'call-me-anytime' },
            ],
          },
        },
      },
    });

    assert.strictEqual(person.phoneNumbers.length, 1);
  });

  deprecatedTest(
    'a synchronous hasMany record array should only remove object(s) if found in collection',
    {
      id: 'ember-data:deprecate-array-like',
      count: 3,
      until: '5.0',
    },
    async function (assert) {
      class Person extends Model {
        @attr()
        name;
        @belongsTo('tag', { async: false, inverse: 'people' })
        tag;
      }

      class Tag extends Model {
        @hasMany('person', { async: false, inverse: 'tag' })
        people;
      }

      this.owner.register('model:person', Person);
      this.owner.register('model:tag', Tag);

      const store = this.owner.lookup('service:store');
      // eslint-disable-next-line no-unused-vars
      const [tag, scumbagInRecordArray, _person2, scumbagNotInRecordArray] = store.push({
        data: [
          {
            type: 'tag',
            id: '1',
            relationships: {
              people: {
                data: [
                  { type: 'person', id: '1' },
                  { type: 'person', id: '2' },
                ],
              },
            },
          },
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Scumbag Dale',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Scumbag Tom',
            },
          },
          {
            type: 'person',
            id: '3',
            attributes: {
              name: 'Scumbag Ross',
            },
          },
        ],
      });

      let recordArray = tag.people;

      recordArray.removeObject(scumbagNotInRecordArray);

      assert.strictEqual(
        recordArray.length,
        2,
        'Record array unchanged after attempting to remove object not found in collection'
      );

      recordArray.removeObject(scumbagInRecordArray);

      let didRemoveObject = recordArray.length === 1 && !recordArray.includes(scumbagInRecordArray);
      assert.true(didRemoveObject, 'Record array successfully removed expected object from collection');

      recordArray.push(scumbagInRecordArray);

      let scumbagsToRemove = [scumbagInRecordArray, scumbagNotInRecordArray];
      recordArray.removeObjects(scumbagsToRemove);

      didRemoveObject = recordArray.length === 1 && !recordArray.includes(scumbagInRecordArray);
      assert.true(didRemoveObject, 'Record array only removes objects in list that are found in collection');
    }
  );

  deprecatedTest(
    'an asynchronous hasMany record array should only remove object(s) if found in collection',
    {
      id: 'ember-data:deprecate-promise-many-array-behaviors',
      count: 6,
      until: '5.0',
    },
    async function (assert) {
      class Person extends Model {
        @attr()
        name;
        @belongsTo('tag', { async: false, inverse: 'people' })
        tag;
      }

      class Tag extends Model {
        @hasMany('person', { async: true, inverse: 'tag' })
        people;
      }

      const store = this.owner.lookup('service:store');
      this.owner.register('model:person', Person);
      this.owner.register('model:tag', Tag);

      // eslint-disable-next-line no-unused-vars
      const [tag, scumbagInRecordArray, _person2, scumbagNotInRecordArray] = store.push({
        data: [
          {
            type: 'tag',
            id: '1',
            relationships: {
              people: {
                data: [
                  { type: 'person', id: '1' },
                  { type: 'person', id: '2' },
                ],
              },
            },
          },
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Scumbag Dale',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Scumbag Tom',
            },
          },
          {
            type: 'person',
            id: '3',
            attributes: {
              name: 'Scumbag Ross',
            },
          },
        ],
      });

      let recordArray = tag.people;

      recordArray.removeObject(scumbagNotInRecordArray);

      assert.strictEqual(
        recordArray.length,
        2,
        'Record array unchanged after attempting to remove object not found in collection'
      );

      recordArray.removeObject(scumbagInRecordArray);

      let didRemoveObject = recordArray.length === 1 && !recordArray.includes(scumbagInRecordArray);
      assert.true(didRemoveObject, 'Record array successfully removed expected object from collection');

      recordArray.pushObject(scumbagInRecordArray);

      let scumbagsToRemove = [scumbagInRecordArray, scumbagNotInRecordArray];
      recordArray.removeObjects(scumbagsToRemove);

      didRemoveObject = recordArray.length === 1 && !recordArray.includes(scumbagInRecordArray);
      assert.true(didRemoveObject, 'Record array only removes objects in list that are found in collection');
      assert.expectDeprecation({ id: 'ember-data:deprecate-array-like', count: 4 });
    }
  );
});
