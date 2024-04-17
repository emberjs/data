# Typing Requests & Builders

## How it works (but what not to do in the general case)

`requestManager.request` and `store.request` each take a generic that can be used to set
the return type of the content of the associated request.

```ts
const { content } = await store.request<User>({ ... });

// here content will be typed as a User
```

> [!CAUTION]
> Note that this puts the burden on you to ensure the return type accurately portrays the result!

In all cases, the response will be a `StructuredDocument<T>` where `T` is the content type provided.

This approach allows for a lot of flexibility in designing great sugar overtop of the request infrastructure, but again, limits the amount of safety provided and should be used with great caution.

A better approach is to use builders and set the generic via inference.

## Setting Content's Type from a Builder

The signature for `request` will infer the generic for the content type from a special brand on the options passed to it.

```ts
type MyRequest {
  // ...
  [RequestSignature]: Collection<User>
}

function buildMyRequest(...): MyRequest { /* ... */ }

const { content } = await store.request(
  buildMyRequest(...)
);

// here content will be set to `Collection<User>`
```

## Advanced Builders

Because builders are just functions that produce a request options object, and because this object can be branded with
the type signature of the response, we can use this to create
advanced more-strongly-typed systems.

For instance, imagine you had a query builder that validated
and linted the query against a backing schema, such as you might
get with GraphQL

```ts
const { content } = await store.request(
  gql`query withoutVariable {
    continents {
      code
      name
      countries {
        name
        capital
      }
    }
  }`
);
```
