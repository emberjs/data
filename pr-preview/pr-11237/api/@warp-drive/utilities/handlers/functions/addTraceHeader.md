---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/utilities/handlers/functions/addTraceHeader.md
description: >-
  Sets an `X-Amzn-Trace-Id` header carrying a per-request id and the tab id, so
  requests can be traced to their browser tab.
---

# &#x20;addTraceHeader()

```ts
function addTraceHeader(headers: Headers): Headers;
```

Defined in: [-private/handlers/utils.ts:60](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/-private/handlers/utils.ts#L60)

Adds the `X-Amzn-Trace-Id` header to support observability
tooling around request routing.

This makes use of the [TAB\_ID](../variables/TAB_ID.md) and [TAB\_ASSIGNED](../variables/TAB_ASSIGNED.md)
to enable tracking the browser tab of origin across multiple requests.

Follows the template: `Root=1-${now}-${uuidv4};TabId=1-${epochSeconds}-${tab-uuid}`

## Parameters

### headers

[`Headers`](https://developer.mozilla.org/docs/Web/API/Headers)

## Returns

[`Headers`](https://developer.mozilla.org/docs/Web/API/Headers)
