---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/legacy/adapter/error/variables/AbortError.md
description: >-
  Legacy adapter error constructor for signaling that a request to the API was
  aborted before a response arrived.
---

&#x20;

# &#x20;AbortError

```ts
AbortError: AdapterRequestErrorConstructor<AbortError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:334](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/adapter/error.ts#L334)

An `AbortError` is used by an adapter to signal that a request to the
external API was aborted. For example, this can occur if the user
navigates away from the current page after a request to the external API
has been initiated but before a response has been received.

Because an aborted request is typically expected (the user chose to
navigate away, or a newer request superseded this one) rather than
exceptional, an example use case would be to silently ignore it instead
of surfacing an error to the user:

```js [app/routes/application.js]
import { AbortError } from '@warp-drive/legacy/adapter/error';

export default class ApplicationRoute extends Route {
  @action
  error(error, transition) {
    if (error instanceof AbortError) {
      // the request was aborted, nothing to report
      return;
    }

    // ...other error handling logic
  }
}
```
