---
order: 1
---

# Key Terminology

The hardest part about learning a new tool or technology is often building a correct
understanding of the terminology the project uses. In this ***Warp*Drive** is like all
other projects.

As much as possible, we've tried to name things in ways we hope you will find intuitive, or at 
least intuitive once the basics have sunk in. But getting the basics down is a chicken/egg paradox
where sometimes you already need to understand some terminology.

By this point you should have learned about our first main-theme: [requests](../requests/index.md).
This document lays out a few terms associated to the remaining main themes you'll need to know to
be successful: [Documents](#documents) and [Resources](#resources).

## Documents

***Warp*Drive** calls a few *tightly related* concepts "documents".

1. [StructuredDocument](/api/@warp-drive/core/types/request/type-aliases/StructuredDocument), which is the resolved result of making a request with
the `{ request, response, content }` signature.

2. [ResourceDocument](/api/@warp-drive/core/types/spec/document/type-aliases/ResourceDocument), which is
the `content` of a StructuredDocument typically produced by parsing the `body` of the response of a `fetch`
request.

3. [ReactiveDocument](/api/@warp-drive/core/reactive/type-aliases/ReactiveDocument), which is a reactive wrapper providing immutable access to the cache data for a ResourceDocument. Not all requests have a ReactiveDocument for their response.

What's the common thread? All three are representations of a request and its result each with a distinct purpose. For this reason when cacheable they share a CacheKey (the `RequestKey`).

For requests that don't use the cache, this is about as much as you need to know. But for requests that do use the cache (most requests) there's one final important nuance: Documents don't store any resource data. When the cache receives the request response, [it will separate out resource data from the rest of the document](./index.md#resource-extraction). Wait ... what's a Resource? Read on.

## Resources

Resources are ***Warp*Drive**'s term for discretely identifiable data.

The most common example of a resource would be data matching a row in a database table. The table 
name would typically be it's `ResourceType` and it would have a `PrimaryKey`. For instance a "user"
with id "1".

Knowing both the `ResourceType` and `PrimaryKey` would allow you to lookup the row in the database. Hence - 
discretely identifiable.

But resources need not map to rows in a database - any named concept with a unique key value meaningful to your app's domain logic can be a resource.

***Warp*Drive** distinguishes between documents and resources both because responses can contain zero, one, or many resources and because the same resource may be present in more than one response
document.

A `Resource` has a `ResourceType` (its name, a string), `ResourceKey` (see [caching](./index.md)), a `ResourceSchema` (defining it's [fields](../schemas/index.md)), and its reactive wrapper - a `ReactiveResource`.

- The `ResourceType` is the name of the `ResourceSchema`
- An array of resources is a `ResourceArray`
- The reactive wrapper for a `ResourceArray` is a `ReactiveResourceArray`

In a few cases you will see the term `Collection`. Generally a collection is just a list (array) of resources. We tend to use this term when the list is part of a `Many` relationship or has a similar `unique` (no repeat/duplicate values) constraint.
