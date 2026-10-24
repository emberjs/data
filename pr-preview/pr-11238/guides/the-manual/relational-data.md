---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/guides/the-manual/relational-data.md
description: >-
  Start here to configure relationships in WarpDrive; links each cardinality
  page from one-to-none through many-to-many plus the inverses, LinksMode, and
  polymorphism guides.
---

# Relationships Guide

Relationships connect resources to each other: a `user` has a `bestFriend`, a `post` has many
`comments`, a `pet` belongs to an `owner`. WarpDrive models every relationship as a field on a
resource schema, stores its state in a relational graph, and exposes it on records as a reactive
value that updates as the cache changes.

There are two kinds of relationship field, each with a legacy counterpart:

| Cardinality | Field kind | Value on the record | Legacy field kind | Legacy value |
| --- | --- | --- | --- | --- |
| one | `resource` | a [relationship document](./features/resource-relationships.md) whose `data` is the related record or `null` | `belongsTo` | the related record (or a promise proxy when async) |
| many | `collection` | a [relationship document](./features/collection-relationships.md) whose `data` is a reactive array of records | `hasMany` | a `ManyArray` (or a promise proxy when async) |

`resource` and `collection` are the field kinds to reach for in new code, and the only relationship
kinds whose behavior is identical in [LegacyMode](../schemas/resources/legacy-mode.md) and
[PolarisMode](../schemas/resources/polaris-mode.md). `belongsTo` and `hasMany` remain fully
supported for apps migrating from `@warp-drive/legacy/model`.

The exact rules every relationship kind follows are collected in the
[Relationship Specification](./spec.md).

## Feature Overview

* [Resource Relationships](./features/resource-relationships.md)
* [Collection Relationships](./features/collection-relationships.md)
* [Links vs Identifiers](./features/links-vs-identifiers.md)
* [Sync vs Async](./features/sync-vs-async.md)
* [Inverses](./features/inverses.md)
* [Polymorphism](./features/polymorphism.md)
* [LinksMode](../misc/links-mode.md) (for `belongsTo` and `hasMany`)
* [Pagination](../experiments/pagination.md) (experimental): load a large collection page by page as its own
  request instead of through a relationship

## Configuration

* [One To None](./configuration/one-to-none.md) (1:0)
* [One To One](./configuration/one-to-one.md) (1:1)
* [One To Many](./configuration/one-to-many.md) (1:N)
* [Many To None](./configuration/many-to-none.md) (N:0)
* [Many To One](./configuration/many-to-one.md) (N:1)
* [Many To Many](./configuration/many-to-many.md) (N:N)

## Mutating Relationships

* [Adding & Removing](./mutating/adding-removing.md)
* [Saving](./mutating/saving.md)
* [Sorting & Filtering](./mutating/sorting-filtering.md)

## Reference

* [Relationship Specification](./spec.md)

## Advanced

* [Understanding "the Graph"](./advanced/the-graph.md)
* [Pagination](./advanced/pagination.md)
* [Large Collections](./advanced/large-collections.md)
* [Directionality](./advanced/directionality.md)

# Misc

* [Terminology](../misc/terminology.md#relationships)
* [Migrating from `belongsTo`/`hasMany`](/upgrading/v5/relationships.md)
