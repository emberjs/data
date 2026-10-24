---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/adapter/error/variables/AbortError.md
---

&#x20;

# &#x20;AbortError

```ts
AbortError: AdapterRequestErrorConstructor<AbortError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:307](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/error.ts#L307)

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
