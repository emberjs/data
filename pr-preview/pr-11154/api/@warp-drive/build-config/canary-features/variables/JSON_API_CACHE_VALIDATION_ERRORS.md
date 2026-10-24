---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/build-config/canary-features/variables/JSON_API_CACHE_VALIDATION_ERRORS.md
---

# &#x20;JSON\_API\_CACHE\_VALIDATION\_ERRORS&#x20;

```ts
const JSON_API_CACHE_VALIDATION_ERRORS: boolean | null = false;
```

Defined in: [canary-features.ts:138](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/build-config/src/canary-features.ts#L138)

This upcoming feature adds a validation step to payloads received
by the JSONAPICache implementation.

When a request completes and the result is given to the cache via
`cache.put`, the cache will validate the payload against registered
schemas as well as the JSON:API spec.
