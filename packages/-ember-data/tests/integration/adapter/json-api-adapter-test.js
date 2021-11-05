import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

let store, adapter;
let passedUrl, passedVerb, passedHash;

let User, Post, Comment, Handle, GithubHandle, TwitterHandle, Company, DevelopmentShop, DesignStudio;

module('integration/adapter/json-api-adapter - JSONAPIAdapter', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    User = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      posts: DS.hasMany('post', { async: true }),
      handles: DS.hasMany('handle', { async: true, polymorphic: true }),
      company: DS.belongsTo('company', { async: true, polymorphic: true }),
    });

    Post = DS.Model.extend({
      title: DS.attr('string'),
      author: DS.belongsTo('user', { async: true }),
      comments: DS.hasMany('comment', { async: true }),
    });

    Comment = DS.Model.extend({
      text: DS.attr('string'),
      post: DS.belongsTo('post', { async: true }),
    });

    Handle = DS.Model.extend({
      user: DS.belongsTo('user', { async: true }),
    });

    GithubHandle = Handle.extend({
      username: DS.attr('string'),
    });

    TwitterHandle = Handle.extend({
      nickname: DS.attr('string'),
    });

    Company = DS.Model.extend({
      name: DS.attr('string'),
      employees: DS.hasMany('user', { async: true }),
    });

    DevelopmentShop = Company.extend({
      coffee: DS.attr('boolean'),
    });

    DesignStudio = Company.extend({
      hipsters: DS.attr('number'),
    });

    this.owner.register('adapter:application', DS.JSONAPIAdapter.extend());
    this.owner.register('serializer:application', DS.JSONAPISerializer.extend());

    this.owner.register('model:user', User);
    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:handle', Handle);
    this.owner.register('model:github-handle', GithubHandle);
    this.owner.register('model:twitter-handle', TwitterHandle);
    this.owner.register('model:company', Company);
    this.owner.register('model:development-shop', DevelopmentShop);
    this.owner.register('model:design-studio', DesignStudio);

    store = this.owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  function ajaxResponse(responses) {
    let counter = 0;
    let index;

    passedUrl = [];
    passedVerb = [];
    passedHash = [];

    adapter.ajax = function (url, verb, hash) {
      index = counter++;

      passedUrl[index] = url;
      passedVerb[index] = verb;
      passedHash[index] = hash;

      return resolve(responses[index]);
    };
  }

  test('find a single record', async function (assert) {
    assert.expect(3);

    ajaxResponse([
      {
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
        },
      },
    ]);

    let post = await store.findRecord('post', '1');

    assert.strictEqual(passedUrl[0], '/posts/1', 'Builds URL correctly');
    assert.strictEqual(post.get('id'), '1', 'Stores record with correct id');
    assert.strictEqual(post.get('title'), 'Ember.js rocks', 'Title for record is correct');
  });

  test('find all records with sideloaded relationships', async function (assert) {
    assert.expect(9);

    ajaxResponse([
      {
        data: [
          {
            type: 'posts',
            id: '1',
            attributes: {
              title: 'Ember.js rocks',
            },
            relationships: {
              author: {
                data: { type: 'users', id: '3' },
              },
            },
          },
          {
            type: 'posts',
            id: '2',
            attributes: {
              title: 'Tomster rules',
            },
            relationships: {
              author: {
                data: { type: 'users', id: '3' },
              },
              comments: {
                data: [
                  { type: 'comments', id: '4' },
                  { type: 'comments', id: '5' },
                ],
              },
            },
          },
        ],
        included: [
          {
            type: 'users',
            id: '3',
            attributes: {
              'first-name': 'Yehuda',
              'last-name': 'Katz',
            },
          },
          {
            type: 'comments',
            id: '4',
            attributes: {
              text: 'This is the first comment',
            },
          },
          {
            type: 'comments',
            id: '5',
            attributes: {
              text: 'This is the second comment',
            },
          },
        ],
      },
    ]);

    let posts = await store.findAll('post');

    assert.strictEqual(passedUrl[0], '/posts');

    assert.strictEqual(posts.get('length'), 2, 'Returns two post records');
    assert.strictEqual(posts.get('firstObject.title'), 'Ember.js rocks', 'The title for the first post is correct');
    assert.strictEqual(posts.get('lastObject.title'), 'Tomster rules', 'The title for the second post is correct');

    assert.strictEqual(
      posts.get('firstObject.author.firstName'),
      'Yehuda',
      'The author for the first post is loaded and has the correct first name'
    );
    assert.strictEqual(
      posts.get('lastObject.author.lastName'),
      'Katz',
      'The author for the last post is loaded and has the correct last name'
    );

    assert.strictEqual(posts.get('firstObject.comments.length'), 0, 'First post doesnt have comments');

    assert.strictEqual(
      posts.get('lastObject.comments.firstObject.text'),
      'This is the first comment',
      'Loads first comment for second post'
    );
    assert.strictEqual(
      posts.get('lastObject.comments.lastObject.text'),
      'This is the second comment',
      'Loads second comment for second post'
    );
  });

  test('find many records', async function (assert) {
    assert.expect(4);

    ajaxResponse([
      {
        data: [
          {
            type: 'posts',
            id: '1',
            attributes: {
              title: 'Ember.js rocks',
            },
          },
        ],
      },
    ]);

    let posts = await store.query('post', { filter: { id: 1 } });

    assert.strictEqual(passedUrl[0], '/posts', 'Builds correct URL');
    assert.deepEqual(passedHash[0], { data: { filter: { id: 1 } } }, 'Sends correct params to adapter');

    assert.strictEqual(posts.get('length'), 1, 'Returns the correct number of records');
    assert.strictEqual(posts.get('firstObject.title'), 'Ember.js rocks', 'Sets correct title to record');
  });

  test('queryRecord - primary data being a single record', async function (assert) {
    ajaxResponse([
      {
        data: {
          type: 'posts',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
        },
      },
    ]);

    let post = await store.queryRecord('post', {});

    assert.strictEqual(passedUrl[0], '/posts', 'Builds correc URL');
    assert.strictEqual(post.get('title'), 'Ember.js rocks', 'Sets correct title to record');
  });

  test('queryRecord - primary data being null', async function (assert) {
    ajaxResponse([
      {
        data: null,
      },
    ]);

    let post = await store.queryRecord('post', {});

    assert.strictEqual(passedUrl[0], '/posts', 'Builds correct URL');
    assert.strictEqual(post, null, 'Returns null when adapter response is null');
  });

  testInDebug('queryRecord - primary data being an array throws an assertion', async function (assert) {
    ajaxResponse([
      {
        data: [
          {
            type: 'posts',
            id: '1',
          },
        ],
      },
    ]);

    await assert.expectAssertion(async () => {
      await store.queryRecord('post', {});
    }, 'Expected the primary data returned by the serializer for a `queryRecord` response to be a single object but instead it was an array.');
  });

  test('find a single record with belongsTo link as object { related }', async function (assert) {
    assert.expect(7);

    ajaxResponse([
      {
        data: {
          type: 'posts',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
          relationships: {
            author: {
              links: {
                related: 'http://example.com/user/2',
              },
            },
          },
        },
      },
      {
        data: {
          type: 'users',
          id: '2',
          attributes: {
            'first-name': 'Yehuda',
            'last-name': 'Katz',
          },
        },
      },
    ]);

    let post = await store.findRecord('post', '1');

    assert.strictEqual(passedUrl[0], '/posts/1', 'The primary record post:1 was fetched by the correct url');

    assert.strictEqual(post.id, '1', 'Stores record using the correct id');
    assert.strictEqual(post.title, 'Ember.js rocks', 'Sets correct title to record');

    let author = await post.get('author');

    assert.strictEqual(
      passedUrl[1],
      'http://example.com/user/2',
      'The relationship user:2 was fetched by the correct url'
    );

    assert.strictEqual(author.id, '2', 'Record has correct id');
    assert.strictEqual(author.firstName, 'Yehuda', 'Sets correct firstName to record');
    assert.strictEqual(author.lastName, 'Katz', 'Sets correct lastName to record');
  });

  test('find a single record with belongsTo link as object { data }', async function (assert) {
    assert.expect(7);

    ajaxResponse([
      {
        data: {
          type: 'posts',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
          relationships: {
            author: {
              data: { type: 'users', id: '2' },
            },
          },
        },
      },
      {
        data: {
          type: 'users',
          id: '2',
          attributes: {
            'first-name': 'Yehuda',
            'last-name': 'Katz',
          },
        },
      },
    ]);

    let post = await store.findRecord('post', '1');

    assert.strictEqual(passedUrl[0], '/posts/1', 'The primary record post:1 was fetched by the correct url');

    assert.strictEqual(post.id, '1', 'Stores record using the correct id');
    assert.strictEqual(post.title, 'Ember.js rocks', 'Sets correct title to record');

    let author = await post.get('author');

    assert.strictEqual(passedUrl[1], '/users/2', 'The relationship user:2 was fetched by the correct url');
    assert.strictEqual(author.id, '2', 'Record has correct id');
    assert.strictEqual(author.firstName, 'Yehuda', 'Sets correct firstName to record');
    assert.strictEqual(author.lastName, 'Katz', 'Sets correct lastName to record');
  });

  test('find a single record with belongsTo link as object { data } (polymorphic)', async function (assert) {
    assert.expect(8);

    ajaxResponse([
      {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            'first-name': 'Yehuda',
            'last-name': 'Katz',
          },
          relationships: {
            company: {
              data: { type: 'development-shops', id: '2' },
            },
          },
        },
      },
      {
        data: {
          type: 'development-shop',
          id: '2',
          attributes: {
            name: 'Tilde',
            coffee: true,
          },
        },
      },
    ]);

    let user = await store.findRecord('user', '1');

    assert.strictEqual(passedUrl[0], '/users/1', 'The primary record user:1 was fetched by the correct url');

    assert.strictEqual(user.id, '1', 'Record has correct id');
    assert.strictEqual(user.firstName, 'Yehuda', 'Sets correct firstName to record');
    assert.strictEqual(user.lastName, 'Katz', 'Sets correct lastName to record');

    let company = await user.get('company');

    assert.strictEqual(
      passedUrl[1],
      '/development-shops/2',
      'The relationship development-shops:2 was fetched by the correct url'
    );

    assert.strictEqual(company.id, '2', 'Record has correct id');
    assert.strictEqual(company.name, 'Tilde', 'Sets correct name to record');
    assert.true(company.coffee, 'Sets correct value for coffee attribute');
  });

  test('find a single record with sideloaded belongsTo link as object { data }', async function (assert) {
    assert.expect(7);

    ajaxResponse([
      {
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
          relationships: {
            author: {
              data: { type: 'user', id: '2' },
            },
          },
        },
        included: [
          {
            type: 'user',
            id: '2',
            attributes: {
              'first-name': 'Yehuda',
              'last-name': 'Katz',
            },
          },
        ],
      },
    ]);

    let post = await store.findRecord('post', '1');

    assert.strictEqual(passedUrl[0], '/posts/1', 'The primary record post:1 was fetched by the correct url');

    assert.strictEqual(post.id, '1', 'Record has correct id');
    assert.strictEqual(post.title, 'Ember.js rocks', 'Title is set correctly');

    let author = await post.get('author');

    assert.strictEqual(passedUrl.length, 1);

    assert.strictEqual(author.id, '2', 'Record has correct id');
    assert.strictEqual(author.firstName, 'Yehuda', 'Record firstName is correct');
    assert.strictEqual(author.lastName, 'Katz', 'Record lastName is correct');
  });

  test('find a single record with hasMany link as object { related }', async function (assert) {
    assert.expect(7);

    ajaxResponse([
      {
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
          relationships: {
            comments: {
              links: {
                related: 'http://example.com/post/1/comments',
              },
            },
          },
        },
      },
      {
        data: [
          {
            type: 'comment',
            id: '2',
            attributes: {
              text: 'This is the first comment',
            },
          },
          {
            type: 'comment',
            id: '3',
            attributes: {
              text: 'This is the second comment',
            },
          },
        ],
      },
    ]);

    let post = await store.findRecord('post', '1');

    assert.strictEqual(passedUrl[0], '/posts/1');
    assert.strictEqual(post.id, '1');
    assert.strictEqual(post.title, 'Ember.js rocks');

    let comments = await post.get('comments');

    assert.strictEqual(
      passedUrl[1],
      'http://example.com/post/1/comments',
      'The related records comments using correct url'
    );
    assert.strictEqual(comments.length, 2, 'Loads the correct number of comments from response');
    assert.strictEqual(comments.get('firstObject.text'), 'This is the first comment', 'First comment text is correct');
    assert.strictEqual(comments.get('lastObject.text'), 'This is the second comment', 'Second comment text is correct');
  });

  test('find a single record with hasMany link as object { data }', async function (assert) {
    assert.expect(8);

    ajaxResponse([
      {
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '2' },
                { type: 'comment', id: '3' },
              ],
            },
          },
        },
      },
      {
        data: {
          type: 'comment',
          id: '2',
          attributes: {
            text: 'This is the first comment',
          },
        },
      },
      {
        data: {
          type: 'comment',
          id: '3',
          attributes: {
            text: 'This is the second comment',
          },
        },
      },
    ]);

    let post = await store.findRecord('post', '1');

    assert.strictEqual(passedUrl[0], '/posts/1', 'The primary record post:1 was fetched by the correct url');
    assert.strictEqual(post.id, '1', 'Record id is correct');
    assert.strictEqual(post.title, 'Ember.js rocks', 'Record title is correct');

    let comments = await post.get('comments');

    assert.strictEqual(passedUrl[1], '/comments/2', 'Builds correct URL to fetch related record');
    assert.strictEqual(passedUrl[2], '/comments/3', 'Builds correct URL to fetch related record');
    assert.strictEqual(comments.length, 2);
    assert.strictEqual(comments.get('firstObject.text'), 'This is the first comment', 'First comment text is correct');
    assert.strictEqual(comments.get('lastObject.text'), 'This is the second comment', 'Second comment text is correct');
  });

  test('find a single record with hasMany link as object { data } (polymorphic)', async function (assert) {
    assert.expect(9);

    ajaxResponse([
      {
        data: {
          type: 'user',
          id: '1',
          attributes: {
            'first-name': 'Yehuda',
            'last-name': 'Katz',
          },
          relationships: {
            handles: {
              data: [
                { type: 'github-handle', id: '2' },
                { type: 'twitter-handle', id: '3' },
              ],
            },
          },
        },
      },
      {
        data: {
          type: 'github-handle',
          id: '2',
          attributes: {
            username: 'wycats',
          },
        },
      },
      {
        data: {
          type: 'twitter-handle',
          id: '3',
          attributes: {
            nickname: '@wycats',
          },
        },
      },
    ]);

    let user = await store.findRecord('user', '1');

    assert.strictEqual(passedUrl[0], '/users/1', 'The primary record users:1 was fetched by the correct url');

    assert.strictEqual(user.id, '1', 'Record id is correct');
    assert.strictEqual(user.firstName, 'Yehuda', 'Record firstName is loaded');
    assert.strictEqual(user.lastName, 'Katz', 'Record lastName is loaded');

    let handles = await user.get('handles');

    assert.strictEqual(passedUrl[1], '/github-handles/2', 'Builds correct URL to fetch related record');
    assert.strictEqual(passedUrl[2], '/twitter-handles/3', 'Builds correct URL to fetch related record');

    assert.strictEqual(handles.get('length'), 2);
    assert.strictEqual(handles.get('firstObject.username'), 'wycats', 'First handle username is correct');
    assert.strictEqual(handles.get('lastObject.nickname'), '@wycats', 'Second handle nickname is correct');
  });

  test('find a single record with sideloaded hasMany link as object { data }', async function (assert) {
    assert.expect(7);

    ajaxResponse([
      {
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '2' },
                { type: 'comment', id: '3' },
              ],
            },
          },
        },
        included: [
          {
            type: 'comment',
            id: '2',
            attributes: {
              text: 'This is the first comment',
            },
          },
          {
            type: 'comment',
            id: '3',
            attributes: {
              text: 'This is the second comment',
            },
          },
        ],
      },
    ]);

    let post = await store.findRecord('post', '1');

    assert.strictEqual(passedUrl[0], '/posts/1', 'The primary record post:1 was fetched by the correct url');
    assert.strictEqual(post.id, '1', 'Record id is loaded');
    assert.strictEqual(post.title, 'Ember.js rocks', 'Record title is loaded');

    let comments = await post.get('comments');

    assert.strictEqual(passedUrl.length, 1, 'Do not call extra end points because related records are included');

    assert.strictEqual(comments.get('length'), 2, 'Loads related records');
    assert.strictEqual(comments.get('firstObject.text'), 'This is the first comment', 'First comment text is correct');
    assert.strictEqual(comments.get('lastObject.text'), 'This is the second comment', 'Second comment text is correct');
  });

  test('find a single record with sideloaded hasMany link as object { data } (polymorphic)', async function (assert) {
    assert.expect(8);

    ajaxResponse([
      {
        data: {
          type: 'user',
          id: '1',
          attributes: {
            'first-name': 'Yehuda',
            'last-name': 'Katz',
          },
          relationships: {
            handles: {
              data: [
                { type: 'github-handle', id: '2' },
                { type: 'twitter-handle', id: '3' },
              ],
            },
          },
        },
        included: [
          {
            type: 'github-handle',
            id: '2',
            attributes: {
              username: 'wycats',
            },
          },
          {
            type: 'twitter-handle',
            id: '3',
            attributes: {
              nickname: '@wycats',
            },
          },
        ],
      },
    ]);

    let user = await store.findRecord('user', '1');

    assert.strictEqual(passedUrl[0], '/users/1');

    assert.strictEqual(user.get('id'), '1');
    assert.strictEqual(user.get('firstName'), 'Yehuda');
    assert.strictEqual(user.get('lastName'), 'Katz');

    let handles = await user.get('handles');

    assert.strictEqual(passedUrl.length, 1, 'Do not call extra end points because related records are included');

    assert.strictEqual(handles.get('length'), 2);
    assert.strictEqual(handles.get('firstObject.username'), 'wycats');
    assert.strictEqual(handles.get('lastObject.nickname'), '@wycats');
  });

  test('create record', async function (assert) {
    assert.expect(3);

    ajaxResponse([
      {
        data: {
          type: 'users',
          id: '3',
        },
      },
    ]);

    let company = store.push({
      data: {
        type: 'company',
        id: '1',
        attributes: {
          name: 'Tilde Inc.',
        },
      },
    });

    let githubHandle = store.push({
      data: {
        type: 'github-handle',
        id: '2',
        attributes: {
          username: 'wycats',
        },
      },
    });

    let user = store.createRecord('user', {
      firstName: 'Yehuda',
      lastName: 'Katz',
      company: company,
    });

    let handles = await user.get('handles');

    handles.addObject(githubHandle);

    await user.save();

    assert.strictEqual(passedUrl[0], '/users');
    assert.strictEqual(passedVerb[0], 'POST');

    // TODO @runspired seems mega-bad that we expect an extra `data` key
    assert.deepEqual(passedHash[0], {
      data: {
        data: {
          type: 'users',
          attributes: {
            'first-name': 'Yehuda',
            'last-name': 'Katz',
          },
          relationships: {
            company: {
              data: { type: 'companies', id: '1' },
            },
          },
        },
      },
    });
  });

  test('update record', async function (assert) {
    assert.expect(3);

    ajaxResponse([
      {
        data: {
          type: 'users',
          id: '1',
        },
      },
    ]);

    let user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz',
        },
      },
    });

    let company = store.push({
      data: {
        type: 'company',
        id: '2',
        attributes: {
          name: 'Tilde Inc.',
        },
      },
    });

    let githubHandle = store.push({
      data: {
        type: 'github-handle',
        id: '3',
        attributes: {
          username: 'wycats',
        },
      },
    });

    user.set('firstName', 'Yehuda!');
    user.set('company', company);

    let handles = await user.get('handles');

    handles.addObject(githubHandle);

    await user.save();

    assert.strictEqual(passedUrl[0], '/users/1');
    assert.strictEqual(passedVerb[0], 'PATCH');
    // TODO @runspired seems mega-bad that we expect an extra `data` key
    assert.deepEqual(passedHash[0], {
      data: {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            'first-name': 'Yehuda!',
            'last-name': 'Katz',
          },
          relationships: {
            company: {
              data: { type: 'companies', id: '2' },
            },
          },
        },
      },
    });
  });

  test('update record - serialize hasMany', async function (assert) {
    assert.expect(3);

    ajaxResponse([
      {
        data: {
          type: 'users',
          id: '1',
        },
      },
    ]);

    this.owner.register(
      'serializer:user',
      DS.JSONAPISerializer.extend({
        attrs: {
          handles: { serialize: true },
        },
      })
    );

    let user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz',
        },
      },
    });

    let githubHandle = store.push({
      data: {
        type: 'github-handle',
        id: '2',
        attributes: {
          username: 'wycats',
        },
      },
    });

    let twitterHandle = store.push({
      data: {
        type: 'twitter-handle',
        id: '3',
        attributes: {
          nickname: '@wycats',
        },
      },
    });

    user.set('firstName', 'Yehuda!');

    let handles = await user.get('handles');

    handles.addObject(githubHandle);
    handles.addObject(twitterHandle);

    await user.save();

    assert.strictEqual(passedUrl[0], '/users/1');
    assert.strictEqual(passedVerb[0], 'PATCH');
    // TODO @runspired seems mega-bad that we expect an extra `data` key
    assert.deepEqual(passedHash[0], {
      data: {
        data: {
          type: 'users',
          id: '1',
          attributes: {
            'first-name': 'Yehuda!',
            'last-name': 'Katz',
          },
          relationships: {
            handles: {
              data: [
                { type: 'github-handles', id: '2' },
                { type: 'twitter-handles', id: '3' },
              ],
            },
          },
        },
      },
    });
  });

  test('fetching a belongsTo relationship link that returns null', async function (assert) {
    assert.expect(3);

    ajaxResponse([
      {
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Ember.js rocks',
          },
          relationships: {
            author: {
              links: {
                related: 'http://example.com/post/1/author',
              },
            },
          },
        },
      },
      {
        data: null,
      },
    ]);

    let post = await store.findRecord('post', '1');

    assert.strictEqual(passedUrl[0], '/posts/1');

    let author = await post.get('author');

    assert.strictEqual(passedUrl[1], 'http://example.com/post/1/author');
    assert.strictEqual(author, null);
  });
});
