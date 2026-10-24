---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/skills/requests/fetch-and-cache-data.md
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

3. For a resource that already has a registered schema, prefer a builder over hand-writing the
   request. `findRecord` from `@warp-drive/utilities/json-api` is the built-in builder for
   fetching a single resource by type and id:

```ts
import { findRecord } from '@warp-drive/utilities/json-api';

const { content } = await store.request(findRecord('user', userId));
```

4. To reuse a request shape, write your own builder — a plain function returning a request
   object:

```ts
// builders/get-users.ts
export function getUsers() {
  return { url: '/api/users' };
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

## Notes

* `store.request` works with any resource type, not just ones with schemas registered — for
  unregistered types you get the raw response back rather than a reactive resource.
* A request's schema-backed resource must be registered first — see
  [Define a Resource Schema](/skills/schemas/define-a-resource-schema).

## Related

* Full guide: [Making Requests](/guides/the-manual/requests/index.md)
* Related skill: [Define a Resource Schema](/skills/schemas/define-a-resource-schema)
