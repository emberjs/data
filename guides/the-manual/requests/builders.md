---
order: 2
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

## When To Use A Builder

Even requests that are only issued once should be given a builder. In addition to making it
easy to issue the same request from within your test suite, this will ensure that future
refactoring or expansion is easy to achieve and review.

Builders keep your code neat, making it easy to focus on the intent instead of the specifics.

Because builders are functions that can be invoked anywhere, they also bridge between the
component API and the JS API seamlessly - even in templating syntaxes where casting json 
to a type or invoking a function with generics would not otherwise work.

Builders, by nature, enable sharing typed requests cross-framework!

### Builders That Follow General API Patterns

### Builders That Follow Domain Logic

### {x,t}RPC with WarpDrive

### GraphQL with WarpDrive

## Best Practices For Builders

## Composing Builders

## Builder Utilities

## Type Utilities
