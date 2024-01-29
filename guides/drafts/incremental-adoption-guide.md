# Incremental adoption guide for existing projects

Nav links

---

This guide is for existing projects that want to adopt the new APIs of the EmberData incrementally. If you are starting a new project, you should use the [new project guide](./new-project-guide.md).

## Step 1: Upgrade to EmberData 4.12.x

This version of EmberData is the first version that supports the new APIs. It also a LTS version, so you can stay on it for a while. You can refer the [EmberData Compatibility table](https://github.com/emberjs/data/blob/main/README.md#compatibility) to see which version of EmberData is compatible with your Ember version.

## Step 2: Add `Store` service to your application

You would need to create you own store service. Before it was automatically injected by Ember Data. 
Here is how you do it:

```ts
// eslint-disable-next-line ember/use-ember-data-rfc-395-imports
import Store from 'ember-data/store';
import { service } from '@ember/service';
import RequestManager from '@ember-data/request';

export default class MyStore extends Store {
  @service declare requestManager: RequestManager;
}

```

Notice we still want to import the `Store` class from `ember-data/store` package. You might have a lint rule that says don't do it. You can disable it for this import. The reason we want to import it from `ember-data/store` is because we want to use Ember Data models, serializers, adapters, etc. and alongside we want to start utilizing new APIs.

## Step 3: Add `RequestManager` service to your application

Now let's create our very own `RequestManager` service. It is a service that is responsible for sending requests to the server. It is a composable class, which means you can add your own request handlers to it. In the example below we are adding `LegacyNetworkHandler`, `TestHandler` and `Fetch` handlers.

```ts
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import { CacheHandler } from 'ember-data/store';
import { setBuildURLConfig } from '@ember-data/request-utils';

const TestHandler = {
  async request({ request }, next) {
    console.log('TestHandler.request', request);

    const newContext = await next(request);

    console.log('TestHandler.response after fetch', newContext.response);

    return next(newContext);
  },
};

export default class Requests extends RequestManager {
  constructor(args) {
    super(args);
    this.use([LegacyNetworkHandler, TestHandler, Fetch]);
    this.useCache(CacheHandler);
  }
}
```

Let's go over the code above:

1. `LegacyNetworkHandler` is the handler that is responsible for sending requests to the server using the old APIs. It will interrupt handlers chain if it detects request using old APIs. It will process it as it used to be doing with Adapters/Fetch/Serializers workflow.

2. Next is `TestHandler`. It is a handler that is responsible for logging requests. It is a quick example of how you can add your own handlers to the request manager. We will take a look at more useful examples later.

3. Lastly `Fetch`. It is a handler that is responsible for sending requests to the server using the new Ember Data APIs. It must be last handler you put in the chain. After finishing request it will enrich handlers context with `response` property. And pass it back to the handlers chain in reverse order. So `TestHandler` will receive `response` property first, and so on if we would have any.

You can read more about request manager in the [request manager guide](./request-manager-guide.md).

## Step 4: Install `@ember-data/json-api`, `@ember-data/request-utils` packages

If you was using JSON:API adapter/serializer for your backend communication, you can use `@ember-data/json-api` package. It is a package that contains predefined builders for JSON:API requests. You can read more about it in the [`@ember-data/json-api` guide](TODO: add link).

If you have different backend format - Ember Data provides you with builders for `REST`(@ember-data/rest) and `ActiveRecord`(@ember-data/active-record).

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

```js auth-handler.js
import { inject as service } from '@ember/service';

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

