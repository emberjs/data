<p align="center">
  <img
    class="project-logo"
    src="../../NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="../../NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">PersistedCache</h3>

- ⚡️ Load new tabs or windows without ever hitting network
- ♻️ Replay requests reliably in any order and still get the latest state of all associated resources

## Install

```cli
pnpm add @warp-drive/experiments
```

Or use favorite your javascript package manager.

## Configure

```ts
class Store {
  requestManager = new RequestManager()
    .use([new PersistedFetch(), Fetch])
    .useCache(CacheHandler);

  createCache() {
    const jsonapi = new JSONAPICache();
    return new PersistedCache(jsonapi);
  }
}
```

## How it Works

### Insertion

Only "clean" (remote) state is persisted. Dirty state is not currently persisted, and thus
a "refresh" of the page or opening a tab will result in new data.

The PersistedCache wraps a Cache implementation.

Whenever a request result is `put` into the cache, the result is used 
to construct a new cache entry for indexeddb for the document and associated resources.

Whenever a save request commits, similarly the new state of any associated resources
is persisted to indexeddb.

When a `store.push` occurs (resulting in a `put` without an associated document), only
the associated resource state is updated in indexeddb.

### Sync

Whenever IndexedDB is updated, any resources currently in the tab's in-memory cache
will update.

### Retrieval

Requests saved to IndexedDB are replayed by using the `PersistedFetch` handler.
This handler will check whether the request exists in the persisted cache
and resolve it using the registered CachePolicy to determine staleness.

CachePolicies which invalidate requests based on in-memory lists may fail
to invalidate a persisted request since it was not known to the policy at
the point of invalidation. This can be handled (for now) by integrating with IndexedDB,
though we expect this handling to improve in the future once PersistedCache is
combined with DataWorker, as the CachePolicy would execute from within the worker.

CachePolicies may also need to take into account that they might be asked about the
expiration of the same request twice: first by the primary in-memory cache handler,
and then again by the persisted-cache handler should the in-memory cache not handle the
request.

Prior to the second inquiry, the document will be loaded into the in-memory cache so
that the CachePolicy can be applied to it.

### Cache Header

Responses served from indexeddb will have the header `X-WarpDrive-Cache: IndexedDB`
