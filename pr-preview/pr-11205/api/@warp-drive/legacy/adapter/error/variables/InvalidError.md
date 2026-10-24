---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/adapter/error/variables/InvalidError.md
---

&#x20;

# &#x20;InvalidError

```ts
InvalidError: AdapterRequestErrorConstructor<InvalidError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:203](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/adapter/error.ts#L203)

An `InvalidError` is used by an adapter to signal that the external API
was unable to process a request because the content was not semantically
correct or meaningful per the API. Usually, this means a record failed
some form of server-side validation. When a promise from an adapter is
rejected with an `InvalidError` the record will transition to the
`invalid` state and the errors will be set to the `errors` property on
the record.

For WarpDrive to correctly map errors to their corresponding properties
on the model, WarpDrive expects each error to be a valid {json:api} error
object with a `source.pointer` that matches the property name. For
example, if you had a `Post` model that looked like this:

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @attr('string') title;
  @attr('string') content;
}
```

To show an error from the server related to the `title` and `content`
properties your adapter could return a promise that rejects with an
`InvalidError` that looks like this:

```js [app/adapters/post.js]
import RSVP from 'RSVP';
import RESTAdapter from '@warp-drive/legacy/adapter/rest';
import { InvalidError } from '@warp-drive/legacy/adapter/error';

export default class ApplicationAdapter extends RESTAdapter {
  updateRecord() {
    // Fictional adapter that always rejects
    return RSVP.reject(new InvalidError([
      {
        detail: 'Must be unique',
        source: { pointer: '/data/attributes/title' }
      },
      {
        detail: 'Must not be blank',
        source: { pointer: '/data/attributes/content' }
      }
    ]));
  }
}
```

Your backend may use different property names for your records; the
store will attempt to extract and normalize the errors using the
serializer's `extractErrors` method before the errors get added to the
model. As a result, it is safe for the `InvalidError` to wrap the error
payload unaltered.
