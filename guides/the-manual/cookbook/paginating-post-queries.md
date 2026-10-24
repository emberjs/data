---
url: >-
  https://canary.warp-drive.io/guides/the-manual/cookbook/paginating-post-queries.md
description: >-
  Write a request handler that generates `next` links for a query sent as a
  `POST` or `QUERY`, so `next()` and the pagination primitives work when the
  server can't return links itself.
---

# Paginating `POST` Queries With A Handler

A query sent in the body of a `POST` (or an http `QUERY`) can't be paginated by following links
unless the server returns links for it. The recommended fix is on the server, by persisting the
query or encoding it into a cursor, as
[Paginating A `POST` Or `QUERY` Request](../requests/builders.md#paginating-a-post-or-query-request)
describes. This page is the fallback for when the server can't do either: a
[handler](../requests/handlers.md) that generates the links on the client.

It adapts the pagination engine from the blog post
[Exploring Advanced Request Handlers in WarpDrive](https://runspired.com/2025/02/26/exploring-advanced-handlers.html),
which also covers handlers that add links to `GET` requests.

## How It Works

The handler sits in front of [Fetch](/api/@warp-drive/core/variables/Fetch) and does two things:

1. When a builder's first-page `POST` passes through, the handler sends it, then adds a `next`
   link to the response. The link isn't a real URL. It is a key the handler recognizes, and the
   handler remembers which `POST` it stands for: the same url, headers and body, with the page
   offset moved forward by one page.
2. When the app follows that link, for instance with `next()`, the request arrives as a `GET` for
   the key. The handler swaps it for the `POST` it remembered, sends that, and adds a `next` link
   to that response in turn.

The store requests a generated link the way it requests any other link, as a `GET` whose url is
the link, before the handler rewrites it. So each page's RequestKey is its link, stable without the
builder computing one, and both `next()` and the experimental
[Pagination](../experiments/pagination.md) primitives work unchanged.

## The Builder

The builder opts in with an entry in `options`, so the handler leaves every other `POST` alone.
The example follows `getCompanyPreviewList` from the [Builders](../requests/builders.md) guide,
whose body pages with `page.offset` and `page.limit`:

```ts [builders/get-company-preview-list.ts]
import { withReactiveResponse } from '@warp-drive/core/request';
import type { CompanyPreview } from '#/data/types';

export function getCompanyPreviewList(search: string) {
  const url = `/companies`;
  const body = JSON.stringify({
    search,
    // ...
    page: {
      offset: 0,
      limit: 25,
    },
  });
  const cacheKey = `${url}::${body}`;

  return withReactiveResponse<CompanyPreview[]>({
    url,
    method: 'POST',
    cacheOptions: { key: cacheKey, types: ['company'] },
    headers: { 'X-HTTP-METHOD-OVERRIDE': 'QUERY' },
    body,
    options: { // [!code focus:3]
      paginateQuery: true,
    },
  });
}
```

## The Handler

```ts [handlers/query-pagination.ts]
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext, RequestInfo } from '@warp-drive/core/types/request';

const LINK_PREFIX = '@query-page:';

interface PagedQuery {
  page: { offset: number; limit: number };
}

interface PageDocument {
  data: unknown[];
  links?: Record<string, unknown>;
}

/**
 * Generates `self` and `next` links for paginated queries
 * sent as a `POST`, for APIs that can't return links themselves.
 *
 * A builder opts in with `options: { paginateQuery: true }`.
 */
export class QueryPagination implements Handler {
  /** each generated link, mapped to the POST it stands for */
  #pages = new Map<string, Pick<RequestInfo, 'url' | 'headers' | 'body'>>();

  request<T>(context: RequestContext, next: NextFn<T>) {
    const { request } = context;

    // the app is following a link this handler generated
    if (request.url?.startsWith(LINK_PREFIX)) {
      const page = this.#pages.get(request.url);
      if (!page) {
        throw new Error(`No query is known for the link ${request.url}`);
      }
      return this.#fetchPage(
        { ...request, ...page, method: 'POST' },
        next
      ) as Promise<T>;
    }

    // a builder's first-page request
    if (request.method === 'POST' && request.options?.paginateQuery) {
      return this.#fetchPage(request, next) as Promise<T>;
    }

    return next(request);
  }

  async #fetchPage<T>(request: RequestInfo, next: NextFn<T>) {
    const { content } = await next(request);
    const document = content as PageDocument;
    const { page, ...query } = JSON.parse(request.body as string) as PagedQuery;

    const links: Record<string, unknown> = { ...document.links, self: this.#linkFor(request, query, page) };
    // a short page is the last one
    if (document.data.length === page.limit) {
      links.next = this.#linkFor(request, query, {
        offset: page.offset + page.limit,
        limit: page.limit,
      });
    }

    return { ...document, links };
  }

  #linkFor(request: RequestInfo, query: object, page: PagedQuery['page']) {
    const body = JSON.stringify({ ...query, page });
    const link = `${LINK_PREFIX}${request.url}::${body}`;

    this.#pages.set(link, { url: request.url, headers: request.headers, body });
    return link;
  }
}
```

Register it in the store's `handlers`. The store adds
[Fetch](/api/@warp-drive/core/variables/Fetch) after the handlers you list, so this one sees each
request before it is sent:

```ts [data/store.ts]
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';
import { QueryPagination } from '#/handlers/query-pagination.ts';

export const AppStore = useRecommendedStore({
  handlers: [new QueryPagination()],
  cache: JSONAPICache,
  schemas: [/* … */],
});
```

With the handler in place, the app pages through the query the same way it would a collection
whose links came from the server:

```ts
const { content: firstPage } = await store.request(getCompanyPreviewList('acme'));
const secondPage = await firstPage.next();
```

## Limitations

Generated links are the reason server-side links are preferred:

* **They only exist in memory.** The handler's map is empty after a reload, so a cached document
  whose links it generated, such as one restored from a persisted cache, can't follow them.
  Supporting that means restoring the map too, or encoding the whole `POST` into the link so the
  handler can rebuild it without one.
* **They aren't URLs.** A generated link can't be bookmarked, shared, or put in a route's query
  params the way a server's `GET` link can.
* **The handler must know the paging scheme.** It assumes the body pages with `page.offset` and
  `page.limit`, and that a short page is the last one. An API that pages differently, or reports
  a total, needs its own version of `#fetchPage`.
* **The map only grows.** Every page the app loads adds an entry. An app that runs many
  queries in one session may want to drop entries once their documents leave the cache.
* **It only generates `next`.** A `prev`, `first` or `last` link can be added the same way when
  the offset and a total are known.
