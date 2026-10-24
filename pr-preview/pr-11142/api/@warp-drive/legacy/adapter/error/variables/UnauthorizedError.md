---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/legacy/adapter/error/variables/UnauthorizedError.md
description: >-
  Legacy adapter error constructor for an HTTP 401 response, signaling that
  authorization is required and failed or was not provided.
---

&#x20;

# &#x20;UnauthorizedError

```ts
UnauthorizedError: AdapterRequestErrorConstructor<UnauthorizedError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:378](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/legacy/src/adapter/error.ts#L378)

A `UnauthorizedError` equates to an HTTP `401 Unauthorized` response
status. It is used by an adapter to signal that a request to the external
API was rejected because authorization is required and has failed or has
not yet been provided.

An example use case would be to redirect the user to a login route if a
request is unauthorized:

```js [app/routes/application.js]
import { UnauthorizedError } from '@warp-drive/legacy/adapter/error';

export default class ApplicationRoute extends Route {
  @action
  error(error, transition) {
    if (error instanceof UnauthorizedError) {
      // go to the login route
      this.transitionTo('login');
      return;
    }

    // ...other error handling logic
  }
}
```
