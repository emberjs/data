---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/adapter/error/variables/UnauthorizedError.md
---

&#x20;

# &#x20;UnauthorizedError

```ts
UnauthorizedError: AdapterRequestErrorConstructor<UnauthorizedError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:346](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/adapter/error.ts#L346)

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
