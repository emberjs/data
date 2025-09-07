---
title: Overview
order: 0
categoryOrder: 3
---

# Schemas

Schemas are how ***Warp*Drive** understands the structure of your data, powering features like caching, relational data, and reactivity.

Schemas are also how [ReactiveResource](/api/@warp-drive/core/reactive/interfaces/ReactiveResource) knows to transform data from its raw serialized form in the cache into richer forms for use by your app.

<br>
<img class="dark-only" src="../../images/building-blocks-dark.png" alt="abstractly: stacks of cubes together creating a harmonious structure amidst chaos of crashing waves" width="100%">
<img class="light-only" src="../../images/building-blocks-light.png" alt="abstractly: stacks of cubes together creating a harmonious structure amidst chaos of crashing waves" width="100%">

## Resource Schemas

Schemas are JSON, which ensures a high degree of [flexibility](https://runspired.com/2025/05/25/in-defense-of-machine-formats.html) when creating or loading them.

***Warp*Drive** offers several categories of schema:

- ResourceSchema
- ObjectSchema
- Traits
