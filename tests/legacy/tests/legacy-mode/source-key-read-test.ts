import type Owner from '@ember/owner';
import { setOwner } from '@ember/owner';

import type { Type } from '@warp-drive/core/types/symbols';
import { module, setupTest, test } from '@warp-drive/diagnostic/ember';
import { JSONAPICache } from '@warp-drive/json-api';
import { useLegacyStore } from '@warp-drive/legacy';
import { withRestoredDeprecatedModelRequestBehaviors as withLegacy } from '@warp-drive/legacy/model/migration-support';

const Store = useLegacyStore({
  linksMode: false,
  cache: JSONAPICache,
});

module('Legacy | Reads | SourceKey', function (hooks) {
  setupTest(hooks);

  test('belongsTo can use sourceKey', function (assert) {
    type User = {
      id: string | null;
      $type: 'user';
      name: string;
      bestFriend: User | null;
      [Type]: 'user';
    };
    const store = new Store();
    setOwner(store, this.owner);
    const { schema } = store;

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
          {
            name: 'bestFriend',
            sourceKey: 'best-friend',
            type: 'user',
            kind: 'belongsTo',
            options: { async: false, inverse: 'bestFriend' },
          },
        ],
      })
    );

    const Rey = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
        },
        relationships: {
          'best-friend': {
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Matt Seidel',
          },
          relationships: {
            'best-friend': {
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;

    assert.equal(Rey.id, '1', 'id is accessible');
    assert.equal(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.equal(Rey.bestFriend, Matt, 'Rey has Matt as bestFriend');
    assert.equal(Matt.bestFriend, Rey, 'Matt has Rey as bestFriend');
  });

  test('hasMany can use sourceKey', function (assert) {
    type User = {
      id: string | null;
      $type: 'user';
      name: string;
      friends: User[];
      [Type]: 'user';
    };
    const store = new Store();
    setOwner(store, this.owner);
    const { schema } = store;

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
          {
            name: 'friends',
            type: 'user',
            sourceKey: 'best-friends',
            kind: 'hasMany',
            options: { async: false, inverse: 'friends' },
          },
        ],
      })
    );

    const Rey = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
        },
        relationships: {
          'best-friends': {
            data: [{ type: 'user', id: '2' }],
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Matt Seidel',
          },
          relationships: {
            'best-friends': {
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;

    assert.equal(Rey.id, '1', 'id is accessible');
    assert.equal(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.equal(Rey.friends.length, 1, 'Rey has only one friend :(');
    assert.equal(Matt.friends.length, 1, 'Matt has only one friend :(');
    assert.equal(Rey.friends[0], Matt, 'Rey has Matt as bestFriend');
    assert.equal(Matt.friends[0], Rey, 'Matt has Rey as bestFriend');
  });

  module('the inverse of a relationship using sourceKey is populated', function () {
    type Author = {
      id: string | null;
      $type: 'author';
      blogPosts: BlogPost[];
      [Type]: 'author';
    };
    type BlogPost = {
      id: string | null;
      $type: 'blog-post';
      author: Author | null;
      [Type]: 'blog-post';
    };

    function setupStore(owner: Owner, sourceKeys: { blogPosts?: string; author?: string }) {
      const store = new Store();
      setOwner(store, owner);
      const { schema } = store;

      schema.registerResource(
        withLegacy({
          type: 'author',
          fields: [
            {
              name: 'blogPosts',
              sourceKey: sourceKeys.blogPosts,
              kind: 'hasMany',
              type: 'blog-post',
              options: { async: false, inverse: 'author' },
            },
          ],
        })
      );
      schema.registerResource(
        withLegacy({
          type: 'blog-post',
          fields: [
            {
              name: 'author',
              sourceKey: sourceKeys.author,
              kind: 'belongsTo',
              type: 'author',
              options: { async: false, inverse: 'blogPosts' },
            },
          ],
        })
      );
      return store;
    }

    function pushFromAuthor(store: InstanceType<typeof Store>, key: string) {
      return store.push<Author>({
        data: {
          type: 'author',
          id: '1',
          relationships: {
            [key]: { data: [{ type: 'blog-post', id: '1' }] },
          },
        },
        included: [{ type: 'blog-post', id: '1', attributes: {} }],
      });
    }

    function pushFromBlogPost(store: InstanceType<typeof Store>, key: string) {
      return store.push<BlogPost>({
        data: {
          type: 'blog-post',
          id: '1',
          relationships: {
            [key]: { data: { type: 'author', id: '1' } },
          },
        },
        included: [{ type: 'author', id: '1', attributes: {} }],
      });
    }

    test('hasMany with sourceKey, pushed from the hasMany side', function (assert) {
      const store = setupStore(this.owner, { blogPosts: 'blog-posts' });
      const author = pushFromAuthor(store, 'blog-posts');
      const post = store.peekRecord<BlogPost>('blog-post', '1')!;

      assert.equal(author.blogPosts.length, 1, 'author has one blog post');
      assert.equal(author.blogPosts[0], post, 'author has the blog post');
      assert.equal(post.author, author, 'the inverse belongsTo is populated');
    });

    test('hasMany with sourceKey, pushed from the belongsTo side', function (assert) {
      const store = setupStore(this.owner, { blogPosts: 'blog-posts' });
      const post = pushFromBlogPost(store, 'author');
      const author = store.peekRecord<Author>('author', '1')!;

      assert.equal(post.author, author, 'blog post has the author');
      assert.equal(author.blogPosts.length, 1, 'the inverse hasMany is populated');
      assert.equal(author.blogPosts[0], post, 'the inverse hasMany has the blog post');
    });

    test('belongsTo with sourceKey, pushed from the belongsTo side', function (assert) {
      const store = setupStore(this.owner, { author: 'post-author' });
      const post = pushFromBlogPost(store, 'post-author');
      const author = store.peekRecord<Author>('author', '1')!;

      assert.equal(post.author, author, 'blog post has the author');
      assert.equal(author.blogPosts.length, 1, 'the inverse hasMany is populated');
      assert.equal(author.blogPosts[0], post, 'the inverse hasMany has the blog post');
    });

    test('belongsTo with sourceKey, pushed from the hasMany side', function (assert) {
      const store = setupStore(this.owner, { author: 'post-author' });
      const author = pushFromAuthor(store, 'blogPosts');
      const post = store.peekRecord<BlogPost>('blog-post', '1')!;

      assert.equal(author.blogPosts[0], post, 'author has the blog post');
      assert.equal(post.author, author, 'the inverse belongsTo is populated');
    });

    test('both sides with sourceKey', function (assert) {
      const store = setupStore(this.owner, { blogPosts: 'blog-posts', author: 'post-author' });
      const author = pushFromAuthor(store, 'blog-posts');
      const post = store.peekRecord<BlogPost>('blog-post', '1')!;

      assert.equal(author.blogPosts[0], post, 'author has the blog post');
      assert.equal(post.author, author, 'the inverse belongsTo is populated');

      post.author = null;
      assert.equal(author.blogPosts.length, 0, 'clearing the belongsTo updates the inverse hasMany');
    });
  });
});
