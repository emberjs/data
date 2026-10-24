---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/legacy/adapter/error/variables/TimeoutError.md
---

&#x20;

# &#x20;TimeoutError

```ts
TimeoutError: AdapterRequestErrorConstructor<TimeoutError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:270](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter/error.ts#L270)

A `TimeoutError` is used by an adapter to signal that a request to the
external API has timed out, i.e. no response was received from the
external API within an allowed time period.

An example use case would be to warn the user to check their internet
connection if an adapter operation has timed out:

```js [app/routes/application.js]
import { TimeoutError } from '@warp-drive/legacy/adapter/error';

export default class ApplicationRoute extends Route {
  @action
  error(error, transition) {
    if (error instanceof TimeoutError) {
      // alert the user
      alert('Are you still connected to the Internet?');
      return;
    }

    // ...other error handling logic
  }
}
```
