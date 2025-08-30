import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';
import { instantiateRecord, registerDerivations, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import { DefaultCachePolicy } from '@warp-drive/core/store';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import { JSONAPICache } from '@warp-drive/json-api';

import { AuthorSchema } from '../schemas/author';
import { BookSchema } from '../schemas/book';
import { GenreSchema } from '../schemas/genre';

export default class AppStore extends Store {
  requestManager = new RequestManager().use([Fetch]).useCache(CacheHandler);

  lifetimes = new DefaultCachePolicy({
    apiCacheHardExpires: 15 * 60 * 1000, // 15 minutes
    apiCacheSoftExpires: 1 * 30 * 1000, // 30 seconds
    constraints: {
      headers: {
        'X-WarpDrive-Expires': true,
        'Cache-Control': true,
        Expires: true,
      },
    },
  });

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    schema.registerResource(AuthorSchema);
    schema.registerResource(BookSchema);
    schema.registerResource(GenreSchema);
    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(key: ResourceKey, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, key, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}
