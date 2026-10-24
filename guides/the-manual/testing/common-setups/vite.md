---
url: https://canary.warp-drive.io/guides/the-manual/testing/common-setups/vite.md
description: >-
  Forward holodeck's requests through the Vite dev server with a five-line
  plugin, so the suite you open at /tests runs on one origin.
---

# Vite dev server

This page assumes the forwarder and the test helper change from
[Common setups](./index.md), and that `pnpm test:dev` from
[Holodeck in dev mode](/guides/the-manual/cookbook/holodeck-in-dev-mode.md) starts holodeck next
to Vite. The plugin was tested on Node 26.10 and Vite 8.3.

## Add the plugin

In your Vite config, `vite.config.mjs` in an app from Ember's blueprint, import the forwarder and
put this plugin first in the `plugins` array you already have.

```js
import { forwardToHolodeck } from './forward-to-holodeck.mjs';

export default defineConfig({
  plugins: [
    {
      name: 'holodeck',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(forwardToHolodeck());
      },
    },
    // your other plugins
  ],
});
```

`apply: 'serve'` keeps it out of builds. `configureServer` runs before Vite's own middleware, so
holodeck's requests never reach a `server.proxy` entry you may have for `/api`.

## Run it

1. Run `pnpm test:dev`.
2. Open `http://localhost:4200/tests`.

The suite passes, and every request in the network panel goes to `http://localhost:4200`, with no
`OPTIONS` among them. In a test app with 17 tests and one `DELETE`, that is 208 requests instead
of the 209 the cross-origin page makes, the missing one being the preflight for that `DELETE`.
The first load after you change the Vite config can sit at `0 / N tests completed` while Vite
re-optimizes dependencies. Reload the page.

## Related

* [Testem](./testem.md) does the same for `pnpm test`, with the same forwarder.
* [Caddy](./caddy.md) puts an HTTPS origin in front of this one.
* [Holodeck in dev mode](/guides/the-manual/cookbook/holodeck-in-dev-mode.md) starts holodeck next
  to the dev server.
