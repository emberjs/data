import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

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
});
