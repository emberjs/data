import type { TestContext } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import Model, { attr, belongsTo } from '@ember-data/model';
import type { Handler } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import type Store from '@ember-data/store';
import { CacheHandler } from '@ember-data/store';
import { Type } from '@warp-drive/core-types/symbols';

module('integration/relationship/belongs-to BelongsTo Relationships (linksMode)', function (hooks) {
  setupTest(hooks);

  class User extends Model {
    @belongsTo('user', { inverse: 'bestFriend', async: false, linksMode: true }) bestFriend;
    @attr declare name: string;
    [Type] = 'user';
  }

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('model:user', User);
  });

  test('we can use sync belongsTo in linksMode', async function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;

    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context): Promise<T> {
        assert.step(`op=${context.request.op ?? 'UNKNOWN OP CODE'}, url=${context.request.url ?? 'UNKNOWN URL'}`);
        return Promise.resolve({
          data: {
            type: 'user',
            id: '3',
            attributes: {
              name: 'Ray',
            },
            relationships: {
              bestFriend: {
                links: { related: '/user/3/bestFriend' },
                data: { type: 'user', id: '1' },
              },
            },
          },
          included: [
            {
              type: 'user',
              id: '1',
              attributes: {
                name: 'Chris',
              },
              relationships: {
                bestFriend: {
                  links: { related: '/user/3/bestFriend' },
                  data: { type: 'user', id: '3' },
                },
              },
            },
          ],
        } as T);
      },
    };
    const InterceptingHandler: Handler = {
      request(context, next) {
        assert.step('LegacyNetworkHandler.request was called');
        return LegacyNetworkHandler.request(context, next);
      },
    };

    manager.use([InterceptingHandler, handler]);
    manager.useCache(CacheHandler);
    store.requestManager = manager;

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            links: { related: '/user/1/bestFriend' },
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey',
          },
          relationships: {
            bestFriend: {
              links: { related: '/user/2/bestFriend' },
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend?.id, '2', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend?.name, 'Rey', 'bestFriend.name is accessible');
    assert.strictEqual(record.bestFriend?.bestFriend?.id, record.id, 'bestFriend is reciprocal');

    await record.belongsTo('bestFriend').reload();

    assert.verifySteps(
      ['LegacyNetworkHandler.request was called', 'op=findBelongsTo, url=/user/1/bestFriend'],
      'op and url are correct'
    );

    assert.strictEqual(record.id, '1', 'id is correct');
    assert.strictEqual(record.name, 'Chris', 'name is correct');
    assert.strictEqual(record.bestFriend?.id, '3', 'bestFriend.id is correct');
    assert.strictEqual(record.bestFriend?.name, 'Ray', 'bestFriend.name is correct');
  });

  test('belongsTo reload fails if no links in response in linksMode', async function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;

    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context): Promise<T> {
        assert.step(`op=${context.request.op ?? 'UNKNOWN OP CODE'}, url=${context.request.url ?? 'UNKNOWN URL'}`);
        return Promise.resolve({
          data: {
            type: 'user',
            id: '3',
            attributes: {
              name: 'Ray',
            },
            relationships: {
              bestFriend: {
                // oops we forgot links
                data: { type: 'user', id: '1' },
              },
            },
          },
        } as T);
      },
    };
    const InterceptingHandler: Handler = {
      request(context, next) {
        assert.step('LegacyNetworkHandler.request was called');
        return LegacyNetworkHandler.request(context, next);
      },
    };

    manager.use([InterceptingHandler, handler]);
    manager.useCache(CacheHandler);
    store.requestManager = manager;

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            links: { related: '/user/1/bestFriend' },
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey',
          },
          relationships: {
            bestFriend: {
              links: { related: '/user/2/bestFriend' },
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend?.id, '2', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend?.name, 'Rey', 'bestFriend.name is accessible');
    assert.strictEqual(record.bestFriend?.bestFriend?.id, record.id, 'bestFriend is reciprocal');

    await assert.expectAssertion(
      () => record.belongsTo('bestFriend').reload(),
      'Cannot fetch user.bestFriend because the field is in linksMode but the related link is missing'
    );

    assert.verifySteps(
      ['LegacyNetworkHandler.request was called', 'op=findBelongsTo, url=/user/1/bestFriend'],
      'op and url are correct'
    );
  });

  test('belongsTo reload fails if relationship data is undefined', async function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;

    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context): Promise<T> {
        assert.step(`op=${context.request.op ?? 'UNKNOWN OP CODE'}, url=${context.request.url ?? 'UNKNOWN URL'}`);
        return Promise.resolve({
          data: {
            type: 'user',
            id: '3',
            attributes: {
              name: 'Ray',
            },
            relationships: {
              bestFriend: {
                links: { related: '/user/1/bestFriend' },
                // oops no data
              },
            },
          },
          included: [
            {
              type: 'user',
              id: '1',
              attributes: {
                name: 'Chris',
              },
              relationships: {
                bestFriend: {
                  links: { related: '/user/3/bestFriend' },
                  data: { type: 'user', id: '3' },
                },
              },
            },
          ],
        } as T);
      },
    };
    const InterceptingHandler: Handler = {
      request(context, next) {
        assert.step('LegacyNetworkHandler.request was called');
        return LegacyNetworkHandler.request(context, next);
      },
    };

    manager.use([InterceptingHandler, handler]);
    manager.useCache(CacheHandler);
    store.requestManager = manager;

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            links: { related: '/user/1/bestFriend' },
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey',
          },
          relationships: {
            bestFriend: {
              links: { related: '/user/1/bestFriend' },
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend?.id, '2', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend?.name, 'Rey', 'bestFriend.name is accessible');
    assert.strictEqual(record.bestFriend?.bestFriend?.id, record.id, 'bestFriend is reciprocal');

    await assert.expectAssertion(
      () => record.belongsTo('bestFriend').reload(),
      'Cannot fetch user.bestFriend because the field is in linksMode but the relationship data is undefined'
    );

    assert.verifySteps(
      ['LegacyNetworkHandler.request was called', 'op=findBelongsTo, url=/user/1/bestFriend'],
      'op and url are correct'
    );
  });

  test('belongsTo reload allowed if relationship data is null', async function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;

    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context): Promise<T> {
        assert.step(`op=${context.request.op ?? 'UNKNOWN OP CODE'}, url=${context.request.url ?? 'UNKNOWN URL'}`);
        return Promise.resolve({
          data: {
            type: 'user',
            id: '3',
            attributes: {
              name: 'Ray',
            },
            relationships: {
              bestFriend: {
                links: { related: '/user/3/bestFriend' },
                data: { type: 'user', id: '1' },
              },
            },
          },
          included: [
            {
              type: 'user',
              id: '1',
              attributes: {
                name: 'Chris',
              },
              relationships: {
                bestFriend: {
                  links: { related: '/user/3/bestFriend' },
                  data: { type: 'user', id: '3' },
                },
              },
            },
          ],
        } as T);
      },
    };
    const InterceptingHandler: Handler = {
      request(context, next) {
        assert.step('LegacyNetworkHandler.request was called');
        return LegacyNetworkHandler.request(context, next);
      },
    };

    manager.use([InterceptingHandler, handler]);
    manager.useCache(CacheHandler);
    store.requestManager = manager;

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            links: { related: '/user/1/bestFriend' },
            data: null,
          },
        },
      },
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend, null, 'bestFriend.id is null');

    await record.belongsTo('bestFriend').reload();

    assert.verifySteps(
      ['LegacyNetworkHandler.request was called', 'op=findBelongsTo, url=/user/1/bestFriend'],
      'op and url are correct'
    );

    assert.strictEqual(record.id, '1', 'id is correct');
    assert.strictEqual(record.name, 'Chris', 'name is correct');
    assert.strictEqual(record.bestFriend?.id, '3', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend?.name, 'Ray', 'bestFriend.name is accessible');
    assert.strictEqual(record.bestFriend?.bestFriend?.id, record.id, 'bestFriend is reciprocal');
  });

  test('belongsTo reload allowed if relationship data is null 2', async function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;

    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context): Promise<T> {
        assert.step(`op=${context.request.op ?? 'UNKNOWN OP CODE'}, url=${context.request.url ?? 'UNKNOWN URL'}`);
        return Promise.resolve({
          data: {
            type: 'user',
            id: '1',
            attributes: {
              name: 'Chris',
            },
            relationships: {
              bestFriend: {
                links: { related: '/user/1/bestFriend' },
                data: null,
              },
            },
          },
        } as T);
      },
    };
    const InterceptingHandler: Handler = {
      request(context, next) {
        assert.step('LegacyNetworkHandler.request was called');
        return LegacyNetworkHandler.request(context, next);
      },
    };

    manager.use([InterceptingHandler, handler]);
    manager.useCache(CacheHandler);
    store.requestManager = manager;

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            links: { related: '/user/1/bestFriend' },
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey',
          },
          relationships: {
            bestFriend: {
              links: { related: '/user/2/bestFriend' },
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend?.id, '2', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend?.name, 'Rey', 'bestFriend.name is accessible');
    assert.strictEqual(record.bestFriend?.bestFriend?.id, record.id, 'bestFriend is reciprocal');

    await record.belongsTo('bestFriend').reload();

    assert.verifySteps(
      ['LegacyNetworkHandler.request was called', 'op=findBelongsTo, url=/user/1/bestFriend'],
      'op and url are correct'
    );

    assert.strictEqual(record.id, '1', 'id is correct');
    assert.strictEqual(record.name, 'Chris', 'name is correct');
    assert.strictEqual(record.bestFriend, null, 'bestFriend.id is null');
  });
});

// TODO: a second thing to do for legacy:
// we should also add tests to the main test suite to confirm that instances of @ember-data/model in links-only
// mode fetch their async relationship data via the link via requestmanager without requiring the legacy support
// infrastructure.

/*
FIXME:
link but no data key = not supported YET
link + data: null = supported
link + data with identifier
  referenced record in same payload = supported
  referenced record not in payload = not supported
*/
