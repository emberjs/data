---
order: 3
---

# Builders

Builders are simple functions that produce a json [request object](/api/@warp-drive/core/types/request/interfaces/RequestInfo). Builders help you to write organized, reusable requests.

The simplest builder could produce an object with just a `url`, though usually builders will want to provide a few ***Warp*Drive** specific properties as well set the request method, headers and any other desired [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit) properties.

We recommend builder functions follow a few guidelines
- they should be pure functions
- they should set the [response type](./typing-requests.md) for the request they generate
- they should rarely rely on [Handlers](./handlers.md) to provide additional
  info critical to the request.
- they should mirror either your endpoints or your business logic
- their name should convey what they do


Here's a few examples:

#### Get A List Of Partial Data

Let's say you have a feature that shows a paginated and sorted list of companies. The request
for this data will load just the few company fields it needs, as well as a minimal subset of
the related data for the company's ceo and headquarters.

The list can be searched by the app's users, and the `QUERY` endpoint is implemented using
the http `POST` method. You want to cache the requests to enable deduping and avoid repeating
queries.

A builder lets you quickly abstract all of this nuance.

:::tabs

== Builder

```ts [builders/getCompanyPreviewList.ts]
import { withReactiveResponse } from '@warp-drive/core/request';
import { CompanyPreview } from '#/data/types';

/**
 * Gets a list of company previews with info about their CEO and
 * headquarters location sorted alphabetically by name ascending.
 * 
 * - Paginated (limit 25)
 * - See also {@link CompanyPreview}
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
}
```

== Supporting Types

```ts [types/companyPreview.ts]
import { Type } from '@warp-drive/core/types/symbol';
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

== Usage

```ts [Ember]
import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { Request } from '@warp-drive/ember';
import { getCompanyPreviewList } from '#/data/builders';

export default class CompanyPreviewList extends Component<{ Args: { search: string } }> {
  @cached
  get searchQuery() {
    return getCompanyPreviewList(this.search);
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

## When To Use A Builder

Even requests that are only issued once should be given a builder. In addition to making it
easy to issue the same request from within your test suite, this will ensure that future
refactoring or expansion is easy to achieve and review.

Builders keep your code neat, making it easy to focus on the intent instead of the specifics.

Because builders are functions that can be invoked anywhere, they also bridge between the
component API and the JS API seamlessly - even in templating syntaxes where casting json 
to a type or invoking a function with generics would not otherwise work. Builders, by nature,
enable sharing typed requests cross-framework!

Builders also help to ensure that for a given set of args the same [cache key](/api/@warp-drive/core/types/identifier/interfaces/RequestKey) is produced. Generating stable cache keys is harder
than it might seem, but builders help to simplify this and ***Warp*Drive** provides additional
[utilities](/api/@warp-drive/utilities/) to make it even easier still.

## Cache Keys for Requests

In order for two requests to be considered the same, their `RequestKey` must match. For GET requests
the `RequestKey` is typically the `url`, while queries issued using a `POST` request (or other means)
may need to explicitly set [cacheOptions.key](/api/@warp-drive/core/types/request/interfaces/CacheOptions#key).

For the `url` case, this means that the order and formatting of [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) must be the same for a match to occur. Similarly, when
`cacheOptions.key` is used sorting and order of the information being used to produce the string key
must be considered.

A naive approach to stringifying params or request bodies to use as keys will result in otherwise identical requests failing to match due to mismatched strings. See below for an example of what
we mean.

:::tabs

== Different Value Order

```ts
"https://example.com/api/users?ids=1,2"
"https://example.com/api/users?ids=2,1"
```

== Different Param Order

```ts
"https://example.com/api/users?name=Chris&title=Engineer"
"https://example.com/api/users?title=Engineer&name=Chris"
```

== Different Key Order

```ts
const key1 = JSON.stringify({ search: { name: 'Chris', title: 'Engineer' } });
// => '{"search":{"name":"Chris","title":"Engineer"}}'
const key2 = JSON.stringify({ search: { title: 'Engineer', name: 'Chris',  } });
// => '{"search":{"title":"Engineer","name":"Chris"}}'
```

== Different Encoding

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
Read the [caching](../caching.md#determining-the-cachekey-and-checking-if-the-response-is-stale) section of the manual to understand how this CacheKey is used.
:::

Simply using a builder does a significant amount towards ensuring a stable RequestKey, because the order
in which the url is built and params are assigned will be the same each time. But sometimes that isn't
enough, and when it is not the following utilities will come in handy:

- [sortQueryParams](/api/@warp-drive/utilities/functions/sortQueryParams)
- [buildQueryParams](/api/@warp-drive/utilities/functions/buildQueryParams)
- [filterEmpty](/api/@warp-drive/utilities/functions/filterEmpty)


