---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/guides/the-manual/relational-data.md
description: >-
  Start here to configure relationships in WarpDrive; links each cardinality
  page from one-to-none through many-to-many plus the inverses, LinksMode, and
  polymorphism guides.
---

# Relationships Guide

## Feature Overview

* [Inverses](./features/inverses.md)
* [LinksMode](../misc/links-mode.md)
* [Polymorphism](./features/polymorphism.md)
* [Pagination](../experiments/pagination.md) (experimental): load a large collection page by page as its own
  request instead of through a relationship

## Configuration

* [One To None](./configuration/one-to-none.md) (1:0)
* [One To One](./configuration/one-to-one.md) (1:1)
* [One To Many](./configuration/one-to-many.md) (1:N)
* [Many To None](./configuration/many-to-none.md) (N:0)
* [Many To One](./configuration/many-to-one.md) (N:1)
* [Many To Many](./configuration/many-to-many.md) (N:N)

## Terminology

* **Inverse**: the field on the related resource that points back to this one. If users have pets and pets have
  owners, the inverse of `user.pets` is `pet.owners`, and the inverse of `pet.owners` is `user.pets`. A
  to-none relationship has no inverse, which its schema declares as `inverse: null`. See [Inverses](./features/inverses.md).
* **Self-referential**: a relationship that points back at the same resource type, such as `person.parents` and
  `person.children`, which both belong to `person`.
* **Reflexive**: a self-referential relationship that is also its own inverse, such as `user.friends`.
* **Circular**: a self-referential or reflexive relationship whose value is the same record on both sides, such
  as a user who is their own best friend (`ego.bestFriend === ego`).
* **Polymorphic**: a relationship that more than one resource type can satisfy, such as `user.vehicles` holding
  `car`, `boat` and `airplane` records. See [Polymorphism](./features/polymorphism.md).
