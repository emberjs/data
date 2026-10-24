---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/build-config/debugging/variables/LOG_CACHE.md
description: >-
  Debug logging flag that logs cache updates to both local and remote state; it
  replaces `LOG_PAYLOADS`, `LOG_OPERATIONS`, and `LOG_MUTATIONS`.
---

# &#x20;LOG\_CACHE&#x20;

```ts
const LOG_CACHE: boolean;
```

Defined in: [warp-drive-packages/build-config/src/debugging.ts:25](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/build-config/src/debugging.ts#L25)

log cache updates for both local
and remote state. Note in some older versions
this was called `LOG_PAYLOADS` and was one
of three flags that controlled logging of
cache updates. This is now the only flag.

The others were `LOG_OPERATIONS` and `LOG_MUTATIONS`.
