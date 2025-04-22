<table>
  <tr>
    <td align="center" width="300"></td>
    <td align="center" width="300">
   
[❖ Table of Contents](./0-index.md)</td>
   <td align="center" width="300">

[Making Requests →](./3-requests.md)</td>
  </tr>
</table>

## Overview

WarpDrive is the data framework for building ambitious applications.

What do we mean by ambitious? WarpDrive is ideal for applications looking to be best-in-class: whether that's a small todo app, e-commerce, a social app, or an enterprise b2b software solution.

WarpDrive seamlessly handles and simplifies the hardest parts of state management when building an app, helping you focus on creating the features and user experiences that drive value.

Our innovative approach to [fine grained reactivity](https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf) enables rapidly developing robust, performant web applications using any [Signals](https://github.com/tc39/proposal-signals#readme) compatible framework such as [Ember](https://guides.emberjs.com/release/in-depth-topics/autotracking-in-depth/), (and 🔜) [Svelte](https://svelte.dev/docs/svelte/what-are-runes), [Angular](https://angular.dev/guide/signals), [Vue.js](https://vuejs.org/guide/extras/reactivity-in-depth.html), [SolidJS](https://www.solidjs.com/tutorial/introduction_signals),
[Preact](https://preactjs.com/guide/v10/signals/) or [Lit](https://lit.dev/docs/data/signals/).

```hbs
  Hello {{@user.name}}!
```

By building around the same interface as the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), WarpDrive makes powerful request management features like caching, deduping and data normalization feel simple to use. We pair this with [reactive control flow](./concepts/reactive-control-flow.md) to give apps the ability to declaratively derive states with safety.

```glimmer-ts
import { Request } from '@warp-drive/ember';
import { findRecord } from '@ember-data/json-api/request';
import { Spinner } from './spinner';

export default <template>
  <Request @query={{findRecord "user" "1"}}>
    <:error as |error state|>
      <h2>Whoops!</h2>
      <h3>{{error.message}}</h3>
      <button {{on "click" state.retry}}>Try Again?</button>
    </:error>

    <:content as |result|>
      Hello {{result.data.name}}!
    </:content>

    <:loading as |state|>
      <Spinner @progress={{state.completedRatio}} />
      <button {{on "click" state.abort}}>Cancel?</button>
    </:loading>
  </Request>
</template>
```

**Web clients are like high-latency, remotely distributed, often-stale partial replicas of server state**. WarpDrive provides an [advanced relational cache](./5-caching.md) that simplifies these problems--solving them when it can and providing intelligent escape valves for when it can't. No matter what, you can quickly **get the data you need in the right state**.

WarpDrive's reactive objects transform raw cached data into rich, reactive data. The resulting objects are immutable, always displaying the latest state in the cache while preventing accidental or unsafe mutation in your app. The output and [transformation](./concepts/transformation.md) is controlled by a simple JSON [ResourceSchema](./concepts/schemas.md).

```ts
import { withDefaults } from '@warp-drive/schema-record';

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

[Mutation](./concepts/mutations.md) is handled within controlled contexts. The data to edit is "checked out" for editing, giving access to a mutable version. Local edits are seamlessly preserved if the user navigates away and returns without saving, and the changes are buffered from appearing elsewhere in your app until they are also committed to the server.

```ts
import { Checkout } from '@warp-drive/schema-record';

// ...

const editable = await user[Checkout]();
editable.firstName = 'Chris';
```

WarpDrive is only semi-opinionated about your API. Almost every API is compatible just by authoring a [request handler](./concepts/handlers.md) to ensure that the responses are normalized into the cache format.

```ts
const NormalizeKeysHandler = {
  request(context, next) {
    return next(context.request).then((result) => {
      return convertUnderscoredKeysToCamelCase(result.content);
    });
  }
}
```

WarpDrive offers both a JS and a Component based way of making requests and working with the result. Above we saw
how to generate a request in component form. Here's how we can generate the same request using plain JavaScript.

```ts

// setup a store for the app
import Store from '@ember-data/store';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

class AppStore extends Store {
  requestManager = new RequestManager().use([Fetch])
}

// -------<elsewhere>--------

// make use of the store
import { findRecord } from '@ember-data/json-api/request';

const request = store.request(
  findRecord('user', this.args.id)
);

const result = await request;
```

You may be thinking "what is store and where did that come from"? The [store]() helps us to manage our data and cache responses. The store is something that you will configure for your application. Our component usage above is also using our application's store, a detail we will explore further in later sections.

If using an app-specific cache format would work better for the demands of your API, the [cache](https://github.com/emberjs/data/blob/main/packages/core-types/src/cache.ts) the store should use is customizable:

```ts
import Store from '@ember-data/store';
import { CustomCache } from './my-custom-cache';

class AppStore extends Store {
  createCache(capabilities) {
    return new CustomCache(capabilities);
  }
}
```

Realtime subscriptions are supported through an extensive list of [operations](./concepts/operations.md) for surgically updating cache state, as well as by a comprehensive [notifications service]() which alerts us to when data has been added, updated or removed from the cache allowing subscriptions to dynamically adjust as needed.

```ts
store.cache.patch({
  op: 'add',
  record: User1Key,
  field: 'friends',
  value: User2Key
});
```

WarpDrive has been designed as a series of interfaces following the single-responsibility principle with well defined boundaries and configuration points. Because of this, nearly every aspect of the library is configurable, extensible, composable, replaceable or all of the above: meaning that if something doesn't meet your needs out-of-the-box, you can configure it to.

The list of features doesn't end here. This guide will teach you the basics of everything you need to know, but if you find yourself needing more help or with a question you can't find the answer to, ask on [GitHub](https://github.com/emberjs/data/issues), in our [forum](https://discuss.emberjs.com/) or on [discord](https://discord.gg/zT3asNS).


<br>

---

<br>

<table>
  <tr>
    <td align="center" width="300"></td>
    <td align="center" width="300">
   
[❖ Table of Contents](./0-index.md)</td>
   <td align="center" width="300">

[Making Requests →](./2-requests.md)</td>
  </tr>
</table>
