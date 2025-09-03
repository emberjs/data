---
title: Introduction
categoryOrder: 2
order: 0
categoryTitle: The Manual
---

# Introduction

***Warp*Drive** is the data framework for building ambitious applications.

By ***ambitious***, we mean that ***Warp*Drive** is ideal for both small and large applications that strive to be best-in-class. ***Warp*Drive** seamlessly handles and simplifies the hardest parts of state management when building an app, helping you focus on creating the features and user experiences that **drive value**.

:::tabs

== MPAs

***Warp*Drive** is the missing bridge for MPAs, allowing your app to seamlessly pick-up where the user
left off with zero extra network requests.
<br><br>

== SPAs

***Warp*Drive** reduces complex state problems to simple to reason about requests, supercharging your ability
to ship advanced features.
<br><br>

== Cross Framework

***Warp*Drive** helps you write, test and ship critical business and state logic that plugs in to any framework. Stop debating if you picked the right framework: roll with whatever you need.
<br>

== Component Libraries

Stop writing the same gnarly component logic in a dozen frameworks or sacrificing with WebComponents. ***Warp*Drive** allows you to create shareable reactive component engines that are easy to expose via super-thin low-maintenance bindings.

== SDKs

Want to make your API dead-simple to consume? ***Warp*Drive** makes it easy to create and share intuitive, editor-friendly typed bindings to any API.
<br><br>

:::

<br>
<img class="dark-only" src="./images/reactivity-pastel.png" alt="waves of reactive signals light up space" width="100%">
<img class="light-only" src="./images/reactivity-pastel-light.png" alt="waves of reactive signals light up space" width="100%">

## Reactivity That Just Works {#reactivity}

```hbs
Hello {{@user.name}}!
```

Our innovative approach to [fine grained reactivity](https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf) enables rapidly developing robust, performant web applications using any [Signals](https://github.com/tc39/proposal-signals#readme) compatible framework such as [Ember](https://guides.emberjs.com/release/in-depth-topics/autotracking-in-depth/), [Svelte](https://svelte.dev/docs/svelte/what-are-runes), [Angular](https://angular.dev/guide/signals), [Vue.js](https://vuejs.org/guide/extras/reactivity-in-depth.html), [SolidJS](https://www.solidjs.com/tutorial/introduction_signals),
[Preact](https://preactjs.com/guide/v10/signals/) or [Lit](https://lit.dev/docs/data/signals/).

No more boxing/unboxing, extra methods, funny syntaxes, or other boilerplate. Your data is reactive
without any ceremony, and has the same shape you'd expect if it were "just an object" or "just an array".

It even works with [React](/api/@warp-drive/react)!

## Requests Without The Fuss {#requests}

```ts
const { content } = await store.request({
  url: '/api/users'
});
```

By building around the same interface as the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), ***Warp*Drive** makes powerful request management features like caching, deduping, errors and data normalization feel simple to use.

<p align="center">
  <strong>💚 Fully Typed!</strong>
</p>

```ts{1}
const { content } = await store.request<User>({
  url: '/api/users/1'
});
```

`request` takes a generic that can be used to set the [return type](./the-manual/requests/typing-requests.md) of the content of the associated request. [Builders](./the-manual/requests/builders.md) – functions that return RequestInfo – can supply the return type via a special [brand](https://egghead.io/blog/using-branded-types-in-typescript).

```ts
import { withBrand } from '@warp-drive/core/request'; // [!code focus]
import type { User } from './types/data';

export function getUser(id: string) {
  return withBrand<User>({  // [!code focus]
    method: 'GET',
    url: `/api/users/${id}`,
  });  // [!code focus]
}

// ...

const { content } = await store.request(getUser('1')); // [!code focus]
```

## Build Quickly and Robustly with Reactive Control Flow {#reactive-control-flow}

```glimmer-ts
import { Request } from '@warp-drive/ember';
import { findRecord } from '@warp-drive/utilities/json-api';
import { Spinner } from './spinner';

export default <template>
  <Request @query={{findRecord "user" "1"}}> <!-- [!code focus] -->
    <:error as |error state|> <!-- [!code focus] -->
      <h2>Whoops!</h2>
      <h3>{{error.message}}</h3>
      <button {{on "click" state.retry}}>Try Again?</button>
    </:error> <!-- [!code focus] -->

    <:content as |result|>  <!-- [!code focus] -->
      Hello {{result.data.name}}!
    </:content> <!-- [!code focus] -->

    <:loading as |state|> <!-- [!code focus] -->
      <Spinner @progress={{state.completedRatio}} />
      <button {{on "click" state.abort}}>Cancel?</button>
    </:loading> <!-- [!code focus] -->
  </Request> <!-- [!code focus] -->
</template>
```

We pair the JS API with a headless component API providing [reactive control flow](./concepts/reactive-control-flow.md) to give apps the ability to declaratively derive states with safety.

The component API is a thin framework-specific binding overtop of the framework-agnostic JS API. Don't see your
framework yet? Let's add it!

## ORM Powers Without ORM Problems {#relational-data}

```ts
const { content } = await store.request({
  url: '/api/user/1?include=organizations'
});

content.data.organizations.map(organization => {
  
});
```

**Web clients are like high-latency, remotely distributed, often-stale partial replicas of server state**. ***Warp*Drive** provides an [advanced relational cache](./the-manual/caching.md) that simplifies these problems--solving them when it can and providing intelligent escape valves for when it can't. No matter what, you can quickly **get the data you need in the right state**.

## Schema Driven Reactivity {#schemas}

***Warp*Drive**'s reactive objects transform raw cached data into rich, reactive data. The resulting objects are immutable, always displaying the latest state in the cache while preventing accidental or unsafe mutation in your app. The output and [transformation](./concepts/transformation.md) is controlled by a simple JSON [ResourceSchema](./concepts/schemas.md).

```ts
import { withDefaults } from '@warp-drive/core/reactive';

store.schema.registerResource(
  withDefaults({
    type: 'user',
    fields: [
      { kind: 'field', name: 'firstName' },
      { kind: 'field', name: 'lastName' },
      { kind: 'field', name: 'birthday', type: 'luxon-date' },
      {
        kind: 'derived',
        name: 'age',
        type: 'duration',
        options: { field: 'birthday', format: 'y' }
      },
      {
        kind: 'derived',
        name: 'fullName',
        type: 'concat',
        options: { fields: ['firstName', 'lastName'], separator: ' ' }
      },
    ]
  })
)
```

## Immutability Without The Performative Hassle {#immutability}

Derivations, transformations, and immutability-by-default prevent the need for verbose allocation and compute
heavy immutability tricks such as spread, slice, and map.

## Mutation Management {#mutations}

[Mutation](./concepts/mutations.md) is handled within controlled contexts. The data to edit is "checked out" for editing, giving access to a mutable version. Local edits are seamlessly preserved if the user navigates away and returns without saving, and the changes are buffered from appearing elsewhere in your app until they are also committed to the server.

```ts
import { Checkout } from '@warp-drive/core/reactive';

// ...

const editable = await user[Checkout]();
editable.firstName = 'Chris';
```

## Broad Compatibility {#api-compatibility}

***Warp*Drive** is only semi-opinionated about your API. Almost every API is compatible just by authoring a [request handler](./the-manual/requests/handlers.md) to ensure that the responses are normalized into the cache format.

```ts
const NormalizeKeysHandler = {
  request(context, next) {
    return next(context.request).then((result) => {
      return convertUnderscoredKeysToCamelCase(result.content);
    });
  }
}
```

---

## Completely Customizable {#customization}

If using an app-specific cache format would work better for the demands of your API, the [cache](/api/@warp-drive/core/types/cache/interfaces/Cache) the store should use is customizable:

```ts
import { Store } from '@warp-drive/core';
import { CustomCache } from './my-custom-cache';

class AppStore extends Store {
  createCache(capabilities) {
    return new CustomCache(capabilities);
  }
}
```

## Ready for RealTime {#realtime}

Realtime subscriptions are supported through an extensive list of [operations](./concepts/operations.md) for surgically updating cache state, as well as by a comprehensive [notifications service]() which alerts us to when data has been added, updated or removed from the cache allowing subscriptions to dynamically adjust as needed.

```ts
store.cache.patch({
  op: 'add',
  record: User1Key,
  field: 'friends',
  value: User2Key
});
```

## And a Universe of More {#explore}

<img src="./images/universe-of-more.png" width="100%" alt="a young child stares out across the mountains at the night sky">

***Warp*Drive** has been designed as a series of interfaces following the single-responsibility principle with well defined boundaries and configuration points. Because of this, nearly every aspect of the library is configurable, extensible, composable, replaceable or all of the above: meaning that if something doesn't meet your needs out-of-the-box, you can configure it to.

The list of features doesn't end here. This guide will teach you the basics of everything you need to know, but if you find yourself needing more help or with a question you can't find the answer to, ask on [GitHub](https://github.com/emberjs/data/issues), in our [forum](https://discuss.emberjs.com/) or on [discord](https://discord.gg/PHBbnWJx5S).


<br>

