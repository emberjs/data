---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/skills/requests/write-a-request-builder.md
---
# Write a Request Builder

Use this skill whenever you're about to write a request for `store.request` or a `<Request />`
component, add a builder, or change one. A builder is a function that returns a request object.
Together, an app's builders are its SDK for its API, so write each one as a documented, typed,
reusable entry point, not a one-off object.

## Steps

1. Check whether the app already has a builder for this request before writing one. Look in the
   app's builders directory or package, often `builders/` or `#/builders`. If one exists, call it
   instead of writing a second way to make the same request.
2. Don't call the general-purpose builders in `@warp-drive/utilities` (`json-api`, `rest`,
   `active-record`) or `@warp-drive/legacy/compat/builders` directly from components or app code.
   They exist for migrating to the request pipeline and for getting started, and can't document or
   type what a specific request is for. When one fits the endpoint, call it inside your own
   specific builder, such as `getUser(id)` wrapping `findRecord('user', id)`.
3. Write the new builder, one exported function per file, in the app's builders directory.
   Keeping builders in one place is what lets the rest of the app, and other apps, find and reuse
   them.
4. Name it for what it does, following the app's existing convention: `getCompanyPreviewList`,
   `searchUsers`, `createContentLike`. The name is how other code discovers the builder through
   autocomplete.
5. Give it a doc comment describing its contract: what the request is for, the endpoint and method,
   what each argument means, what comes back, and how it is paged and sorted, using the API's own
   paging parameters. For a query, say which resource types make it stale when a record of that
   type is created, and set those types in `cacheOptions.types`. Editors show this comment at every
   call site.
6. Set the response type inside the builder, using a helper from `@warp-drive/core/request`. Use
   `withReactiveResponse<T>()` when the response holds resources with a registered schema, since
   those come back as a reactive document whose `data` is `T`. Use `withResponseType<T>()` for
   anything else, with `T` as the full response type. Never add the type at the call site,
   by calling `withResponseType` there or casting the result with `as`: that is a cast, and a
   builder is the only way to type a request without one.
7. Keep it pure, and make it produce the same RequestKey for the same arguments. Build query
   strings with `buildQueryParams` from `@warp-drive/utilities`, not by hand. For a `POST` or
   other non-`GET` query, set `cacheOptions.key` from a stable serialization of the arguments.
   Without a stable key, identical requests are neither deduplicated nor cached.
8. For a paginated collection, have the builder request the first page only. Don't add a `page`,
   `offset` or `cursor` argument: load later pages by following the response's `links`, with
   `next()` on the reactive document or the experimental pagination primitives. For a `POST` or
   `QUERY` whose server returns no links, the server should persist the query or encode it into a
   cursor link; if it can't, add a handler that generates the links, as described in
   [Paginating With Links](/guides/the-manual/requests/builders.md#paginating-with-links).
9. At the call site, pass the builder's result straight to `store.request(...)` or to the `query`
   argument of the `<Request />` component (`@query` in Ember).
   [Fetch and Cache Data](./fetch-and-cache-data.md) shows how to render the result. When
   several components need the same data, have each call the builder itself instead of loading it
   once and passing it down. Requests with a matching RequestKey share one response.

## Example

```ts
// builders/search-users.ts
import { withReactiveResponse } from '@warp-drive/core/request';
import { buildQueryParams } from '@warp-drive/utilities';
import type { UserPreview } from '#/data/types';

/**
 * Searches users by name or email.
 *
 * - Endpoint: `GET /api/users`
 * - Returns at most 20 {@link UserPreview}s, sorted by name, ascending.
 *
 * @param term text matched against the user's name and email
 */
export function searchUsers(term: string) {
  const params = buildQueryParams({ search: term, sort: 'name', 'page[limit]': 20 });
  return withReactiveResponse<UserPreview[]>({ url: `/api/users?${params}` });
}
```

## Related

* Full guide: [Builders](/guides/the-manual/requests/builders.md)
* Typing: [Typing Requests](/guides/the-manual/requests/typing-requests.md)
* Making the request once the builder exists: [Fetch and Cache Data](./fetch-and-cache-data.md)
