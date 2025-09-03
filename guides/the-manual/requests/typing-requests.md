---
order: 1
---

# Typing Requests

Use [withResponseType](/api/@warp-drive/core/request/functions/withResponseType) to supply the response type.

```ts
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withResponseType } from '@warp-drive/core/request'; // [!code focus]

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

const result = await store.request(
  withResponseType<ReactiveDataDocument<User>>({ // [!code focus:3]
    url: '/users/1'
  })
);

// [!code focus:2]
result.content.data.firstName; // will have type string
```

When using the component API, if the templating syntax does not allow typescript
generics, create a builder function.

```glimmer-ts
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withResponseType } from '@warp-drive/core/request';

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

function getUser() { // [!code focus:5]
  return withResponseType<ReactiveDataDocument<User>>({
    url: '/users/1'
  });
}

export default <template>
  <Request @query={{(getUser)}}> <!-- [!code focus] -->
    <:content as |result|>
      <h1>Hello {{result.data.firstName}}!</h1>
    </:content>
  </Request>
</template>;
```

## How it works (for the curious)

`requestManager.request` and `store.request` each take a generic that can be used to set the return type of the content of the associated request.

```ts
interface Store {
  request<RT>(requestInit: RequestInfo<RT>): Future<RT>;
}
```

The `requestInit` param shares use of this generic, and its `RequestInfo`
type assigns its generic own arg to a special brand:

```ts
interface RequestInfo<RT> {
  [RequestSignature]: RT;
}
```

What this means is that any `requestInfo` param using this brand in its type
will enable the request method to infer the attached response signature due
to the shared generic. `withResponseType` adds this brand into your
object's type in a convenient way.

## Why This Approach?

Typing the response to a network request is inherently frail. Even in the best designed, integrated and tested systems the contract may drift.

By using a simple generic to enable providing the response type, we provide maximum
flexibility for apps to choose their own level of safety.

You might handroll types, or you might have intelligent tooling that constructs the type from the request (like GraphQL), or even tooling that compiles the type from your API specs. Perhaps you love libraries like ArkType, Valibot, or Zod.

Each of these comes with its own tradeoffs, but each can be made to provide this generic quite easily. Instead of selecting a tradeoff you probably would hate, we
have left that choice for you. This said, we recommend starting with builders and then exploring more advanced setups only if you still need once you've gotten your feet wet.
