---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/skills/requests/fetch-and-cache-data.md
---
# Fetch and Cache Data

Use this skill when you need to fetch remote data through the WarpDrive `Store` so that the
result is cached, deduplicated, and reactively available to the rest of the app.

## Steps

1. Call `store.request(requestInfo)` with a plain request object (`url`, optional `method`,
   `headers`, `body`).
2. Await the result and read `.content` off of it.

```ts
const { content } = await store.request({ url: '/api/users' });
```

3. Prefer a builder over hand-writing the request. `findRecord` from
   `@warp-drive/utilities/json-api` is a general-purpose builder for fetching a single resource by
   type and id. It is fine for getting started, but in a mature app wrap it in a specific builder,
   as step 4 describes, instead of calling it from the app directly:

```ts
import { findRecord } from '@warp-drive/utilities/json-api';

const { content } = await store.request(findRecord('user', userId));
```

4. For any other request, call the app's own builder for it, or write one — a documented, typed
   function in the app's builders directory that returns a request object. Follow
   [Write a Request Builder](./write-a-request-builder.md) when writing or changing one; don't
   write a request object inline at the call site.

```ts
// builders/get-users.ts
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/types';

/**
 * Gets every user. Endpoint: `GET /api/users`
 */
export function getUsers() {
  return withReactiveResponse<User[]>({ url: '/api/users' });
}

// elsewhere
import { getUsers } from '#/builders/get-users.ts';
const { content } = await store.request(getUsers());
```

## In a component (reactive control flow)

Prefer the `<Request />` component (Ember) or `useQuery`-style hooks (React) over manual
`await` + local loading state — this gets automatic loading/error states and cleanup on
unmount for free:

```gts
import { Request } from '@warp-drive/ember';
import { findRecord } from '@warp-drive/utilities/json-api';

<template>
  <Request @query={{findRecord "user" @userId}}>
    <:content as |result|>Hello {{result.data.name}}!</:content>
    <:loading>Loading…</:loading>
    <:error as |error state|>
      <button {{on "click" state.retry}}>Try Again</button>
    </:error>
  </Request>
</template>
```

To read the request's state in JavaScript instead, pass the `Future` that `store.request` returns
to `getRequestState` from `@warp-drive/ember`. Cache the request with `@cached`: a plain getter
calls `store.request` again on every read.

```ts
import { cached } from '@glimmer/tracking';
import { getRequestState } from '@warp-drive/ember';
import { findRecord } from '@warp-drive/utilities/json-api';

// inside a component with `@service declare store: Store;`
@cached
get userRequest() {
  return this.store.request(findRecord('user', this.args.userId));
}

get user() {
  return getRequestState(this.userRequest).value?.data;
}
```

For a promise that doesn't come from `store.request`, use `getPromiseState` or the `<Await />`
component from `@warp-drive/ember` instead. Both take any promise. See
[Async as Reactive State](/guides/the-manual/reactivity/derivation.md).

## Notes

* `store.request` works with any resource type, not just ones with schemas registered — for
  unregistered types you get the raw response back rather than a reactive resource.
* A request's schema-backed resource must be registered first — see
  [Define a Resource Schema](/skills/schemas/define-a-resource-schema).

## Related

* Full guide: [Making Requests](/guides/the-manual/requests/index.md)
* Reactive state for requests: [Reactive Control Flow](/guides/the-manual/reactivity/control-flow.md)
* Related skill: [Define a Resource Schema](/skills/schemas/define-a-resource-schema)
