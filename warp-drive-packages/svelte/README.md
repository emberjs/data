<p align="center">
  <img
    class="project-logo"
    src="./logos/NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="./logos/NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">:electron: Data utilities for using <em style="color: lightgreen">Warp</em><strong style="color: magenta">Drive</strong> with ⚡️ <em style="color: orange">Svelte</em></h3>

---

```cli
pnpm install -E @warp-drive/svelte@latest
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40warp-drive%2Fsvelte/canary?label=@canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40warp-drive%2Fsvelte/beta?label=@beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40warp-drive%2Fsvelte/latest?label=@latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40warp-drive%2Fsvelte/lts?label=@lts&color=0096FF)
- ![NPM LTS-4-12 Version](https://img.shields.io/npm/v/%40warp-drive%2Fsvelte/lts-4-12?label=@lts-4-12&color=bbbbbb)

## How to use

### 1. Set up a store context

Subclass the Warp Drive store and override the methods you need to customize. See the [Warp Drive docs](https://docs.warp-drive.io/guides/1-configuration/2-setup/1-universal) for a more detailed explanation.

```ts
// src/store.ts
import { Fetch, RequestManager, Store as WarpStore } from '@warp-drive/core';
import { instantiateRecord, registerDerivations, SchemaService, teardownRecord } from '@warp-drive/core/reactive';
import type { CacheCapabilitiesManager, ResourceKey } from '@warp-drive/core/types';
import { JSONAPICache } from '@warp-drive/json-api';
import { CacheHandler } from '@warp-drive/core';
import '@warp-drive/svelte/install';

export default class Store extends WarpStore {
  requestManager = new RequestManager().use([Fetch]).useCache(CacheHandler);

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);

    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager) {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceKey, createArgs?: Record<string, unknown>) {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}
```

Then you can set that store as context in your app.

```ts
// src/lib/context/store.ts
import Store from '../../store';

import { getContext, setContext } from 'svelte';

const CONTEXT_KEY = Symbol('context:store');

export function createStore() {
  const storeService = new Store();
  setContext<Store>(CONTEXT_KEY, storeService);
}

export function getStore() {
  return getContext<Store>(CONTEXT_KEY);
}
```

```svelte
<script>
  // src/routes/+layout.svelte
  import { createStore } from '$lib/context/store.svelte';

  createStore();
</script>
```

### 2. Use the store

You are now ready to use the store to request data inside your components.

```svelte
<script>
  // src/lib/components/example.svelte
  import { getStore } from '$lib/context/store.svelte';
  import { findRecord } from '@warp-drive/utilities/json-api';
  import type { SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';
  import type { User } from '$lib/store/user';
  import { page } from '$app/state';

  const store = getStore();

  const request = $derived(
    store.request<SingleResourceDataDocument<User>>(findRecord("user", page.params.user_id))
  );
</script>

{#await request}
  Loading...
{:then response}
  {@const user = response.content.data}

  <div>{user.name}</div>
{:catch error}
  <div>{error.message}</div>
{/await}
```


---


### ♥️ Credits

 <details>
   <summary>Brought to you with ♥️ love by <a href="https://emberjs.com" title="EmberJS">🐹 Ember</a></summary>

  <style type="text/css">
    img.project-logo {
       padding: 0 5em 1em 5em;
       width: 100px;
       border-bottom: 2px solid #0969da;
       margin: 0 auto;
       display: block;
     }
    details > summary {
      font-size: 1.1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details {
      font-size: 1rem;
    }
    details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #000;
      border-bottom: 3px solid #0969da;
    }

    details > details {
      margin-left: 2rem;
    }
    details > details > summary {
      font-size: 1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details > details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #555;
      border-bottom: 2px solid #555;
    }
    details > details {
      font-size: .85rem;
    }

    @media (prefers-color-scheme: dark) {
      details > summary strong {
        color: #fff;
      }
    }
    @media (prefers-color-scheme: dark) {
      details > details > summary strong {
        color: #afaba0;
      border-bottom: 2px solid #afaba0;
      }
    }
  </style>
</details>
