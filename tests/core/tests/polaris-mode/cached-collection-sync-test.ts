import type Owner from '@ember/owner';

import { createDeferred } from '@warp-drive/core/request';
import type { Handler } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';
import { module, setupTest, test } from '@warp-drive/diagnostic/ember';
import { query } from '@warp-drive/utilities/json-api';

import type { User } from '../-utils/store';
import { createStore } from '../-utils/store';

type Reply = { status: number; content: unknown };

function usersReply(id = '1', name = 'Chris'): Reply {
  return {
    status: 200,
    content: { data: [{ type: 'user', id, attributes: { name } }], meta: { revision: 1 } },
  };
}

function setupCollectionRequests(owner: Owner) {
  const network = {
    calls: 0,
    respond: (): Promise<Reply> => Promise.resolve(usersReply()),
  };
  const handler: Handler = {
    async request<T>(context: RequestContext) {
      network.calls++;
      const reply = await network.respond();
      context.setResponse(
        new Response(null, {
          status: reply.status,
          headers: { 'Content-Type': 'application/vnd.api+json', Date: new Date().toUTCString() },
        })
      );
      if (reply.status >= 400) {
        throw Object.assign(new Error('Unavailable'), { content: reply.content });
      }
      return reply.content as T;
    },
  };
  const store = createStore(owner, { handlers: [handler] });
  const request = (options: { reload?: boolean; backgroundReload?: boolean } = {}) =>
    query<User>('user', {}, { host: 'https://api.example.test', namespace: '', ...options });

  return { store, network, request };
}

module('RecordArray | Cached collection synchronization', function (hooks) {
  setupTest(hooks);

  test('failed reload keeps held membership and exposes the error', async function (assert) {
    const { store, network, request } = setupCollectionRequests(this.owner);
    const first = await store.request(request());
    const users = first.content.data;
    assert.equal(users.length, 1);
    const user = users[0];
    network.respond = () => Promise.resolve({ status: 503, content: { errors: [{ detail: 'Unavailable' }] } });

    try {
      await store.request(request({ reload: true }));
      assert.ok(false, 'the failed request should reject');
    } catch (error) {
      assert.true(error instanceof Error, 'the Future rejects with an error');
    }

    assert.equal(network.calls, 2);
    assert.equal(first.content.data, undefined, 'the document has no successful data');
    assert.deepEqual(first.content.errors, [{ detail: 'Unavailable' }]);
    assert.equal(users.length, 1, 'the held collection still has its prior member');
    assert.true(users[0] === user);
    assert.equal(user.name, 'Chris');
  });

  test('failed background reload keeps held membership until recovery', async function (assert) {
    const { store, network, request } = setupCollectionRequests(this.owner);
    const first = await store.request(request());
    const users = first.content.data;
    assert.equal(users.length, 1);
    const user = users[0];
    const reply = createDeferred<Reply>();
    network.respond = () => reply.promise;

    const background = store.request(request({ backgroundReload: true }));
    const stale = await background;
    assert.true(stale.content.data === users, 'the stale response returns the same collection');
    assert.true(users[0] === user);
    await this.h.waitUntil(() => network.calls === 2);
    const key = background.lid;
    assert.ok(key);

    reply.resolve({ status: 503, content: { errors: [{ detail: 'Unavailable' }] } });
    await this.h.waitUntil(() => {
      const document = store.cache.peekRequest(key!);
      return Boolean(document && 'error' in document);
    });

    assert.equal(first.content.data, undefined, 'the current document exposes the failure');
    assert.deepEqual(first.content.errors, [{ detail: 'Unavailable' }]);
    assert.equal(users.length, 1);
    assert.true(users[0] === user, 'the held collection remains readable');
    assert.equal(user.name, 'Chris');
    network.respond = () => Promise.resolve(usersReply('1', 'Recovered'));

    const recovered = await store.request(request({ reload: true }));

    assert.equal(network.calls, 3);
    assert.true(recovered.content.data === users, 'recovery reuses the held collection');
    assert.true(users[0] === user, 'recovery preserves record identity');
    assert.equal(user.name, 'Recovered');
    assert.equal(recovered.content.errors, undefined);
  });

  test('successful reload changes membership and empty data clears it', async function (assert) {
    const { store, network, request } = setupCollectionRequests(this.owner);
    const first = await store.request(request());
    const users = first.content.data;
    assert.equal(users.length, 1);
    const original = users[0];
    network.respond = () => Promise.resolve(usersReply('2', 'Replacement'));

    const replacement = await store.request(request({ reload: true }));

    assert.true(replacement.content.data === users, 'successful reload reuses the collection');
    assert.equal(users.length, 1);
    assert.equal(users[0]?.id, '2');
    assert.equal(users[0]?.name, 'Replacement');
    network.respond = () => Promise.resolve({ status: 200, content: { data: [] } });

    const empty = await store.request(request({ reload: true }));

    assert.true(empty.content.data === users, 'empty data keeps collection identity');
    assert.equal(users.length, 0);
    assert.equal(network.calls, 3);
    assert.true(store.peekRecord('user', '1') === original, 'membership changes do not unload records');
  });

  test('metadata-only reload keeps membership while null data clears it', async function (assert) {
    const { store, network, request } = setupCollectionRequests(this.owner);
    const first = await store.request(request());
    const users = first.content.data;
    assert.equal(users.length, 1);
    const user = users[0];
    assert.deepEqual(first.content.meta, { revision: 1 });
    network.respond = () => Promise.resolve({ status: 200, content: { meta: { revision: 2 } } });

    const metadata = await store.request(request({ reload: true }));

    assert.equal(metadata.content.data, undefined);
    assert.deepEqual(metadata.content.meta, { revision: 2 });
    assert.deepEqual(first.content.meta, { revision: 2 }, 'the existing document reflects updated metadata');
    assert.equal(users.length, 1, 'metadata does not replace held membership');
    assert.true(users[0] === user);
    network.respond = () => Promise.resolve({ status: 200, content: { data: null } });

    const empty = await store.request(request({ reload: true }));

    assert.equal(empty.content.data, null, 'the document reflects explicit null');
    assert.equal(users.length, 0, 'explicit null still clears held membership');
    assert.equal(network.calls, 3);
  });
});
