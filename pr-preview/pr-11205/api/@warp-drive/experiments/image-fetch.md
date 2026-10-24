---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/experiments/image-fetch.md
---

&#x20;

* Fetches images from a `Worker`/`SharedWorker` instead of the main thread
* Caches and dedupes fetches for the same url within the worker
* Shares fetched-image state cross-tab when using a `SharedWorker`
* Resolves to a reusable object url for the fetched image's blob

## Install

```sh
pnpm add @warp-drive/experiments
```

## About

`ImageWorker` offloads image fetching to a dedicated `Worker` or `SharedWorker`.
The worker downloads each requested url via `fetch`, converts the response
into a `Blob`, and creates an object url for it via `URL.createObjectURL`.
That object url is cached in-memory by source url for the lifetime of the
worker, so multiple tabs/windows sharing a `SharedWorker` — or repeat requests
from the same tab — never fetch or decode the same image twice.

`ImageFetch` is the main-thread client used to talk to an `ImageWorker`.
Construct it with your `Worker`/`SharedWorker` instance and call `load(url)`
to get back an object url you can assign directly to an `<img src>`.
`ImageFetch` also caches the resolved object url locally, so repeat calls for
a url already loaded by this instance resolve without messaging the worker.

## Known Limitations

This is an early experiment; the following gaps exist today:

* Calling `load` again for the same url while a prior call for that same url
  is still in-flight on the same `ImageFetch` instance replaces the pending
  request rather than joining it; only the most recently issued call resolves,
  and the earlier call's promise never settles.
* If the underlying `fetch` in the worker rejects, no response is sent back to
  the requesting thread, so `load`'s returned promise hangs indefinitely
  instead of rejecting.
* `SharedWorker` is the intended target. A plain `Worker` is only accepted
  when running in a `TESTING` build; using one outside of tests will fail an
  assertion.
* `ImageWorker`'s `persisted` constructor option is accepted but not yet
  implemented.

## Configure

### Step 1. Create The Worker

```ts
// app/workers/image-worker.ts
import { ImageWorker } from '@warp-drive/experiments/image-worker';

new ImageWorker();
```

> \[!TIP]
> Your worker file is loaded via `new URL(...)`, not a static import, so bundlers
> that statically analyze/prune app files need to be told to leave it alone.
> With Embroider, add its containing directory to `staticAppPaths`; with Vite,
> exclude it from dependency optimization:
>
> ```js
> // ember-cli-build.js
> return maybeEmbroider(app, {
>   staticAppPaths: ['workers'],
> });
> ```
>
> ```js
> // vite.config.mjs
> optimizeDeps: {
>   exclude: ['!workers*', '!*workers'],
> },
> ```

### Step 2. Use It From Your Application

```ts
import { ImageFetch } from '@warp-drive/experiments/image-fetch';

const worker = new SharedWorker(new URL('./workers/image-worker.ts', import.meta.url));
const images = new ImageFetch(worker);

const objectUrl = await images.load('https://example.com/cat.png');

const img = document.createElement('img');
img.src = objectUrl;
document.body.appendChild(img);
```

> \[!TIP]
> SharedWorker and Worker are both supported; however, SharedWorker is preferred.
> Worker is only usable in test environments.

#### Usage as an Ember Service

Registering `ImageFetch` as a service makes it easy to inject anywhere you
need to load or preload an image, and to pair with
[`getPromiseState`](https://docs.warp-drive.io/guides/the-manual/reactivity/derivation)
from `@warp-drive/ember` to render its result reactively.

```ts
// app/services/images.ts
import { ImageFetch } from '@warp-drive/experiments/image-fetch';

export default {
  create() {
    return new ImageFetch(
      new SharedWorker(new URL('../workers/image-worker.ts', import.meta.url), {
        name: 'ImageWorker',
        type: 'module',
      }),
    );
  },
};
```

```gts
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { cached } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { getPromiseState } from '@warp-drive/ember';
import type { ImageFetch } from '@warp-drive/experiments/image-fetch';

export default class Thumbnail extends Component<{ Args: { url: string; hiresUrl: string } }> {
  @service declare images: ImageFetch;

  // warm the worker's cache for the hires image before the user clicks into it
  preload = () => this.images.load(this.args.hiresUrl);

  @cached
  get thumbnailUrl() {
    const state = getPromiseState(this.images.load(this.args.url));
    return state.isPending || state.isError ? null : state.result;
  }

  <template>
    {{#if this.thumbnailUrl}}
      <img src={{this.thumbnailUrl}} {{on 'pointerenter' this.preload}} alt='' />
    {{else}}
      <div class='thumbnail-loading'></div>
    {{/if}}
  </template>
}
```

#### Usage in SSR

In SSR, `ImageFetch` deactivates itself and resolves `load` with the given url
immediately. When in SSR mode, the worker argument is allowed to be `null` to
support guarding its creation.

```ts
const worker = isFastBoot ? null : new SharedWorker(new URL('./workers/image-worker.ts', import.meta.url));
const images = new ImageFetch(worker);
```

#### Usage in Tests

In tests, it's often best to use a `Worker` instead of a `SharedWorker`.

```ts
const worker = macroCondition(isTesting())
  ? new Worker(new URL('./workers/image-worker.ts', import.meta.url))
  : new SharedWorker(new URL('./workers/image-worker.ts', import.meta.url));

const images = new ImageFetch(worker);
```

## Example App

[ember-polaris-pokedex](https://github.com/IgnaceMaes/ember-polaris-pokedex/pull/2)
wires up `ImageWorker`/`ImageFetch` (alongside `DataWorker`) in a real Ember app,
including the service + `getPromiseState` pattern shown above and the
Embroider/Vite bundler config needed to ship the worker files.

## Classes

* [ImageFetch](classes/ImageFetch.md)
