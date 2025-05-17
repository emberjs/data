# Caching

When a Store makes a Request, the Response is inserted into the Store's Cache.

When the same Request is made again, the CacheHandler checks the Request's options
as well as the Store's CachePolicy to decide if the version in the Store's Cache can
be reused, or if updated data should be fetched.

<br>
<img class="dark-only" src="./images/caching-dark.png" alt="waves of reactive signals light up space" width="100%">
<img class="light-only" src="./images/caching-light.png" alt="waves of reactive signals light up space" width="100%">

## The Request Process

The process of checking and updating the cache flows roughly like this:

### 1. Determining If A Request Can Use The Cache

- `store.request` decorates the request with the store instance in use, and passes the request to the RequestManager
- The RequestManager invokes its handler chain, starting with the CacheHandler
- If the request has no Store or `cacheOptions[SkipCache] === true`, the CacheHandler passes along the request to the
  handler chain and will not attempt to handle the request or the response.

### 2. Determining The CacheKey And Checking If The Response Is Stale

- The CacheHandler uses the attached store's IdentifierCache (a cache key service) to determine the Request's CacheKey
    - this service will use `cacheOptions.key` if present
    - for `GET` requests if `cacheOptions.key` is not present it will use the url
    - for all other requests it will return `null` indicating the request is not one that can ever be served from cache
    - Note: this resolution is configurable
- The CacheHandler uses the `CacheKey` as well as `cacheOptions` to determine if there is an existing cache entry
  - if there is a cache entry, it uses the `cacheOptions` and else the Store's `CachePolicy` to determine if the Response is stale.
- If there is no cache entry or the Response is stale, the CacheHandler calls `next` and the Request continues down the handler chain.

### 3. Updating The Cache With New Response Data

- When the CacheHandler receives a response from the handler chain, it puts it in the cache. This occurs regardless of whether there is an
  associated `CacheKey` so that all responses are able to update the state of cached resources even if the request as a whole cannot be cached. For instance, when using `DELETE` to remove a record or a `POST` to create a new record.
- The Cache processes the response, updating its state as needed, and returns a list of the resources found
- If the request was configured to return a reactive response, the cache's list is turned into a reactive document.
  - Else the raw list is returned.

## How The Cache Works

The Store's cache is an in-memory cache that handles the concerns needed to support the rich, reactive layer. By default, it does not persist into any form of more permanent storage, though implementations can do so and `@warp-drive/experiments` contains several primitives through which we've been exploring a persisted cache by-default design.

Caching is tiered by the kind of data being stored. Depending on how you look at it,
there are either 3 or 4 tiers. Each tier operates on either `replace semantics` or `upsert semantics`.

- **Replace Semantics:** receiving a new value for a key entirely overwrites the prior value

- **Upsert Semantics:** new values received for a key merge with the existing value for the key

### Tier 1: Responses Are Cached By Their CacheKey With Replace Semantics

::: tip 💡 Resources within a Response are cached separately from the Response
Read on to understand what this means.
:::

When a response has a CacheKey, the Cache stores it using that CacheKey. If an entry was already present for that CacheKey, it is entirely overwritten.

The same CacheKey applies to a request, its response, and its parsed content. We refer to
this as a `RequestCacheKey`. In ***Warp*Drive** CacheKeys are objects with a string `lid`
property and either the object or the string can be used as a unique key (the store's `identifierCache` is what provides cache keys and guarantees these properties).

::: code-group

```ts [Interface]
interface RequestCacheKey {
  lid: string;
}
```

```ts [Example]
{
  lid: 'https://api.example.com/v1/users/1?fields=name,age,dob'
}
```

:::

The response supplied to the Cache is a StructuredDocument (an object containing the original `Request`, `Response` and variably the processed `content` or `error`).

```ts
interface Result {
  request: Request;
  response: Response;
}

interface SuccessResult extends Result {
  content: object;
}

interface ErrorResult extends Result {
  error: Error;
}

type StructuredDocument = SuccessResult | ErrorResult;
```

The Cache expects that the data within `content` or `error` is in a format that it understands how to process. For the JSONAPICache implementation, this is [{json:api}](https://json-api.org).

The `content` (or respectively `error`) property of the StructuredDocument will be processed by the Cache and replaced with a `ResponseDocument`. This data structure is similar to the top-level document structured defined by JSON:API for convenience.

```ts
interface ResponseDocument {
  meta?: object;
  links?: object;
  data?: ResourceCacheKey | ResourceCacheKey[];
  included?: object[];
  errors?: ResourceCacheKey[];
}
```

#### Resource Extraction

During content processing, the cache extracts any resources it finds in the payload. The returned response document includes a list of the Resource CacheKeys representing resources extracted.

Like RequestCacheKey, a ResourceCacheKey is a stable object with a string `lid` property. ResourceCacheKey also encoudes the `ResourceType` and the primary key of the resource.

::: code-group

```ts [Interface]
interface ResourceCacheKey {
  id: string | null;
  type: string;
  lid: string;
}
```

```ts [Example]
{
  id: "1",
  type: "user",
  lid: '@lid:user:1'
}
```

:::

Resources that were part of the primary data of the response are listed under the `data`
property, while secondary (or sideloaded) resourrces are listed under included.

For example

::: code-group

```ts [Original Content]
{
  data: {
    type: 'user',
    id: '1',
    attributes: { name: 'Chris' },
    relationships: {
      bestFriend: { data: { type: 'user', id: '2' } }
    }
  },
  included: [
    {
      type: 'user',
      id: '2',
      attributes: { name: 'Wes' },
      relationships: {
        bestFriend: { data: { type: 'user', id: '1' } }
      }
    }
  ]
}
```

```ts [ResponseDocument]
{
  data: {
    type: 'user',
    id: '1',
    lid: '@lid:user:1'
  },
  included: [
    {
      type: 'user',
      id: '2',
      lid: '@lid:user:2'
    }
  ]
}
```

:::

### Tier 2: Resources Are Cached By Their CacheKey With Upsert Semantics

