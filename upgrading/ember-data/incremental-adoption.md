---
title: Adopting the Request APIs on 4.12
legacy: true
legacyAdvice: "New code should set up its store as shown in [Setup](/guides/configuration/index.md) and make requests as shown in [Making Requests](/guides/the-manual/requests/index.md)."
description: Stay on ember-data 4.12 and adopt its request APIs in the store you already have, adding a store service, your own request handlers, and `@ember-data/request-utils` one call at a time.
---

# Adopting the Request APIs on 4.12

<SinceBadge version="4.12.0" /> &nbsp; authored 2024-03-23, revised 2026-09-24

This guide is for apps on `ember-data` that want to adopt the new request APIs incrementally,
inside the store they already have, while staying on 4.12.

To move to the latest WarpDrive one route at a time instead, running it beside your current
`ember-data`, see [Migrating from ember-data](/upgrading/ember-data/index.md).

## Step 1: Upgrade to WarpDrive 4.12.x

This version of WarpDrive, published as the `ember-data` package, is the first version that supports the new APIs. It is also an LTS version, so you can stay on it for a while. See the [compatibility table](https://github.com/warp-drive-data/warp-drive/blob/main/README.md#ember-compatibility) for the Ember versions each WarpDrive release supports.

Everything below is written against 4.12.8, the last 4.12 release. The request builders ([`findRecord`](/api/@warp-drive/utilities/json-api/functions/findRecord), [`query`](/api/@warp-drive/utilities/json-api/functions/query) and the rest) and the `@ember-data/rest` and `@ember-data/active-record` packages arrived in 5.3, so on 4.12 you build each request yourself.

## Step 2: Add a `Store` service to your application

Create your own store service. Until now `ember-data` provided one for you:

```js [app/services/store.js]
// eslint-disable-next-line ember/use-ember-data-rfc-395-imports
import Store from 'ember-data/store';

export default class AppStore extends Store {}
```

Import the [`Store`](/api/@warp-drive/core/classes/Store) class from `ember-data/store`, even if a lint rule tells you not to, and disable the rule for this import. That class keeps your models, adapters and serializers working while you start using the new APIs beside them.

> Note: You can extend `@ember-data/store` instead, but then you have to configure the legacy APIs yourself. `ember-data/store` does it for you.

> Note: `ember-data/store` is a v1 addon and 4.12 ships no types for it, so keep this file as `store.js` even in a TypeScript app.

## Step 3: Add your own handlers to the `RequestManager`

The store sends requests through a [`RequestManager`](/api/@warp-drive/core/classes/RequestManager), which fulfills them with a chain-of-responsibility pipeline of handlers. The store from `ember-data/store` already sets one up with [`LegacyNetworkHandler`](/api/@warp-drive/legacy/compat/variables/LegacyNetworkHandler), [`Fetch`](/api/@warp-drive/core/variables/Fetch) and [`CacheHandler`](/api/@warp-drive/core/variables/CacheHandler). To add handlers of your own, you replace it with one that lists yours too.

`ember-data` already depends on `@ember-data/request`, `@ember-data/legacy-compat` and `@ember-data/store`. Add them to your app's own `package.json`, at the same version as `ember-data`, so that your app can import from them:

```sh
pnpm add @ember-data/request@4.12.8 @ember-data/legacy-compat@4.12.8 @ember-data/store@4.12.8
```

Then set up the `RequestManager` in the store's constructor:

```js [app/services/store.js]
// eslint-disable-next-line ember/use-ember-data-rfc-395-imports
import Store from 'ember-data/store';
import { CacheHandler } from '@ember-data/store';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

/* eslint-disable no-console */
const LogHandler = {
  async request(context, next) {
    console.log('LogHandler.request', context.request);
    const result = await next(context.request);
    console.log('LogHandler.response', result.response);
    return result;
  },
};

export default class AppStore extends Store {
  constructor(args) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, LogHandler, Fetch]);
    this.requestManager.useCache(CacheHandler);
  }
}
```

In 4.12, `use()` and `useCache()` return nothing, so call each one on its own line rather than chaining them.

Here is what each handler does:

1. `LegacyNetworkHandler` handles requests that come from the old APIs, like `store.findAll` or `record.save()`. It fulfills them through your adapters and serializers, as before, and stops the chain there. Any other request goes on to the next handler.
2. `LogHandler` logs each request and its response. It shows how to write a handler of your own; the auth handler in Step 5 is a more useful one.
3. `Fetch` sends the request with the `fetch` API and parses the response as JSON. It must be the last handler in the chain. Its result travels back through the handlers in reverse order, so `LogHandler` sees the response after `Fetch` returns it.

`CacheHandler` sits in front of the chain. It fulfills requests from the store's cache when it can, and it puts every response it receives into that cache. In 4.12 the store's cache is the JSON:API cache, so a response must be a JSON:API document by the time it reaches `CacheHandler`. If your API uses another format, add a handler that converts the response.

To learn more about the `RequestManager`, see [Making Requests](/guides/the-manual/requests/index.md). That guide describes the current release, so some APIs in it are newer than 4.12.

## Step 4: Install `@ember-data/request-utils`

`@ember-data/request-utils` is not a dependency of `ember-data` 4.12, so install it yourself:

```sh
pnpm add @ember-data/request-utils@4.12.8
```

In 4.12 it provides the building blocks for URLs:

- [`setBuildURLConfig`](/api/@warp-drive/utilities/functions/setBuildURLConfig) sets the default `host` and `namespace`.
- [`buildBaseURL`](/api/@warp-drive/utilities/functions/buildBaseURL) builds the URL for an operation on a resource type.
- [`buildQueryParams`](/api/@warp-drive/utilities/functions/buildQueryParams) serializes query params in a stable order, so that the same query always produces the same URL and the same cache key.

Configure the default host and namespace once, as the app boots. `app/app.js` is a good place:

```diff [app/app.js]
 import Application from '@ember/application';
 import Resolver from 'ember-resolver';
 import loadInitializers from 'ember-load-initializers';
 import config from 'my-app/config/environment';
+import { setBuildURLConfig } from '@ember-data/request-utils';
+
+setBuildURLConfig({
+  host: 'https://api.example.com',
+  namespace: 'v1',
+});

 export default class App extends Application {
   modulePrefix = config.modulePrefix;
   podModulePrefix = config.podModulePrefix;
   Resolver = Resolver;
 }

 loadInitializers(App, config.modulePrefix);
```

## Step 5: Start using the new APIs

Now you can move code to the new APIs one call at a time. `findAll` is the easiest to start with:

```diff [app/components/projects/list.js]
+import { buildBaseURL } from '@ember-data/request-utils';

   async loadProjects() {
-    const projects = await this.store.findAll('project');
-    this.projects = [...projects];
+    const url = buildBaseURL({ op: 'query', identifier: { type: 'project' }, resourcePath: 'projects' });
+    const { content } = await this.store.request({ url, method: 'GET' });
+    this.projects = content.data;
   }
```

`buildBaseURL` uses the type as the path unless you pass `resourcePath`, and it doesn't pluralize, so pass `resourcePath` when your API's paths differ from your type names. `content.data` holds the records, the same ones `findAll` would return.

To filter the list, add query params with `buildQueryParams`. In 4.12 it serializes strings, numbers, booleans and arrays but not nested objects, so write a JSON:API filter as a flat bracketed key:

```js
import { buildBaseURL, buildQueryParams } from '@ember-data/request-utils';

const url = buildBaseURL({ op: 'query', identifier: { type: 'project' }, resourcePath: 'projects' });
const query = buildQueryParams({ 'filter[status]': 'active', include: ['owner'] });
const { content } = await this.store.request({ url: `${url}?${query}`, method: 'GET' });
```

Your API most likely needs an access token on each request. Say the token lives on a `session` service. A handler can add it:

```js [app/services/store.js]
// eslint-disable-next-line ember/use-ember-data-rfc-395-imports
import Store from 'ember-data/store';
import { getOwner } from '@ember/application';
import { CacheHandler } from '@ember-data/store';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

function authHandler(owner) {
  return {
    request({ request }, next) {
      const session = owner.lookup('service:session');
      const headers = new Headers(request.headers);
      headers.append('Authorization', `Bearer ${session.accessToken}`);
      return next(Object.assign({}, request, { headers }));
    },
  };
}

export default class AppStore extends Store {
  constructor(args) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, authHandler(getOwner(this)), Fetch]);
    this.requestManager.useCache(CacheHandler);
  }
}
```

`LegacyNetworkHandler` comes first, so requests from the old APIs never reach `authHandler`. Your adapters keep adding their own headers for those. For more patterns, see [Auth Handlers](/guides/the-manual/cookbook/auth-handlers.md).
