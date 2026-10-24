---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/legacy/adapter/error/variables/NotFoundError.md
description: >-
  Legacy adapter error constructor for an HTTP 404 response, signaling that the
  requested resource does not exist on the API.
---

&#x20;

# &#x20;NotFoundError

```ts
NotFoundError: AdapterRequestErrorConstructor<NotFoundError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:466](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/legacy/src/adapter/error.ts#L466)

A `NotFoundError` equates to an HTTP `404 Not Found` response status.
It is used by an adapter to signal that a request to the external API
was rejected because the resource could not be found on the API.

An example use case would be to detect if the user has entered a route
for a specific model that does not exist. For example:

```js [app/routes/post.js]
import { NotFoundError } from '@warp-drive/legacy/adapter/error';

export default class PostRoute extends Route {
  @service store;
  model(params) {
    return this.store.findRecord('post', params.post_id);
  }
  @action
  error(error, transition) {
    if (error instanceof NotFoundError) {
      // redirect to a list of all posts instead
      this.transitionTo('posts');
    } else {
      // otherwise let the error bubble
      return true;
    }
  }
}
```
