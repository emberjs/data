---
title: Using "Just Fetch"
order: 9
draft: true
---

# Using "Just Fetch"

Throughout this guide we've shown usage of the `RequestManager` in context of a `Store`.

::: code-group

```ts [Setup]
import Store, { CacheHandler} from '@ember-data/store';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

export default class AppStore extends Store {

  requestManager = new RequestManager()
    .use([Fetch])
    .useCache(CacheHandler);

}
```

```ts [Usage]
store.request({ url: '/users' })
```

:::

This is because most applications will want access to features only available when
using the store such as reactive-data, advanced caching, and relational mapping.

Out of the box, the entire ***Warp*Drive** experience is optimized to be small and
fast. However, if all your application needs is a pipeline to help you manage requests
in a conventional way (or that plus reactive promise states / reactive control flow) then
its possible to use an even more minimal ***Warp*Drive** setup.

This guide covers how to do so.
