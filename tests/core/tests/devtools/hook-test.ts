import { RequestManager, useRecommendedStore } from '@warp-drive/core';
import { DEBUG } from '@warp-drive/core/build-config/env';
import {
  DEVTOOLS_HOOK_KEY,
  DEVTOOLS_MESSAGE_SOURCE,
  DEVTOOLS_PROTOCOL_VERSION,
  installDevtoolsHook,
  type DevtoolsExtensionMessage,
  type DevtoolsPageMessage,
} from '@warp-drive/core/devtools-hook';
import { module, setupTest, test } from '@warp-drive/diagnostic/ember';
import { JSONAPICache } from '@warp-drive/json-api';

const Store = useRecommendedStore({
  cache: JSONAPICache,
});

function nextPageMessage(type: DevtoolsPageMessage['type']): Promise<DevtoolsPageMessage> {
  return new Promise((resolve) => {
    function onMessage(event: MessageEvent<DevtoolsPageMessage>) {
      const data = event.data;
      if (
        event.source === window &&
        data?.source === DEVTOOLS_MESSAGE_SOURCE &&
        data.from === 'page' &&
        data.type === type
      ) {
        window.removeEventListener('message', onMessage);
        resolve(data);
      }
    }
    window.addEventListener('message', onMessage);
  });
}

module('DevTools | hook', function (hooks) {
  setupTest(hooks);

  // The hook is only wired up in DEBUG builds.
  if (DEBUG) {
    test('the hook installs once on globalThis', function (assert) {
      const hook = installDevtoolsHook();
      const holder = globalThis as unknown as Record<string, unknown>;

      assert.true(holder[DEVTOOLS_HOOK_KEY] === hook, 'installed under the well-known key');
      assert.true(installDevtoolsHook() === hook, 'installing again returns the same hook');
      assert.equal(hook.protocolVersion, DEVTOOLS_PROTOCOL_VERSION, 'reports the protocol version');
    });

    test('a Store registers on construction and unregisters on destroy', function (assert) {
      const hook = installDevtoolsHook();
      const before = hook.getRegistry().length;
      const store = new Store();

      const entry = hook.getRegistry().find((e) => e.store === store);
      assert.equal(hook.getRegistry().length, before + 1, 'the registry grew by one');
      assert.ok(entry, 'the registry entry points at this store');
      assert.equal(entry?.protocolVersion, DEVTOOLS_PROTOCOL_VERSION, 'entry carries a protocolVersion');
      assert.deepEqual(entry?.capabilities, ['requests'], 'entry lists its capabilities');
      assert.equal(hook.storeIdFor(store), entry?.storeId, 'storeIdFor resolves the store');
      assert.equal(hook.storeIdFor(store.requestManager), entry?.storeId, 'storeIdFor resolves its RequestManager');

      store.destroy();
      assert.equal(hook.getRegistry().length, before, 'destroy removes the entry');
      assert.equal(hook.storeIdFor(store), null, 'a destroyed store has no id');
    });

    test('RequestManager records pending then settled events for a request', async function (assert) {
      const hook = installDevtoolsHook();
      const manager = new RequestManager().use([
        {
          request() {
            return Promise.resolve({ ok: true });
          },
        },
      ]);

      await manager.request({ url: '/devtools-test/ok', method: 'GET' });

      const events = hook.getRecordedRequests().filter((e) => e.url === '/devtools-test/ok');
      assert.equal(events.length, 1, 'one record per request id');
      assert.equal(events[0].status, 'success', 'the record is updated when the request settles');
      assert.equal(events[0].method, 'GET', 'method is recorded');
      assert.equal(events[0].storeId, null, 'a standalone RequestManager is not tied to a store');
      assert.true(typeof events[0].durationMs === 'number', 'duration is recorded');
    });

    test('RequestManager records failed requests', async function (assert) {
      const hook = installDevtoolsHook();
      const manager = new RequestManager().use([
        {
          request() {
            return Promise.reject(new Error('boom'));
          },
        },
      ]);

      try {
        await manager.request({ url: '/devtools-test/fail' });
        assert.ok(false, 'the request should reject');
      } catch {
        // expected
      }

      const events = hook.getRecordedRequests().filter((e) => e.url === '/devtools-test/fail');
      assert.equal(events.length, 1, 'one record per request id');
      assert.equal(events[0].status, 'error', 'a rejected request is recorded as an error');
    });

    test('a hello-request gets the registry and recorded requests; later events stream', async function (assert) {
      const hook = installDevtoolsHook();
      const store = new Store();
      const manager = new RequestManager().use([
        {
          request() {
            return Promise.resolve({});
          },
        },
      ]);
      await manager.request({ url: '/devtools-test/before-attach' });

      const hello = nextPageMessage('hello');
      const hi: DevtoolsExtensionMessage = {
        source: DEVTOOLS_MESSAGE_SOURCE,
        from: 'extension',
        type: 'hello-request',
      };
      window.postMessage(hi, window.location.origin);
      const message = await hello;

      assert.equal(message.type, 'hello');
      if (message.type === 'hello') {
        assert.equal(message.protocolVersion, DEVTOOLS_PROTOCOL_VERSION, 'hello reports the protocol version');
        assert.true(
          message.stores.some((s) => s.storeId === hook.storeIdFor(store)),
          'hello lists registered stores'
        );
        assert.true(
          message.requests.some((r) => r.url === '/devtools-test/before-attach'),
          'hello replays requests recorded before the extension attached'
        );
      }

      const streamed = nextPageMessage('request');
      void manager.request({ url: '/devtools-test/after-attach' });
      const live = await streamed;
      assert.equal(live.type, 'request', 'requests made after attaching are posted live');

      store.destroy();
    });
  }
});
