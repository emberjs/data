---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/adapter/error/variables/ForbiddenError.md
---

&#x20;

# &#x20;ForbiddenError

```ts
ForbiddenError: AdapterRequestErrorConstructor<ForbiddenError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:384](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/adapter/error.ts#L384)

A `ForbiddenError` equates to an HTTP `403 Forbidden` response status.
It is used by an adapter to signal that a request to the external API was
valid but the server is refusing to respond to it. If authorization was
provided and is valid, then the authenticated user does not have the
necessary permissions for the request.

Unlike an [UnauthorizedError](UnauthorizedError.md), retrying the request with different
credentials will not help; the currently authenticated user simply lacks
permission. An example use case would be to show the user a "you don't
have access to this" message rather than redirecting them to log in:

```js [app/routes/application.js]
import { ForbiddenError } from '@warp-drive/legacy/adapter/error';

export default class ApplicationRoute extends Route {
  @action
  error(error, transition) {
    if (error instanceof ForbiddenError) {
      this.transitionTo('forbidden');
      return;
    }

    // ...other error handling logic
  }
}
```
