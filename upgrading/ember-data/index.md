---
title: Migrating from ember-data
description: Move an app on ember-data 1.x through 4.12 to the latest WarpDrive one route at a time, running a second `@warp-drive/*` store beside ember-data until ember-data can be removed.
outline:
  level: 2,3
---

# Migrating from ember-data

<SinceBadge version="5.9.0" /> &nbsp; authored 2026-09-24

This guide is for apps on any `ember-data` release from 1.x through 4.12 that want to move straight
to the latest WarpDrive, without stopping at the versions in between. The app itself must run
`ember-source` 3.28.12 or later, the lowest version the latest WarpDrive supports (see the
[compatibility table](https://github.com/warp-drive-data/warp-drive/blob/main/README.md#ember-compatibility)).

::: tip On 4.13?
`ember-data` 4.13, published only as `v4-canary` alphas, already shares package names with WarpDrive, so follow
[Migrating 4.x to 5.x](/upgrading/v5/index.md) with its mirror packages instead.
:::

An app can run more than one store at once. Each store owns its own cache, its own schemas, and
its own request pipeline, so a second store is a place to put the setup you are moving toward
while the first one keeps serving the code you have not touched yet. You migrate one route at a
time instead of landing one enormous change.

To adopt newer APIs inside the store you already have, without a second one, see
[Adopting the Request APIs on 4.12](/upgrading/ember-data/incremental-adoption.md) instead.

## Set up the second store

Releases up to 4.12 publish only `ember-data` and `@ember-data/*` packages, and the latest
WarpDrive publishes `@warp-drive/*` packages. No package name appears on both sides, so the two
versions install side by side, and the second store uses `@warp-drive/core`,
`@warp-drive/json-api`, `@warp-drive/ember`, `@warp-drive/legacy` and `@warp-drive/utilities`
directly. You don't need the mirror packages.

Configure the second store first. It needs a full configuration of its own, covering presentation
hooks, schemas, the request manager, and the cache. The [Migration](/upgrading/v5/index.md#migration)
steps of the 4.x to 5.x guide install, build-configure and set up that store. They are written for
mirror packages, so wherever they name a `@warp-drive-mirror/*` package, in an install command, an
import, or the build config, use the matching `@warp-drive/*` package instead. The five packages
above are the whole install. `@warp-drive/build-config` arrives as a dependency of `@warp-drive/core`.

Use the "Coming from 4.12" shape of Step 4, with `legacyRequests: true`, for the migrating store.
Leave `linksMode` off for now. A store set up with `linksMode: true` fails `store.createRecord`
with the assertion `useLegacyStore was setup in linksMode`, because `createRecord` asks
`adapterFor` whether an adapter wants to assign an id, and that lookup trips the assertion
([#11230](https://github.com/warp-drive-data/warp-drive/pull/11230) fixes it). Turn `linksMode` on
once that release is what you install.

The existing `ember-data` install keeps providing the `store` service. The rest of this guide
calls the new one `v2-store`, matching the naming the 4.x to 5.x guide uses.
[The Two Store Approach](/upgrading/v5/two-store-migration.md) covers TypeScript setup and what
running two copies of the library costs you. Read its mirror package names the same way.

## Keep each screen on one store

A record from one store cannot be set as a relationship value on a record from the other, because
each store has its own cache. Loading the same resource into both stores is fine. Linking across
them is not. See [Caveat Emptor](/upgrading/v5/two-store-migration.md#caveat-emptor) for the rest
of the constraints.

That constraint is what decides the order of the work. Move a vertical slice at a time, such as one
route and everything below it, so every record in a single render comes from one store.

## Move one route at a time

A route that already encapsulates its slice needs one line changed. Swap which store it injects.

```diff
// app/routes/authenticated/logs.js
 export default class LogsRoute extends Route {
-  @service store;
+  @service('v2-store') store;

   async model() {
     // unchanged
   }
 }
```

Everything the route loads now comes from the new store. Pick slices whose records stay inside the
slice. A route whose model is linked into a sidebar rendered by the rest of the app is the wrong
place to start.

## Push the boundary down with contexts

Injecting `v2-store` works until a component below the route needs the same store. Rewriting every
descendant to inject `v2-store` by name means rewriting them again when the old store is gone.

[ember-provide-consume-context](https://github.com/customerio/ember-provide-consume-context) solves
this. Provide `store` once at the top of the slice and let descendants consume it under that name,
so the descendants never encode which store they are on. Kevin Kucharczyk's EmberConf 2024 talk
[Contextualizing State](https://www.youtube.com/watch?v=ptCNK4ICxJ0) covers the pattern in depth.

Install `ember-provide-consume-context@^0.10.0`, the range `@warp-drive/ember` declares as an
optional peer dependency. Its `<Request>` and `<Paginate>` components read the store from the same
`store` context, so providing it once serves them too.

```js
// app/components/logs-section.js
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { provide } from 'ember-provide-consume-context';

export default class LogsSectionComponent extends Component {
  @service('v2-store') v2Store;

  @provide('store')
  get store() {
    return this.v2Store;
  }
}
```

If the slice has no component of its own, provide the value inline instead. The template reads the
service from its controller.

```js
// app/controllers/authenticated/logs.js
import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class LogsController extends Controller {
  @service('v2-store') v2Store;
}
```

```hbs
{{! app/templates/authenticated/logs.hbs }}
<ContextProvider @key="store" @value={{this.v2Store}}>
  <LogsList />
</ContextProvider>
```

Descendants then consume the store rather than injecting it.

```diff
// app/components/logs-list.js
 import { consume } from 'ember-provide-consume-context';

 export default class LogsListComponent extends Component {
   @service session;
-  @service store;
+  @consume('store') store;

   get groupedEntries() {
     // unchanged
   }
 }
```

`@consume` returns `undefined` when nothing above the component provides that key, so a component
rewritten this way only works inside a provider. Convert a component once every one of its render
trees provides `store`, or give it a fallback as shown in the next section. When the old store is
gone, delete the provider and change `@consume('store')` back to `@service store`.

## Shared components that serve both sides

A leaf component used from migrated and unmigrated parts of the app is the hard case. It gets a
record from whichever store its context provides, and it may have to hand that record to a caller
living in the other store.

Give the component a fallback for the unmigrated side, then translate at that one point.

```js
// app/components/stateful-button.js
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { cacheKeyFor } from '@warp-drive/core';
import { consume } from 'ember-provide-consume-context';
import { createRecord } from '@warp-drive/utilities/json-api';

export default class StatefulButtonComponent extends Component {
  @service('store') v1Store;
  @service('v2-store') v2Store;
  @consume('store') contextStore;

  get store() {
    return this.contextStore ?? this.v1Store;
  }

  get isMigrated() {
    return this.store === this.v2Store;
  }

  get needsV1Record() {
    // true while the code that receives `onCreate` still lives on the old store;
    // the template that renders this leaf knows, so it passes that in
    return this.args.callerOnV1 === true;
  }

  async createEntry(params) {
    const record = this.store.createRecord('log-entry', params);

    if (!this.isMigrated) {
      // the unmigrated side saves through ember-data's own adapter
      await record.save();
      await this.args.onCreate(record);
      return;
    }

    // the mutation builders set the url, method and headers but leave the body to the app
    const init = createRecord(record);
    init.body = JSON.stringify({ data: this.store.cache.peek(cacheKeyFor(record)) });
    await this.store.request(init);

    let result = record;

    if (this.needsV1Record) {
      // `onCreate` belongs to unmigrated code, which only understands v1 records
      result = await this.v1Store.findRecord('log-entry', record.id, { reload: true });
    }

    await this.args.onCreate(result);
  }
}
```

The branch on `isMigrated` comes first because `cacheKeyFor`, the mutation builders, and every
other `@warp-drive/*` helper accept only records the WarpDrive store created. Handing them a record
from the `ember-data` store throws `is not a ReactiveResource or Model known to WarpDrive`. The
unmigrated side keeps saving the way it always did.

`cache.peek` returns the resource with each relationship as a `{ type, id, lid }` identifier, so
the body is safe to serialize even when the record has an inverse. For a new record it carries
`id: null` and the client-side `lid`. Most servers ignore members they don't know. If yours rejects
them, build `data` by hand from the attributes and relationship identifiers you mean to send.

The re-fetch through `v1Store` applies only when the caller is itself unmigrated. A route whose
controller and components have all moved receives `v2-store` records from this leaf and needs no
translation, so a shared leaf often needs only the fallback. When the re-fetch does apply, that
second request fetches data you already hold. It is the cost of translating across the boundary,
which is the argument for moving the boundary instead. Treat this pattern as an escape hatch, and
prefer reshaping the slice so the whole interaction lands in one store.

## Finishing the migration

Once the last slice moves, remove `ember-data` and the `@ember-data/*` packages along with their
build config, delete the old store service, then rename `v2-store` to `store` so injections and
providers collapse back to the default. That is the
[Post Migration](/upgrading/v5/index.md#post-migration) checklist of the 4.x to 5.x guide minus
its last step, because your imports are already `@warp-drive/*`.

Because each store is configured independently, the second store is also where you drop what you
no longer want. Adapters, serializers, and `Model` can stay in the old store and never be installed
in the new one.

Tests written for the migration itself go with it. A test that asserts the two stores resolve as
distinct services, or that a record cannot cross from one to the other, describes a state that no
longer exists once the second store is the only one. Delete those tests in the same change that
deletes the old store, and keep the tests that cover the behavior each slice has on its own.
