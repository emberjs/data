---
outline:
  level: 2,3
categoryOrder: 2
order: 0
title: Overview
---

# Caching

When a Store makes a Request, the Response is inserted into the Store's Cache.

When the same Request is made again, the CacheHandler checks the Request's options
as well as the Store's CachePolicy to decide if the version in the Store's Cache can
be reused, or if updated data should be fetched.

<br>
<img class="dark-only" src="../../images/caching-dark.png" alt="waves of reactive signals light up space" width="100%">
<img class="light-only" src="../../images/caching-light.png" alt="waves of reactive signals light up space" width="100%">


## Determining If A Request Can Use The Cache

- `store.request` decorates the request with the store instance in use, and passes the request to the RequestManager
- The RequestManager invokes its handler chain, starting with the CacheHandler
- If the request has no Store or `cacheOptions[SkipCache] === true`, the CacheHandler passes along the request to the
  handler chain and will not attempt to handle the request or the response.

## Determining The CacheKey And Checking If The Response Is Stale

- The CacheHandler uses the attached store's CacheKeyManager (a CacheKey manager) to determine the Request's CacheKey
    - this service will use `cacheOptions.key` if present
    - for `GET` requests if `cacheOptions.key` is not present it will use the url
    - for all other requests it will return `null` indicating the request is not one that can ever be served from cache
    - Note: this resolution is configurable
- The CacheHandler uses the `CacheKey` as well as `cacheOptions` to determine if there is an existing cache entry
  - if there is a cache entry, it uses the `cacheOptions` and else the Store's `CachePolicy` to determine if the Response is stale.
- If there is no cache entry or the Response is stale, the CacheHandler calls `next` and the Request continues down the handler chain.

## Updating The Cache With New Response Data

- When the CacheHandler receives a response from the handler chain, it puts it in the cache. This occurs regardless of whether there is an
  associated `CacheKey` so that all responses are able to update the state of cached resources even if the request as a whole cannot be cached. For instance, when using `DELETE` to remove a record or a `POST` to create a new record.
- The Cache processes the response, updating its state as needed, and returns a list of the resources found
- If the request was configured to return a reactive response, the cache's list is turned into a reactive document.
  - Else the raw list is returned.

## How The Cache Works

The Store's cache is an in-memory cache that handles the concerns needed to support the rich, reactive layer. By default, it does not persist into any form of more permanent storage, though implementations can do so and `@warp-drive/experiments` contains several primitives through which we've been exploring a persisted cache by-default design.

The internal specifics of how a Cache chooses to store data are up to it. The below guide will be *generally* true of any implementation given the requirements a cache must fulfill. Since most applications will use the `JSONAPICache`, we describe the specific caching strategy it uses in detail.

Caching is tiered by the kind of data being stored. Depending on how you look at it,
there are either 3 or 4 tiers. Each tier operates on either `replace semantics` or `upsert semantics`.

- **Replace Semantics:** receiving a new value for a key entirely overwrites the prior value

- **Upsert Semantics:** new values received for a key merge with the existing value for the key

## Responses Are Cached By Their CacheKey With Replace Semantics

::: tip 💡 Resources within a Response are cached separately from the Response
Read on to understand what this means.
:::

When a response has a CacheKey, the Cache stores it using that CacheKey. If an entry was already present for that CacheKey, it is entirely overwritten.

The same CacheKey applies to a request, its response, and its parsed content. We refer to
this as a `RequestKey`. In ***Warp*Drive** CacheKeys are objects with a string `lid`
property and either the object or the string can be used as a unique key (the store's `cacheKeyManager` is what provides cache keys and guarantees these properties).

::: code-group

```ts [Interface]
interface RequestKey {
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

The Cache expects that the data within `content` or `error` is in a format that it understands how to process. For the JSONAPICache implementation, this is [{json:api}](https://jsonapi.org).

The `content` (or respectively `error`) property of the StructuredDocument will be processed by the Cache and replaced with a `ResourceDocument`. This data structure is similar to the top-level document structured defined by JSON:API for convenience.

```ts
interface ResourceDocument {
  meta?: object;
  links?: object;
  data?: ResourceKey | ResourceKey[];
  included?: object[];
  errors?: ResourceKey[];
}
```

### Resource Extraction {#resource-extraction}

During content processing, the cache extracts any resources it finds in the payload. The returned response document includes a list of the Resource CacheKeys representing resources extracted.

Like RequestKey, a ResourceKey is a stable object with a string `lid` property. ResourceKey also encodes the `ResourceType` and the primary key of the resource.

::: code-group

```ts [Interface]
interface ResourceKey {
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

```ts [ResourceDocument]
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

## Resources Are Cached By Their CacheKey With Upsert Semantics {#resource-caching}

When the Cache finds a Resource in a Response, it generates a CacheKey for the Resource using the Store's CacheKeyManager (a CacheKey manager). If an entry was
already present for that CacheKey, the existing data and
new data are merged together.

During a merge, the value of individual fields in the new data fully-replaces the prior value for that field, but existing fields without updates are preserved.

Any ancillary information about the resource such as links
or meta is fully replaced if new values are present.

Here's an example:

::: code-group

```ts [Previous Value]
{
  type: 'user',
  id: '1',
  meta: {
    revision: 'ae54g'
  },
  links: {
    self: 'api/v1/users/1'
  },
  attributes: {
    firstName: 'James',
    lastName: 'Thoburn',
    age: 37
  }
}
```

```ts [New Value]
{
  type: 'user',
  id: '1',
  meta: {
    lastAccessed: '2025-05-13'
  },
  attributes: {
    firstName: 'Chris',
    lastName: 'Thoburn',
    nickname: '@runspired'
  }
}
```

```ts [Merged Result]
{
  type: 'user',
  id: '1',
  meta: { // [!code --]
    revision: 'ae54g' // [!code --]
  }, // [!code --]
  meta: {  // [!code ++]
    lastAccessed: '2025-05-13'  // [!code ++]
  },  // [!code ++]
  links:
    self: 'api/v1/users/1' 
  },
  attributes: {
    firstName: 'James', // [!code --]
    firstName: 'Chris', // [!code ++]
    lastName: 'Thoburn',
    age: 37,
    nickname: '@runspired' // [!code ++]
  }
}
```

:::

## Fields Are Cached By ResourceKey + FieldName with Replace Semantics

Where this really matters is for deep objects. Generally, we support partial resource representations due to the upsert strategy, but this also means that out-of-the-box we only support partials only one level deep. E.g. if a field's value is an object, that object should be the full state of the field not a partial state of the field, we will not deep-merge during upsert.

## Relationships Are Cached By ResourceKey + FieldName

The Cache delegates relationship caching to the Graph Storage primitive provided by `@ember-data/graph`. The Graph is a powerful and highly optimized relational map that maintains the connections between ResourceKeys.

By default, The Graph uses **upsert semantics** for a relationship payload with **replace semantics** for each of `links` `meta` and `data` fields within it. This means that relationship payloads are expected to have complete representations for each of these if present (aside: this will somewhat change to support paginated collections in the near future).

This means that a field being absent from a relationship payload is semantically different from that field being present but with a value of `null` or an empty array. Being not-present means we do not replace the existing value.

The Graph also has the ability to receive op-codes that deliver more granular modifications to relationships to add or remove specific values. For instance, if your application were to use WebSockets to receive streaming changes to a relationship, those changes could be applied directly without needing to fully replace the existing value. We'll cover these operations in the guide for [RealTime Support](../concepts/realtime.md).

## What about Mutation?

Call all of the above what the Cache refers to as "remote state".

Mutations to fields (both relationships and non-relationships) are stored separately in the Cache from the underlying remote state as a diff. The "local" or "mutated" state then is the remote state + this diff. Updates to remote state will "commit" any changes in the diff that match the new remote state. A field is dirty if it has a value in the diff.

In order for a mutation to be "committed", either a request needs to include the updated value in a response or the remote state needs to be manually updated to the new value via an operation. The ability to control the timing of when this occurs allows for both optimistic and pessimistic UX patterns.
