---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/adapter/error/variables/NotFoundError.md
---

&#x20;

# &#x20;NotFoundError

```ts
NotFoundError: AdapterRequestErrorConstructor<NotFoundError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:424](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/error.ts#L424)

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
