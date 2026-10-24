---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/legacy/adapter/error/variables/TimeoutError.md
description: >-
  Legacy adapter error constructor for signaling that a request to the API timed
  out without receiving a response.
---

&#x20;

# &#x20;TimeoutError

```ts
TimeoutError: AdapterRequestErrorConstructor<TimeoutError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:293](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/legacy/src/adapter/error.ts#L293)

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
