---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/compat/functions/pushPayload.md
---

&#x20;

# &#x20;pushPayload()

```ts
function pushPayload(
   this: Store$1, 
   modelName: string, 
   inputPayload: ObjectValue
): void;
```

Defined in: [warp-drive-packages/legacy/src/compat.ts:305](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/compat.ts#L305)

Push some raw data into the store.

This method can be used both to push in brand new
records, as well as to update existing records. You
can push in more than one type of object at once.
All objects should be in the format expected by the
serializer.

```js [app/serializers/application.js]
import RESTSerializer from '@warp-drive/legacy/serializer/rest';

export default class ApplicationSerializer extends RESTSerializer;
```

```js
let pushData = {
  posts: [
    { id: 1, postTitle: "Great post", commentIds: [2] }
  ],
  comments: [
    { id: 2, commentBody: "Insightful comment" }
  ]
}

store.pushPayload(pushData);
```

By default, the data will be deserialized using a default
serializer (the application serializer if it exists).

Alternatively, `pushPayload` will accept a model type which
will determine which serializer will process the payload.

```js [app/serializers/application.js]
import RESTSerializer from '@warp-drive/legacy/serializer/rest';

 export default class ApplicationSerializer extends RESTSerializer;
```

```js [app/serializers/post.js]
import JSONSerializer from '@warp-drive/legacy/serializer/json';

export default JSONSerializer;
```

```js
store.pushPayload(pushData); // Will use the application serializer
store.pushPayload('post', pushData); // Will use the post serializer
```

## Parameters

### this

`Store$1`

### modelName

`string`

Optionally, a model type used to determine which serializer will be used

### inputPayload

[`ObjectValue`](../../../core/types/json/raw/types/ObjectValue.md)

## Returns

`void`
