---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/utilities/handlers/functions/assertInvalidUrlLength.md
description: >-
  Dev-mode assertion that throws when a URL is longer than `MAX_URL_LENGTH`,
  suggesting a `POST` or `QUERY` request instead.
---

# &#x20;assertInvalidUrlLength()

```ts
function assertInvalidUrlLength(url: string | undefined): void;
```

Defined in: [-private/handlers/utils.ts:85](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/utilities/src/-private/handlers/utils.ts#L85)

This assertion takes a URL and throws an error if the URL is longer than the maximum URL length.

See also [MAX\_URL\_LENGTH](../variables/MAX_URL_LENGTH.md)

## Parameters

### url

`string` | `undefined`

## Returns

`void`
