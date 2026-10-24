---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/guides/the-manual/requests/typing-requests.md
description: >-
  Type request responses with withResponseType and withReactiveResponse,
  including the ReactiveDataDocument meta, errors, and error-meta type params.
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

When using the component API, if the templating syntax does not allow TypeScript
generics, create a [builder](./builders.md) function.

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

## Typing Reactive Responses

Requests that return reactive responses wrap the primary resource data in a [ReactiveDocument](/api/@warp-drive/core/reactive/types/ReactiveDocument). In the case of an error, this will be a [ReactiveErrorDocument](/api/@warp-drive/core/reactive/types/ReactiveErrorDocument) and in the case of success it will be a [ReactiveDataDocument](/api/@warp-drive/core/reactive/types/ReactiveDataDocument)

A convenient utility is available for [typing these reactive responses](/api/@warp-drive/core/request/functions/withReactiveResponse).

:::tabs key:return-type

\== Lists

```ts
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/user';

function getUsers() {
  return withReactiveResponse<User[]>({
    url: '/users'
  })
);
```

\== Single Resources

```ts
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/user';

function getUser(id) {
  return withReactiveResponse<User>({
    url: `/users/id`
  })
);
```

\== Single Queries

```ts
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/user';

function getUser(id) {
  return  withReactiveResponse<User | null>({
    url: `/users/id`
  })
);
```

\== Polymorphic Lists

```ts
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/user';
import type { Organization } from '#/data/user';

function getUsers() {
  return withReactiveResponse<Array<User | Organization>>({
    url: '/users'
  })
);
```

:::

The equivalent using `withResponseType` and `ReactiveDataDocument` is below.

:::tabs key:return-type

\== Lists

```ts
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withResponseType } from '@warp-drive/core/request';
import type { User } from '#/data/user';

function getUsers() {
  return withResponseType<ReactiveDataDocument<User[]>>({
    url: '/users'
  })
);
```

\== Single Resources

```ts
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withResponseType } from '@warp-drive/core/request';
import type { User } from '#/data/user';

function getUser(id) {
  return withResponseType<ReactiveDataDocument<User>>({
    url: `/users/id`
  })
);
```

\== Single Queries

```ts
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withResponseType } from '@warp-drive/core/request';
import type { User } from '#/data/user';

function getUser(id) {
  return withResponseType<ReactiveDataDocument<User | null>>({
    url: `/users/id`
  })
);
```

\== Polymorphic Lists

```ts
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { withResponseType } from '@warp-drive/core/request';
import type { User } from '#/data/user';
import type { Organization } from '#/data/user';

function getUsers() {
  return withResponseType<ReactiveDataDocument<Array<User | Organization>>>({
    url: '/users'
  })
);
```

:::

## Typing the Document's `meta`

A reactive document also carries the response's [meta](https://jsonapi.org/format/#document-meta). By
default it is typed `Meta` — an arbitrary JSON object — so reading a key off it gives you `unknown`:

```ts
const { content } = await store.request(getUsers());

Number(content.meta?.total ?? 0); // meta.total is unknown
```

Both `ReactiveDataDocument` and `withReactiveResponse` take an optional second type param for the meta.
Supplying it also makes `meta` non-optional, so you stop writing `?.` for a key you just declared.
Leave it off and `meta` stays optional, which is what keeps a document type derivable — an interface
that re-declares `meta?:`, an intersection with `{ meta?: X }`, or a `class ... implements` all
continue to work:

```ts
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/user';

type PageMeta = {
  page: { limit: number; offset: number };
  total?: number;
};

function getUsers() {
  return withReactiveResponse<User[], PageMeta>({
    url: '/users'
  });
}

const { content } = await store.request(getUsers());
content.meta.total; // number
```

NOTE: The param must be a `type` alias rather than an `interface`. This is because `Meta` is an index-signature type, and
TypeScript gives implicit index signatures to aliases only, so an `interface` will not satisfy the
`M extends Meta | undefined` constraint.

Pass `PageMeta | undefined` instead if the endpoint only sometimes returns its `meta` — the default,
`Meta | undefined`, is that same shape with no keys named.

The builders in `@warp-drive/utilities` take the same param, so a builder can declare its own meta
without hand-writing the document type:

```ts
import { query } from '@warp-drive/utilities/json-api';
import type { User } from '#/data/user';

const options = query<User, PageMeta>('user', { page: { limit: 10 } });
const { content } = await store.request(options);

content.meta.page.limit; // number
```

`next`, `prev`, `first`, `last` and `fetch` carry the same meta type through to the document they
resolve with, since they hit the same endpoint.

An endpoint that returns only `meta` and no primary data — a `count`, for instance — has no
resource type to name. Pass `never` for the first param:

```ts
const options = withReactiveResponse<never, { total: number }>({ url: '/users/count' });
const { content } = await store.request(options);

content.meta.total; // number
```

## Typing Errors

The error variant of a document, [ReactiveErrorDocument](/api/@warp-drive/core/reactive/types/ReactiveErrorDocument),
exposes `errors`. The cache stores whatever the API sent without validating it, so by default the
type promises no shape — `errors` is `object[]`.

A third type param declares what the endpoint actually returns. The builders in
`@warp-drive/utilities/json-api` default it to
[ApiError](/api/@warp-drive/core/types/spec/error/types/ApiError), the
[{json:api} error object](https://jsonapi.org/format/#error-objects):

```ts
import { query } from '@warp-drive/utilities/json-api';

const { content } = await store.request(query<User>('user'));
const nextPage = await content.next(); // resolves with the document union

if (nextPage?.errors) {
  nextPage.errors[0].status; // string | undefined
  nextPage.errors[0].source?.pointer; // string | undefined
}
```

The `rest` and `active-record` builders leave it as `object`, since neither REST nor ActiveRecord
specifies an error shape. Supply your own when you know it:

```ts
type MyError = { code: string; message: string };

const options = withReactiveResponse<User[], PageMeta, MyError>({ url: '/users' });
```

### Typing the Error Document's `meta`

Because error responses may return different `meta` than successful responses, you can pass an optional fourth type param to type the
error document's `meta` separately (otherwise it will fall back to the same `meta` type as the success response):

```ts
type PageMeta = { page: { limit: number; offset: number } };
type ErrorMeta = { requestId: string };

type UsersDocument = ReactiveDataDocument<User[], PageMeta, ApiError, ErrorMeta>;
type UsersErrorDocument = ReactiveErrorDocument<User[], ErrorMeta, ApiError>;
```

You can access the error document through [getRequestState](/api/@warp-drive/core/reactive/functions/getRequestState),
which takes the error content type as an optional second param:

```ts
const future = store.request<UsersDocument>({ url: '/users' });
const state = getRequestState<UsersDocument, UsersErrorDocument>(future);

if (state.isError) {
  state.reason.content?.meta.requestId; // string | undefined
  state.reason.content?.errors[0].status; // string | undefined
}
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
