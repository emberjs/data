import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, hasMany } from '@ember-data/model';

module('Integration | Records | unloadAll', function (hooks) {
  setupTest(hooks);

  test('repeat unloadAll works when queues are given the chance to settle', async function (assert) {
    this.owner.register(
      'model:post',
      class Post extends Model {
        @attr title;
      }
    );
    const store = this.owner.lookup('service:store');

    // round 1
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    await settled();
    assert.strictEqual(store.peekAll('post').length, 2, 'precond - 2 posts in the store');
    store.unloadAll('post');
    await settled();
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store after first unloadAll');

    // round 2
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    await settled();
    assert.strictEqual(store.peekAll('post').length, 2, '2 posts in the store');
    store.unloadAll('post');
    await settled();
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store after second unloadAll');

    // round 3
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    await settled();
    assert.strictEqual(store.peekAll('post').length, 2, '2 posts in the store');
    store.unloadAll('post');
    await settled();
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store after third unloadAll');
  });

  test('repeat unloadAll works when queues are given the chance to settle, no peekAll after unloadAll', async function (assert) {
    this.owner.register(
      'model:post',
      class Post extends Model {
        @attr title;
      }
    );
    const store = this.owner.lookup('service:store');

    // round 1
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    await settled();
    assert.strictEqual(store.peekAll('post').length, 2, 'precond - 2 posts in the store');
    store.unloadAll('post');
    await settled();

    // round 2
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    await settled();
    assert.strictEqual(store.peekAll('post').length, 2, '2 posts in the store');
    store.unloadAll('post');
    await settled();

    // round 3
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    await settled();
    assert.strictEqual(store.peekAll('post').length, 2, '2 posts in the store');
    store.unloadAll('post');
    await settled();
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store after third unloadAll');
  });

  test('repeat unloadAll works when queues are given the chance to settle, no peekAll until end', async function (assert) {
    this.owner.register(
      'model:post',
      class Post extends Model {
        @attr title;
      }
    );
    const store = this.owner.lookup('service:store');
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store');

    // round 1
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    await settled();
    store.unloadAll('post');
    await settled();

    // round 2
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    await settled();
    store.unloadAll('post');
    await settled();

    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store after second unloadAll');
  });

  test('(crazytown) repeat unloadAll works when queues are not given the chance to settle, no peekAll after unloadAll', async function (assert) {
    this.owner.register(
      'model:post',
      class Post extends Model {
        @attr title;
      }
    );
    const store = this.owner.lookup('service:store');

    // round 1
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    assert.strictEqual(store.peekAll('post').length, 2, 'precond - 2 posts in the store');
    store.unloadAll('post');

    // round 2
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    assert.strictEqual(store.peekAll('post').length, 2, '2 posts in the store');
    store.unloadAll('post');

    // round 3
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    assert.strictEqual(store.peekAll('post').length, 2, '2 posts in the store');
    store.unloadAll('post');
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store after third unloadAll');

    await settled();
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store at the end');
  });

  test('(crazytown) repeat unloadAll works when queues are not given the chance to settle, no peekAll until the end', async function (assert) {
    this.owner.register(
      'model:post',
      class Post extends Model {
        @attr title;
      }
    );
    const store = this.owner.lookup('service:store');

    // round 1
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    store.unloadAll('post');

    // round 2
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    store.unloadAll('post');

    // round 3
    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Lorem ipsum',
          },
        },
      ],
    });
    store.unloadAll('post');
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store after third unloadAll');

    await settled();
    assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store at the end');
  });

  const TYPES = ['post', 'category', 'author'];
  TYPES.forEach((type) => {
    const RemainingTypes = TYPES.filter((t) => t !== type);
    RemainingTypes.forEach((remainingType) => {
      const finalType = RemainingTypes.find((t) => t !== remainingType);
      const UnloadOrder = [type, remainingType, finalType];

      test(`unloadAll(<type>) works when some of the related records of another type are also unloaded (${UnloadOrder.join(
        ' => '
      )})`, function (assert) {
        const { owner } = this;

        // since async relationships are retainers, we make all
        // sides here async to dial up the potential cycle
        // we also do a three-way cycle to add extra complexity
        class Post extends Model {
          @attr title;
          @hasMany('author', { async: true, inverse: 'posts' }) authors;
        }
        class Category extends Model {
          @attr name;
          @hasMany('author', { async: true, inverse: 'categories' }) authors;
        }
        class Author extends Model {
          @attr name;
          @hasMany('category', { async: true, inverse: 'authors' }) categories;
          @hasMany('post', { async: true, inverse: 'authors' }) posts;
        }

        owner.register('model:post', Post);
        owner.register('model:category', Category);
        owner.register('model:author', Author);
        const store = owner.lookup('service:store');

        // push some data into the store
        store.push({
          data: [
            {
              type: 'post',
              id: '1',
              attributes: {
                title: 'Lorem ipsum',
              },
              relationships: {
                authors: {
                  data: [{ type: 'author', id: '1' }],
                },
              },
            },
            {
              type: 'category',
              id: '1',
              attributes: {
                name: 'Lorem ipsum',
              },
              relationships: {
                authors: {
                  data: [{ type: 'author', id: '1' }],
                },
              },
            },
            {
              type: 'author',
              id: '1',
              attributes: {
                name: 'Lorem ipsum',
              },
              relationships: {
                posts: {
                  data: [{ type: 'post', id: '1' }],
                },
                categories: {
                  data: [{ type: 'category', id: '1' }],
                },
              },
            },
          ],
        });

        // unload all the records of each type by type
        UnloadOrder.forEach((type) => {
          store.unloadAll(type);
        });

        // assert that all the records are unloaded
        assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store');
        assert.strictEqual(store.peekAll('category').length, 0, '0 categories in the store');
        assert.strictEqual(store.peekAll('author').length, 0, '0 authors in the store');
      });

      test(`unloadAll(<type>) works when some of the related records of another type were never loaded (${UnloadOrder.join(
        ' => '
      )})`, function (assert) {
        const { owner } = this;

        // since async relationships are retainers, we make all
        // sides here async to dial up the potential cycle
        // we also do a three-way cycle to add extra complexity
        class Post extends Model {
          @attr title;
          @hasMany('author', { async: true, inverse: 'posts' }) authors;
        }
        class Category extends Model {
          @attr name;
          @hasMany('author', { async: true, inverse: 'categories' }) authors;
        }
        class Author extends Model {
          @attr name;
          @hasMany('category', { async: true, inverse: 'authors' }) categories;
          @hasMany('post', { async: true, inverse: 'authors' }) posts;
        }

        owner.register('model:post', Post);
        owner.register('model:category', Category);
        owner.register('model:author', Author);
        const store = owner.lookup('service:store');

        // push some data into the store
        // and make sure all relationships are materialized
        // note: we intentionally do not load author
        store.push({
          data: [
            {
              type: 'post',
              id: '1',
              attributes: {
                title: 'Lorem ipsum',
              },
              relationships: {
                authors: {
                  data: [{ type: 'author', id: '1' }],
                },
              },
            },
            {
              type: 'category',
              id: '1',
              attributes: {
                text: 'Lorem ipsum',
              },
              relationships: {
                authors: {
                  data: [{ type: 'author', id: '1' }],
                },
              },
            },
          ],
        });

        // unload all the records of each type by type
        UnloadOrder.forEach((type) => {
          store.unloadAll(type);
        });

        // assert that all the records are unloaded
        assert.strictEqual(store.peekAll('post').length, 0, '0 posts in the store');
        assert.strictEqual(store.peekAll('category').length, 0, '0 categories in the store');
        assert.strictEqual(store.peekAll('author').length, 0, '0 authors in the store');
      });
    });
  });
});
