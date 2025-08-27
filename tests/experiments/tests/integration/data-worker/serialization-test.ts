import { CacheHandler, RequestManager, Store } from '@warp-drive/core';
import { DefaultCachePolicy } from '@warp-drive/core/store';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import { module, test } from '@warp-drive/diagnostic';
import { WorkerFetch } from '@warp-drive/experiments/worker-fetch';
import { MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { JSONAPICache } from '@warp-drive/json-api';
import { instantiateRecord, registerDerivations, SchemaService, teardownRecord } from '@warp-drive/schema-record';
import { buildBaseURL } from '@warp-drive/utilities';

import { UserSchema } from './user-schema';

const RECORD = true;

/**
 * These tests help to ensure that we can properly cache and retrieve
 * network requests.
 *
 * Currently (08/26/2024) the spec for Headers, Response and Request
 * objects does not not enable them to be cloned via structured cloning,
 * which prevents sending them via postMessage / cloning them via
 * `structuredClone()`.
 */
module('Unit | DataWorker | Serialization & Persistence', function (_hooks) {
  test('Serialization of Request/Response/Headers works as expected', async function (assert) {
    const worker = new Worker(new URL('./persisted-worker.ts', import.meta.url));
    const MockHandler = new MockServerHandler(this);

    await GET(
      this,
      'users/1',
      () => ({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      }),
      { RECORD }
    );

    class TestStore extends Store {
      constructor() {
        super();
        const rm = (this.requestManager = new RequestManager());
        const handlers = [MockHandler, new WorkerFetch(worker)];
        rm.use(handlers);
        rm.useCache(CacheHandler);

        this.lifetimes = new DefaultCachePolicy({
          apiCacheHardExpires: 1000,
          apiCacheSoftExpires: 500,
        });
      }

      createCache(capabilities: CacheCapabilitiesManager) {
        return new JSONAPICache(capabilities);
      }

      createSchemaService() {
        const schema = new SchemaService();
        registerDerivations(schema);
        schema.registerResource(UserSchema);
        return schema;
      }

      instantiateRecord(identifier: ResourceKey, createRecordArgs: { [key: string]: unknown }): unknown {
        return instantiateRecord(this, identifier, createRecordArgs);
      }

      teardownRecord(record: unknown): void {
        return teardownRecord(record);
      }
    }

    const store = new TestStore();

    const { content } = await store.request<{ data: { id: string; firstName: string; lastName: string } }>({
      url: buildBaseURL({ resourcePath: 'users/1' }),
    });
    const { data } = content;
    assert.equal(data.firstName, 'Chris', 'First name is correct');
    assert.equal(data.lastName, 'Thoburn', 'Last name is correct');
    assert.equal(data.id, '1', 'ID is correct');
  });
});
