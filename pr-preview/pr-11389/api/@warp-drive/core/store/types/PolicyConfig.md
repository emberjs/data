---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/store/types/PolicyConfig.md
description: >-
  Options for `DefaultCachePolicy`: soft and hard expiration times, header-based
  expiration constraints, and test-mode behavior.
---

# &#x20;PolicyConfig

```ts
interface PolicyConfig {
  apiCacheHardExpires: number;
  apiCacheSoftExpires: number;
  constraints?: PolicyConfigConstraints;
  disableTestOptimization?: boolean;
}
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:398](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L398)

The configuration options for the [DefaultCachePolicy](../classes/DefaultCachePolicy.md)

The [Advanced Store Configuration](/guides/configuration/advanced#decide-how-long-requests-are-valid-for-with-a-cachepolicy)
guide shows a policy configured with them.

```ts [app/services/store.ts]
import { Store } from '@warp-drive/core';
import { DefaultCachePolicy } from '@warp-drive/core/store'; // [!code focus]

export default class AppStore extends Store {
  lifetimes = new DefaultCachePolicy({ // [!code focus:3]
    // ... PolicyConfig Settings ... //
  });
}
```

## Properties

### apiCacheHardExpires

```ts
apiCacheHardExpires: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:426](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L426)

the number of milliseconds after which a request is considered
expired and should be re-fetched. If a request is issued again
after this time, the request will disregard the cache and
wait for a fresh response from the API.

This is calculated against the `date` header of the response.

If your API does not provide a `date` header, the [Fetch](../../variables/Fetch.md) handler
will automatically add it to responses if it is not present. Responses
without a `date` header will be considered hard expired immediately.

***

### apiCacheSoftExpires

```ts
apiCacheSoftExpires: number;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:412](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L412)

the number of milliseconds after which a request is considered
stale. If a request is issued again after this time, the request
will respond from cache immediately while a background request
is made to update the cache.

This is calculated against the `date` header of the response.

If your API does not provide a `date` header, the [Fetch](../../variables/Fetch.md) handler
will automatically add it to responses if it is not present. Responses
without a `date` header will be considered stale immediately.

***

### constraints?

```ts
optional constraints?: PolicyConfigConstraints;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:473](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L473)

In addition to the simple time-based expiration strategy, CachePolicy
supports various common server-supplied expiration strategies via
headers, as well as custom expiration strategies via the PolicyConfigConstraints.isExpired | isExpired
function.

Requests will be validated for expiration against these constraints.
If any of these constraints are not met, the request will be considered
expired. If all constraints are met, the request will be considered
valid and the time based expiration strategy will NOT be used.

Meeting a constraint means BOTH that the properties the constraint
requires are present AND that the expiration time indicated by those
properties has not been exceeded.

In other words, if the properties for a constraint are not present,
this does not count either as meeting or as not meeting the constraint,
the constraint simply does not apply.

The `isExpired` function is called with the request and should return
`true` if the request is expired, `false` if it is not expired, and
`null` if the expiration status is unknown.

In order constraints are checked:

* isExpired function
* ↳ (if null) X-WarpDrive-Expires header
* ↳ (if null) Cache-Control header
* ↳ (if null) Expires header

See PolicyConfigConstraints for configuration options.

***

### disableTestOptimization?

```ts
optional disableTestOptimization?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/default-cache-policy.ts:439](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/store/-private/default-cache-policy.ts#L439)

In Testing environments, the `apiCacheSoftExpires` will always be `false`
and `apiCacheHardExpires` will use the `apiCacheSoftExpires` value.

This helps reduce flakiness and produce predictably rendered results in test suites.

Requests that specifically set RequestInfo.cacheOptions.backgroundReload | cacheOptions.backgroundReload
will still be background reloaded in tests.

This behavior can be opted out of by setting this value to `true`.
