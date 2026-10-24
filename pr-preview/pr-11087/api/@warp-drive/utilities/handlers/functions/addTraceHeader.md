---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/utilities/handlers/functions/addTraceHeader.md
---

# &#x20;addTraceHeader()

```ts
function addTraceHeader(headers: Headers): Headers;
```

Defined in: [-private/handlers/utils.ts:55](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/utilities/src/-private/handlers/utils.ts#L55)

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
