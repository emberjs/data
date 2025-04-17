<table>
  <tr>
    <td align="center" width="300">

[← Why](./1-why.md)</td>
   <td align="center" width="300">
   
[❖ Table of Contents](./0-index.md)</td>
   <td align="center" width="300">

[Making Requests →](./3-requests.md)</td>
  </tr>
</table>

## Overview

The capabilities WarpDrive provides will simplify even the most complex parts of your app's state management.

Its innovative approach to [fine grained reactivity](https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf) enables rapidly developing robust, performant web applications using any [Signals](https://github.com/tc39/proposal-signals#readme) compatible framework such as [Ember](https://guides.emberjs.com/release/in-depth-topics/autotracking-in-depth/), [Svelte](https://svelte.dev/), [Angular](https://angular.dev/guide/signals), [Vue.js](https://vuejs.org/guide/extras/reactivity-in-depth.html), [SolidJS](https://www.solidjs.com/tutorial/introduction_signals),
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

Web clients are like high-latency, remotely distributed, often-stale partial replicas of server state - but requests using WarpDrive utilize an [advanced relational cache](./5-caching.md) that simplifies these problems, solving them when it can and providing intelligent escape valves for when it can't so that no matter what you can quickly get the data you need in the right state.

WarpDrive's reactive objects transform raw cached data into rich, reactive data. The resulting objects are immutable, always displaying the latest state in the cache while preventing accidental or unsafe mutation in your app. The output and [transformation](./concepts/transformation.md) is controlled by a simple JSON [ResourceSchema](./concepts/schemas.md).

[Mutation](./concepts/mutations.md) is handled within controlled contexts. The data to edit is "checked out" for editing, giving access to a mutable version. Local edits are seamlessly preserved if the user navigates away and returns without saving, and the changes are buffered from appearing elsewhere in your app until they are also committed to the server.

```ts
import { Checkout } from '@warp-drive/schema-record';

// ...

const editable = await user[Checkout]();
editable.firstName = 'Chris';
```

WarpDrive is only semi-opinionated about your API. Almost every API is compatible just by authoring a [request handler](./concepts/handlers.md) to ensure that the responses are normalized into the cache format, while the [cache](https://github.com/emberjs/data/blob/main/packages/core-types/src/cache.ts) itself is also pluggable if using a different cache format would work better for the demands of your API. Realtime subscriptions are supported through an extensive list of [operations](./concepts/operations.md) for surgically updating cache state.

WarpDrive has been designed as a series of interfaces following the single-responsibility principle with well defined boundaries and configuration points. Because of this, nearly every aspect of the library is configurable, extensible, composable, replaceable or all of the above: meaning that if something doesn't meet your needs out-of-the-box, you can configure it to.

<br>

---

<br>

<table>
  <tr>
    <td align="center" width="300">

[← Why](./1-why.md)</td>
   <td align="center" width="300">
   
[❖ Table of Contents](./0-index.md)</td>
   <td align="center" width="300">

[Making Requests →](./3-requests.md)</td>
  </tr>
</table>
