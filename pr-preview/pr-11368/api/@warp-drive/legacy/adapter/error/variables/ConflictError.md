---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/legacy/adapter/error/variables/ConflictError.md
description: >-
  Legacy adapter error constructor for an HTTP 409 response, signaling that the
  request conflicts with existing server state, such as a duplicate
  client-generated id.
---

&#x20;

# &#x20;ConflictError

```ts
ConflictError: AdapterRequestErrorConstructor<ConflictError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:512](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/legacy/src/adapter/error.ts#L512)

A `ConflictError` equates to an HTTP `409 Conflict` response status.
It is used by an adapter to indicate that the request could not be
processed because of a conflict in the request. An example scenario
would be when creating a record with a client-generated ID but that ID
is already known to the external API.

An example use case would be to surface a conflict-specific message so
the user can retry with different input:

```js [app/routes/application.js]
import { ConflictError } from '@warp-drive/legacy/adapter/error';

export default class ApplicationRoute extends Route {
  @action
  error(error, transition) {
    if (error instanceof ConflictError) {
      alert('That identifier is already in use, please choose another.');
      return;
    }

    // ...other error handling logic
  }
}
```
