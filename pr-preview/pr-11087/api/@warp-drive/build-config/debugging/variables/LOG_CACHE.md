---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/build-config/debugging/variables/LOG_CACHE.md
---

# &#x20;LOG\_CACHE&#x20;

```ts
const LOG_CACHE: boolean = false;
```

Defined in: [debugging.ts:21](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/build-config/src/debugging.ts#L21)

log cache updates for both local
and remote state. Note in some older versions
this was called `LOG_PAYLOADS` and was one
of three flags that controlled logging of
cache updates. This is now the only flag.

The others were `LOG_OPERATIONS` and `LOG_MUTATIONS`.
