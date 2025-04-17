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

Its innovative approach to [fine grained reactivity](https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf) enables rapidly developing robust, performant web applications using any signals compatible framework such as [Ember](https://guides.emberjs.com/release/in-depth-topics/autotracking-in-depth/), [Svelte](https://svelte.dev/), [Angular](https://angular.dev/guide/signals), [Vue.js](https://vuejs.org/guide/extras/reactivity-in-depth.html), [SolidJS](https://www.solidjs.com/tutorial/introduction_signals),
[Preact](https://preactjs.com/guide/v10/signals/) or [Lit](https://lit.dev/docs/data/signals/).

```gts
import { Request } from '@warp-drive/ember';
import { findRecord } from '@ember-data/json-api/request';

export default <template>
  <Request @query={{findRecord "user" "1"}}>
    <:content as |result|>
      {{!-- whenever anything makes the user's name change, this value will update --}}
      {{result.data.name}}
    </:content>
  </Request>
</template>
```

By building around the same interface as the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), WarpDrive makes powerful request management features like caching, deduping and data normalization feel simple to use.

Web clients are like high-latency, remotely distributed, often-stale partial replicas of server state - but requests using WarpDrive utilize an [advanced relational cache](./5-caching.md) that simplifies these problems, solving them when it can and providing intelligent escape valves for when it can't so that no matter what you can quickly get the data you need in the right state.

WarpDrive's reactive objects transform the raw data from an [associated cache](https://github.com/emberjs/data/blob/main/packages/core-types/src/cache.ts)
into reactive data backed by [Signals](https://github.com/tc39/proposal-signals#readme).

The shape of these reactive objects and the [transformation](./concepts/transformation.md) of raw cache data into its
reactive form is controlled by a [ResourceSchema](./concepts/schemas.md).

ResourceSchemas are simple JSON, allowing them to be defined and delivered from anywhere.

[Requests](./concepts/requests.md) and [Mutations](./concepts/mutations.md)  [upserts](./5-caching.md) the responses into an advanced [relational](../relationships/index.md) cache.



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
