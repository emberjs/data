# Incremental adoption guide for existing projects

- ⮐ [Cookbook](./index.md)

This guide is for existing projects that want to adopt the new APIs of the EmberData incrementally.

## Step 1: Upgrade to EmberData 4.12.x

This version of EmberData is the first version that supports the new APIs. It is also a LTS version, so you can stay on it for a while. You can refer the [EmberData Compatibility table](https://github.com/emberjs/data/blob/main/README.md#compatibility) to see which version of EmberData is compatible with your Ember version.

## Step 2: Add `Store` service to your application

You will need to create your own store service. Before, a store service was automatically injected by EmberData.
Here is how you do it:

```js
// eslint-disable-next-line ember/use-ember-data-rfc-395-imports
import Store from 'ember-data/store';

export default class AppStore extends Store {}

```

Notice we still want to import the `Store` class from `ember-data/store` package. You might have a lint rule that says don't do it. You can disable it for this import. The reason we want to import it from `ember-data/store` is because we want to use EmberData models, serializers, adapters, etc. while alongside we want to start utilizing new APIs.

> Note: You can also use `@ember-data/store` package, but you will need to configure a lot more to make things work to use old APIs. We recommend using `ember-data/store` package to avoid confusion.

> Note: Because we are extending `ember-data/store`, it is still v1 addon, so things might not work for you if you are using typescript. We recommend to have `store.js` file for now.

## Step 3: Add `RequestManager` to your application

Now let's configure a `RequestManager` for our store. The RequestManager is responsible for sending requests to the server. It fulfills requests using a chain-of-responsibility pipeline, which means you can add your own request handlers to it.

First you need to install [`@ember-data/request`](https://github.com/emberjs/data/tree/main/packages/request) and [`@ember-data/legacy-compat`](https://github.com/emberjs/data/tree/main/packages/legacy-compat) packages. The first contains the `RequestManager` service and a few request handlers, while the second has `LegacyNetworkHandler` that will handle all old-style `this.store.*` calls.

Here is how your own `RequestManager` service may look like:

```ts
// eslint-disable-next-line ember/use-ember-data-rfc-395-imports
import Store from 'ember-data/store';

import { CacheHandler } from '@ember-data/store';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import type { Handler, NextFn, RequestContext } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

/* eslint-disable no-console */
const TestHandler: Handler = {
  async request<T>(context: RequestContext, next: NextFn<T>) {
    console.log('TestHandler.request', context.request);
    const result = await next(Object.assign({}, context.request));
    console.log('TestHandler.response after fetch', result.response);
    return result;
  },
};

export default class AppStore extends Store {
  requestManager = new RequestManager()
    .use([LegacyNetworkHandler, TestHandler, Fetch])
    .useCache(CacheHandler);
}

```

Let's go over the code above:

1. `LegacyNetworkHandler` is the handler that is responsible for sending requests to the server using the old APIs. It will interrupt handlers chain if it detects request using old APIs. It will process it as it used to be doing with Adapters/Fetch/Serializers workflow.

2. Next is `TestHandler`. It is a handler that is responsible for logging requests. It is a quick example of how you can add your own handlers to the request manager. We will take a look at more useful examples later.

3. Lastly `Fetch`. It is a handler that sends requests to the server using the `fetch` API. It expects responses to be JSON and when in use it should be the last handler you put in the chain. After finishing each request it will convert the response into json and pass it back to the handlers chain in reverse order as the request context's response. So `TestHandler` will receive `response` property first, and so on if we would have any.

The CacheHandler is a special handler that enables requests to fulfill from and update the cache associated to this store.

You can read more about request manager in the [request manager guide](../requests/index.md).

## Step 4: Install `@ember-data/json-api`, `@ember-data/request-utils` packages

If you were using JSON:API adapter/serializer for your backend communication, you can use `@ember-data/json-api` package. It is a package that contains predefined builders for JSON:API requests. You can read more about it in the [`@ember-data/json-api`](https://github.com/emberjs/data/tree/main/packages/json-api).

If you have different backend format - EmberData provides you with builders for `REST`([`@ember-data/rest`](https://github.com/emberjs/data/tree/main/packages/rest)) and `ActiveRecord`([`@ember-data/active-record`](https://github.com/emberjs/data/tree/main/packages/active-record)).

`@ember-data/request-utils` package contains a lot of useful utilities for building requests. You can read more about it in its [Readme](https://github.com/emberjs/data/tree/main/packages/request-utils#readme). It has request builders for all type of requests.

## Step 5: Off you go! Start using new APIs

Now you can start refactoring old code to use new APIs. You can start with the `findAll` method. It is the easiest one to refactor. Here is how you do it:

```diff app/components/projects/list.ts
+ import { query } from '@ember-data/json-api/request';

  loadProjects: Task<void, []> = task(async () => {
-    const projects = await this.store.findAll('project');
-    this.projects = [...projects];
+    const { content } = await this.store.request(query('project', {}, { host: config.api.host }));
+    this.projects = content.data;
  });
```

You most likely would need to add Auth Handler to your request manager to add `accessToken` to your requests.
Let's say you have your `accessToken` in the `session` service. Here is how you can add it to the request manager:

```js
import { service } from '@ember/service';

export default class AuthHandler {
  @service session;

  request({ request }, next) {
    const headers = new Headers(request.headers);
    headers.append(
      'Authorization',
      `Bearer ${this.session.accessToken}`,
    );

    return next(Object.assign({}, request, { headers }));
  }
}
```

You can read more about auth topic [here](../requests/examples/1-auth.md).

Another good thing to do is to configure default host and namespace for your requests. There is an utility for that out of the box of `@ember-data/request-utils` called [`setBuildURLConfig`](https://github.com/emberjs/data/blob/main/packages/request-utils/src/index.ts#L67). You can do it anywhere in your app theoretically, but we recommend doing it in the `app/app.js` file. Here is how you can do it:

```diff app/app.js
import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from 'base-ember-typescript-app/config/environment';
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

---

- ⮐ [Cookbook](./index.md)
