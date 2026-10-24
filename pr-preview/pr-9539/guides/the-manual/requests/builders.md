---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/guides/the-manual/requests/builders.md
description: >-
  Write documented, well-named builder functions that form a typed,
  cross-framework SDK for your API, produce stable RequestKeys, and drive the
  Request component and your own components.
---

# Builders

A builder is a function that returns a [request object](/api/@warp-drive/core/types/request/types/RequestInfo),
the object you hand to `store.request`. It does not send the request or talk to the network; it
describes one: the `url`, `method`, `headers` and `body`, how the response should be cached, and
what type the response has.

A builder doesn't need to be complex. Often it only returns an object with a `url`:

```ts [builders/get-current-user.ts]
export function getCurrentUser() {
  return { url: '/api/users/me' };
}
```

Most builders add a little more: a doc comment describing the endpoint, and the type of its
response.

```ts [builders/get-current-user.ts]
import { withReactiveResponse } from '@warp-drive/core/request';
import type { User } from '#/data/types';

/**
 * Gets the user who is signed in to this session.
 *
 * - Endpoint: `GET /api/users/me`
 */
export function getCurrentUser() {
  return withReactiveResponse<User>({ url: '/api/users/me' });
}
```

```ts
import { getCurrentUser } from '#/builders/get-current-user.ts';

const { content } = await store.request(getCurrentUser());
```

## An SDK For Your API

Taken together, an app's builders are its SDK: the one place that says how the app talks to each
of its endpoints and why. The rest of the app asks for data by calling a builder, and never needs
to know how the request behind it is put together.

A builder captures intent. `getCompanyPreviewList(search)` says what the caller wants. The builder
knows that the endpoint is a `QUERY` sent as a `POST`, which fields and related resources a preview
needs, how the results are paged and sorted, and which cached requests go stale when a company is
created. That knowledge is business logic, and a builder keeps it in one place instead of spreading
it across every component that shows a company.

A request object written inline where it is used can't do any of this. A named function can:

* **It documents its contract.** A doc comment on the builder can say what the endpoint does, what
  each argument means, what comes back, how it is paged, and what it invalidates. Editors show that
  comment wherever the builder is used.
* **It can be found by name.** Type `get` in an editor and autocomplete lists the requests the app
  knows how to make. A name like `getCompanyPreviewList` tells a reader what the request is for
  before they open it.
* **It is reusable.** The same builder serves every component that needs the data, both the JS API
  and the Component API, and your test suite.
* **It works in any framework.** A builder is a plain function with no framework imports, so the
  same SDK works in Ember, React, Vue, Svelte, or plain JavaScript, and can be shared by apps
  built on different frameworks.

Give every request a builder, even one that is only issued once. It costs one function, and it makes
the request easy to find, test, review, and change later.

## Writing Builders

A set of builders is only useful as an SDK if readers can find a builder and trust what it says.

* **Document every builder.** Describe what the request is for and how the endpoint behaves: its
  arguments, what it returns, paging, sorting, permissions, and which cached requests it invalidates.
* **Give it a name that says what it does**, such as `getCompanyPreviewList` or `createContentLike`.
  Name builders after either your endpoints or your business logic, and pick one convention for the
  whole SDK.
* **Keep builders in one place**, such as a `builders/` directory or their own package, so the whole
  SDK can be browsed, reused across the app, and shared with other apps.
* **Keep builders pure.** The same arguments should always produce the same request.
* **Set the [response type](./typing-requests.md)** on the request object a builder returns.
* **Rarely rely on [Handlers](./handlers.md)** to add information the request can't work without.
  Handlers are for concerns that apply to many requests, such as authentication.

Here's a builder that follows those rules.

#### Get A List Of Partial Data

Say a feature shows a searchable, paginated, sorted list of companies. The request loads only the few
company fields the list shows, plus a small subset of the related data for each company's CEO and
headquarters. The endpoint is a `QUERY` sent using the http `POST` method, and you want its results
cached so that repeated searches are deduplicated.

:::tabs

\== Builder

```ts [builders/get-company-preview-list.ts]
import { withReactiveResponse } from '@warp-drive/core/request';
import type { CompanyPreview } from '#/data/types';

/**
 * Searches companies by name and returns the first page of
 * {@link CompanyPreview}s, each with its CEO and headquarters.
 *
 * - Endpoint: `QUERY /companies`, sent as a `POST` with the
 *   `X-HTTP-METHOD-OVERRIDE` header.
 * - Sorted alphabetically by name, ascending.
 * - Paginated, 25 companies per page; this builder requests the first
 *   page, and later pages are loaded by following the response's links.
 * - Loads only the fields a preview renders.
 * - Cached by search text, and invalidated whenever a company is created.
 *
 * @param search text matched against the company name
 */
export function getCompanyPreviewList(search: string) {
  const url = `/companies`;
  const body = JSON.stringify({
    search,
    include: ['ceo', 'headquarters'],
    fields: {
      company: ['name', 'ceo', 'headquarters'],
      user: ['name', 'title'],
      address: ['city', 'state']
    },
    page: {
      offset: 0,
      limit: 25,
    },
    sort: ['name:asc']
  });
  // the body's keys are always written in the same order, so this key is stable
  const cacheKey = `${url}::${body}`;

  return withReactiveResponse<CompanyPreview[]>({
    url,
    method: 'POST',
    cacheOptions: {
      key: cacheKey,
      // invalidate this query if new companies are created
      types: ['company']
    },
    headers: {
      'X-HTTP-METHOD-OVERRIDE': 'QUERY'
    },
    body
  });
}
```

\== Supporting Types

```ts [types/companyPreview.ts]
import { Type } from '@warp-drive/core/types/symbols';
import { Mask } from '@warp-drive/core/types/record';
import type { User, Address, Company } from '#/data/types';

/**
 * The subset of User fields the CompanyPreview request
 * returns.
 */
export type UserPreview = Pick<User, typeof Type | 'name' | 'title'>;

/**
 * The subset of Address fields the CompanyPreview request
 * returns.
 */
export type AddressPreview = Pick<Address, typeof Type | 'city' | 'state'>;

/**
 * The subset of Company fields this request
 * returns.
 */
export type CompanyPreview = Mask<
  { ceo: UserPreview; headquarters: AddressPreview; },
  Pick<Company, typeof Type | 'name' | 'ceo' | 'headquarters'>
>;

```

\== Usage

```ts [Ember]
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { Request } from '@warp-drive/ember';
import { getCompanyPreviewList } from '#/builders/get-company-preview-list.ts';

export default class CompanyPreviewList extends Component<{ Args: { search: string } }> {
  @cached
  get searchQuery() {
    return getCompanyPreviewList(this.args.search);
  }

  <template>
    <Request @query={{this.searchQuery}}>
      <:content as |companies|>
        <ul>
        {{#each companies.data as |company|}}
          <li>
            {{company.name}} - {{company.ceo.name}}<br>
            {{company.headquarters.city}}, {{company.headquarters.state}}
          </li>
        {{/each}}
        </ul>
      </:content>
    </Request>
  </template>
}
```

:::

## Typed Requests Without Casting

A builder is the only way to give a request a response type without a cast. Call
[withResponseType](/api/@warp-drive/core/request/functions/withResponseType) or
[withReactiveResponse](/api/@warp-drive/core/request/functions/withReactiveResponse) inside the
builder, and every caller gets the type through inference. The type is declared once, next to the
endpoint it describes, as part of the builder's contract.

Adding the type anywhere else is a cast. That includes calling `withResponseType` inline where the
request is made, or writing `as` on the result: the caller asserts a type for a request it didn't
define, and nothing keeps that assertion in step with the endpoint. Templating syntaxes that don't
accept TypeScript generics can't express a cast at all, while a builder's type reaches `<Request />`
the same way it reaches `store.request`.

[Typing Requests](./typing-requests.md) covers the response, `meta`, and error types a builder can
declare.

## Cache Keys for Requests

In order for two requests to be considered the same, their [RequestKey](/api/@warp-drive/core/types/identifier/types/RequestKey), also called the CacheKey, must match. For GET requests
the `RequestKey` is typically the `url`, while queries issued using a `POST` request (or other means)
may need to explicitly set [cacheOptions.key](/api/@warp-drive/core/types/request/types/CacheOptions#key).

For the `url` case, this means that the order and formatting of [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) must be the same for a match to occur. Similarly, when
`cacheOptions.key` is used sorting and order of the information being used to produce the string key
must be considered.

A naive approach to stringifying params or request bodies to use as keys will result in otherwise identical requests failing to match due to mismatched strings. See below for an example of what
we mean.

:::tabs

\== Different Value Order

```ts
"https://example.com/api/users?ids=1,2"
"https://example.com/api/users?ids=2,1"
```

\== Different Param Order

```ts
"https://example.com/api/users?name=Chris&title=Engineer"
"https://example.com/api/users?title=Engineer&name=Chris"
```

\== Different Key Order

```ts
const key1 = JSON.stringify({ search: { name: 'Chris', title: 'Engineer' } });
// => '{"search":{"name":"Chris","title":"Engineer"}}'
const key2 = JSON.stringify({ search: { title: 'Engineer', name: 'Chris',  } });
// => '{"search":{"title":"Engineer","name":"Chris"}}'
```

\== Different Encoding

```ts
"https://example.com/api/users?ids=1,2"
"https://example.com/api/users?ids=1%2C2"
"https://example.com/api/users?ids[]=1&ids[]=2"
```

:::

Unlike most other aspects of a request which can be adjusted by a handler if needed, the CacheKey must
be provided at the point of request and cannot be updated or set later. This means providing a CacheKey
(or electing not to provide one) is one of a builder's biggest responsibilities.

:::tip 💡 TIP
Read the [caching](../caching/index.md#determining-the-cachekey-and-checking-if-the-response-is-stale) section of the manual to understand how this CacheKey is used.
:::

Simply using a builder does a significant amount towards ensuring a stable RequestKey, because the order
in which the url is built and params are assigned will be the same each time. But sometimes that isn't
enough, and when it is not the following utilities will come in handy:

* [sortQueryParams](/api/@warp-drive/utilities/functions/sortQueryParams)
* [buildQueryParams](/api/@warp-drive/utilities/functions/buildQueryParams)
* [filterEmpty](/api/@warp-drive/utilities/functions/filterEmpty)

:::tip 💡 TIP
All three sort and filter *copies*. The params you hand them are never mutated, so it is safe to
pass state you also render — a tracked array of filter values, say — without the act of building a
request reordering what the user sees.
:::

### Request The Same Data Anywhere

A stable RequestKey means you don't have to load data in one component and pass it down to the
others. Any component that needs the current user can call `getCurrentUser()` itself. While a
request is in flight, other requests with the same RequestKey wait on it instead of starting their
own, so the network sees one request however many components make it. Once the response is cached,
later calls are served from the cache until the [CachePolicy](../caching/index.md) considers it
stale.

Here, the page header and a settings panel several components below it each ask for the current
user, and neither receives it as an argument.

::: code-group

```glimmer-ts [Ember]
import { Request } from '@warp-drive/ember';
import { getCurrentUser } from '#/builders/get-current-user.ts';

// app/components/app-header.gts
export const AppHeader = <template>
  <Request @query={{(getCurrentUser)}}>
    <:content as |result|>Signed in as {{result.data.name}}</:content>
  </Request>
</template>;

// app/components/settings/email-preferences.gts
export const EmailPreferences = <template>
  <Request @query={{(getCurrentUser)}}>
    <:content as |result|>Emails are sent to {{result.data.email}}</:content>
  </Request>
</template>;
```

```tsx [React]
import { Request } from '@warp-drive/react';
import { getCurrentUser } from '#/builders/get-current-user.ts';

// app/components/app-header.tsx
export function AppHeader() {
  return <Request
    query={getCurrentUser()}
    states={{
      content: ({ result }) => <>Signed in as {result.data.name}</>,
    }}
  />;
}

// app/components/settings/email-preferences.tsx
export function EmailPreferences() {
  return <Request
    query={getCurrentUser()}
    states={{
      content: ({ result }) => <>Emails are sent to {result.data.email}</>,
    }}
  />;
}
```

```ts [JS API (any framework)]
import { getCurrentUser } from '#/builders/get-current-user.ts';
import { store } from '#/data/store.ts';

// Two unrelated parts of the app request the same data at the same time.
const [header, settings] = await Promise.all([
  store.request(getCurrentUser()),
  store.request(getCurrentUser()),
]);

// The network saw one request, and both results hold the same user.
header.content.data === settings.content.data; // true
```

```.svelte [Svelte]
Coming Soon!
```

```.vue [Vue]
Coming Soon!
```

:::

This only works when the RequestKey is the same every time, which is why producing a stable one is
a builder's job. A request with no RequestKey, such as a `POST` that doesn't set
`cacheOptions.key`, is neither deduplicated nor cached.

## Paginating With Links

A builder for a paginated collection requests the first page and nothing more. It doesn't take a
`page`, `offset` or `cursor` argument. The response to that first request should carry `links`
to the pages around it, and every later page is loaded by following one of them.

```ts
import { searchUsers } from '#/builders/search-users.ts';
import { store } from '#/data/store.ts';

// a GET builder whose endpoint returns links with each page
const { content: firstPage } = await store.request(searchUsers('ada'));

// follows firstPage.links.next, resolving to null when there is no next page
const secondPage = await firstPage.next();
```

The response's [ReactiveDocument](/api/@warp-drive/core/reactive/types/ReactiveDocument) exposes
`links` and `meta`, and its `next()`, `prev()`, `first()` and `last()` methods request the
matching link.

Paginating this way keeps pagination out of the builder's contract:

* **The server owns the paging scheme.** Whether the API pages by number, offset, cursor or
  keyset, the builder's signature stays the same, and a change to that scheme doesn't ripple
  through every place the app calls the builder.
* **Every page is keyed by its link.** A link is a `GET` URL, so each page gets a stable
  RequestKey without the builder computing one, and two components following the same link
  share one request.
* **The app never rebuilds a request.** Code that loads the next page doesn't need to remember
  the search text, filters, fields and sort that the first page was requested with. They are
  already in the link.
* **Pagination utilities work unchanged.** The experimental
  [Pagination](../experiments/pagination.md) primitives, such as
  [getPaginationState](/api/@warp-drive/experiments/pagination/functions/getPaginationState), and
  the Ember [`<Paginate />`](/api/@warp-drive/ember/experiments/classes/Paginate) component turn a
  first-page request into a numbered pager or an infinite list by following these links. Most
  apps with paginated lists will want them.

If your API doesn't return links for a `GET` collection yet, a
[handler](./handlers.md) can add them to each response before it reaches the cache, because
everything it needs is in the request's URL.

### Paginating A `POST` Or `QUERY` Request

Requests like `getCompanyPreviewList` above, which send their query in the body of a `POST` (or
an http `QUERY`), are harder. A link is a URL, and a URL has no body, so the server has nothing
it can put in a `next` link that means "the same query, 25 results further on".

The recommended fix is on the server: have it return links anyway, by making the query
addressable by URL. There are two common ways to do that.

* **Persist the query.** When the server receives the first `POST`, it stores the query body
  under an id, such as a hash of the normalized body, and returns links that name that id
  instead of repeating the body:

  ```json
  {
    "data": [],
    "links": {
      "self": "/companies/queries/7f3a9c?page[offset]=0&page[limit]=25",
      "next": "/companies/queries/7f3a9c?page[offset]=25&page[limit]=25"
    }
  }
  ```

  Following `next` is a plain `GET`. The server looks up the stored query by its id and applies
  the page parameters from the URL. Hashing the body means the same query always maps to the same
  id, so the server stores it once however many times it is run; include the user in the hash, or
  check access on every page, when results depend on who is asking. A stored query only needs to
  outlive how long a client might keep paging through the results. Once it expires, a request for
  one of its links should fail with an error the app can handle by requesting the first page
  again.
* **Encode the continuation into the link.** A server that can't store queries can serialize
  what it needs to resume, such as the query and the position of the last result returned, into
  an opaque, signed cursor, and return a link like `/companies/search?cursor=eyJxIjp7...`. This
  keeps the server stateless, at the cost of longer URLs.

Either way, the builder stays exactly as written above, and the app pages through the results
with `next()` like any other collection.

When the server can't do either, a handler can generate links on the client instead: it
remembers each `POST` it sends, gives the response a `next` link naming it, and turns a request
for that link back into a `POST` for the following page.
[Paginating `POST` Queries With A Handler](../cookbook/paginating-post-queries.md) walks through
one. Treat it as a fallback, not a first choice: links generated on the client exist only in the
app's memory, so they can't be bookmarked, shared or restored after a reload the way server links
can.

## Passing Builders To Components

Because a builder returns a plain object, its result can be passed anywhere a request is expected.

The most common place is the `@query` argument of the `<Request />` component
([Ember](/api/@warp-drive/ember/classes/Request), [React](/api/@warp-drive/react/functions/Request)),
as the examples above show. [Reactive Control Flow](../reactivity/control-flow.md) covers the
states it renders.

The same pattern works for your own components. A select, tree, or table can take a request as an
argument and use it to load its options, children, or rows. The component knows how to render the
data without knowing which endpoint it comes from, and the parent decides what to load by choosing
the builder.

:::tabs

\== Builder

```ts [builders/search-users.ts]
import { withReactiveResponse } from '@warp-drive/core/request';
import { buildQueryParams } from '@warp-drive/utilities';
import type { User } from '#/data/types';

/**
 * Searches active users by name or email, for pickers such as `UserSelect`.
 *
 * - Endpoint: `GET /api/users`
 * - Returns at most 20 {@link User}s, sorted by name, ascending.
 * - Deactivated users are never returned.
 *
 * @param term text matched against the user's name and email
 */
export function searchUsers(term: string) {
  const params = buildQueryParams({
    search: term,
    'filter[active]': true,
    sort: 'name',
    'page[limit]': 20,
  });

  return withReactiveResponse<User[]>({ url: `/api/users?${params}` });
}
```

\== Usage

::: code-group

```glimmer-ts [Ember]
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { searchUsers } from '#/builders/search-users.ts';
import { UserSelect } from '#/components/user-select.gts';

export default class AssignReviewer extends Component {
  @tracked term = '';

  updateTerm = (term: string) => (this.term = term);

  <template>
    <UserSelect @query={{searchUsers this.term}} @onSearch={{this.updateTerm}} />
  </template>
}
```

```tsx [React]
import { useState } from 'react';
import { searchUsers } from '#/builders/search-users.ts';
import { UserSelect } from '#/components/user-select.tsx';

export function AssignReviewer() {
  const [term, setTerm] = useState('');

  return <UserSelect query={searchUsers(term)} onSearch={setTerm} />;
}
```

```.svelte [Svelte]
Coming Soon!
```

```.vue [Vue]
Coming Soon!
```

\== Component

::: code-group

```glimmer-ts [Ember]
import type { TOC } from '@ember/component/template-only';
import { on } from '@ember/modifier';
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import type { RequestInfo } from '@warp-drive/core/types/request';
import { Request } from '@warp-drive/ember';
import type { User } from '#/data/types';

interface UserSelectSignature {
  Args: {
    /** the request that loads the options, usually a builder's result */
    query: RequestInfo<ReactiveDataDocument<User[]>>;
    onSearch: (term: string) => void;
  };
}

const updateSearch = (onSearch: (term: string) => void) => (event: Event) =>
  onSearch((event.target as HTMLInputElement).value);

export const UserSelect: TOC<UserSelectSignature> = <template>
  <input type="search" {{on "input" (updateSearch @onSearch)}} />
  <Request @query={{@query}}>
    <:loading>Searching…</:loading>
    <:content as |result|>
      <select>
        {{#each result.data as |user|}}
          <option value={{user.id}}>{{user.name}}</option>
        {{/each}}
      </select>
    </:content>
  </Request>
</template>;
```

```tsx [React]
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import type { RequestInfo } from '@warp-drive/core/types/request';
import { Request } from '@warp-drive/react';
import type { User } from '#/data/types';

interface UserSelectProps {
  /** the request that loads the options, usually a builder's result */
  query: RequestInfo<ReactiveDataDocument<User[]>>;
  onSearch: (term: string) => void;
}

export function UserSelect({ query, onSearch }: UserSelectProps) {
  return <>
    <input type="search" onChange={(event) => onSearch(event.target.value)} />
    <Request
      query={query}
      states={{
        loading: () => <>Searching…</>,
        content: ({ result }) => (
          <select>
            {result.data.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        ),
      }}
    />
  </>;
}
```

```.svelte [Svelte]
Coming Soon!
```

```.vue [Vue]
Coming Soon!
```

:::

The component's argument is typed with the response it expects, so TypeScript rejects a request
that returns something else, and the options are typed without a cast.

## Built-in Builders

***Warp*Drive** ships general-purpose builders for migrating to the request pipeline and for getting
started quickly. They are a starting point, not the goal: a general-purpose builder can't document,
type, or encode your app's endpoints and business logic the way your own builders can.

* The builders in [`@warp-drive/legacy/compat/builders`](/api/@warp-drive/legacy/compat/builders/)
  help apps move off deprecated store methods such as `findRecord` and `query` while they still use
  legacy adapters and serializers.
* The builders in `@warp-drive/utilities` help apps move from legacy requests and those compat
  builders onto the modern request pipeline. Each API format has `findRecord`, `query`,
  `createRecord`, `updateRecord` and `deleteRecord`:

  * [`@warp-drive/utilities/json-api`](/api/@warp-drive/utilities/json-api/) for
    [{json:api}](https://jsonapi.org/), which also has `postQuery`
  * [`@warp-drive/utilities/rest`](/api/@warp-drive/utilities/rest/)
  * [`@warp-drive/utilities/active-record`](/api/@warp-drive/utilities/active-record/)

  They usually need some tuning for a particular app.

In a mature app, keep general-purpose builders like these as internal infrastructure for building
more specific builders, rather than calling them from the rest of the app:

```ts [builders/get-user.ts]
import { findRecord } from '@warp-drive/utilities/json-api';
import type { User } from '#/data/types';

/**
 * Gets a user by id, with their team.
 *
 * - Endpoint: `GET /api/users/:id?include=team`
 */
export function getUser(id: string) {
  return findRecord<User>('user', id, { include: ['team'] });
}
```

The rest of the app calls `getUser(id)`, which says what it wants and carries its own documentation,
instead of calling `findRecord('user', id)` directly.
