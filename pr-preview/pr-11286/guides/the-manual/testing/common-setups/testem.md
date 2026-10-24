---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/the-manual/testing/common-setups/testem.md
description: >-
  Forward holodeck's requests through testem's own server with its middleware
  option, so the suite pnpm test runs has one origin.
---

# Testem

This page assumes the forwarder and the test helper change from
[Common setups](./index.md), and that `testem.js` already launches holodeck as
[Server setup](../server-setup.md#with-testem) describes. Tested on testem 3.21.

## Add the middleware

Testem's `middleware` option takes functions that receive its express app. Import the forwarder
and mount it.

```js
module.exports = async function () {
  const holodeck = (await import('@warp-drive/holodeck')).default;
  const { forwardToHolodeck } = await import('./forward-to-holodeck.mjs');

  await holodeck.launchProgram({ port: 7358 });

  process.on('beforeExit', async () => {
    await holodeck.endProgram();
  });

  return {
    middleware: [(app) => app.use(forwardToHolodeck())],
    // ... the rest of your testem config
  };
};
```

Testem applies `middleware` before `proxies`, so a `proxies` entry for your real API under
`/api` can stay: the forwarder takes the requests holodeck tagged and passes the rest on to it.
`proxies` itself cannot reach holodeck, for the reason
[Common setups](./index.md#holodeck-speaks-http-2-only) gives.

## Run it

Run `pnpm test`. The suite passes with the mock server on testem's own origin. Nothing else about
the run changes: testem still launches holodeck on `7358`, still serves the test page on a port
of its own, and fixtures still record and replay from `.mock-cache`.

## Related

* [Vite dev server](./vite.md) does the same for the page at `/tests`, with the same forwarder.
* [Server setup](../server-setup.md#with-testem) is where testem launches holodeck.
