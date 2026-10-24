---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/the-manual/cookbook/holodeck-in-dev-mode.md
---

# Holodeck in dev mode

An app whose dev server also serves its test page can run the suite in the browser. You start
`vite` with `pnpm start` and open `/tests`, which is `http://localhost:4200/tests` in the examples
here. If your tests use
[holodeck](/guides/the-manual/testing/index.md), that page fails when the suite runs, even though
`pnpm test` passes.

This recipe starts holodeck next to the dev server so both ways of running the suite work.

## Before you start

This page assumes holodeck already works under `pnpm test`, with testem launching it as
[Server setup](/guides/the-manual/testing/server-setup.md#with-testem) describes. The examples use
the fixed port `7358`. The browser you open `/tests` in has to trust the local certificate from
[Trust a local certificate](/guides/the-manual/testing/server-setup.md#trust-a-local-certificate).
`tests/test-helper.js` points requests at the mock server:

```ts
import { setConfig } from '@warp-drive/holodeck';
import { setBuildURLConfig } from '@warp-drive/utilities';

const MOCK_HOST = 'https://localhost:7358';

setBuildURLConfig({ host: MOCK_HOST, namespace: 'api' });
setConfig({ host: MOCK_HOST });
```

## Why the dev server fails

`testem.js` is the only thing that calls `holodeck.launchProgram`, and only `pnpm test` runs testem.
`vite` serves the test page but starts nothing on `7358`, so every call to `mock()` fails to reach
the server. The page reports two errors per test:

```
Promise rejected during "the feed renders, and composing a post reloads it": Failed to fetch

Global afterEach failed on the feed renders, and composing a post reloads it: Error: Holodeck: this test declared mocks it never requested.

	GET api/users?page%5Bsize%5D=100&sort=handle (mocked 1, requested 0)

A mock that is never requested proves nothing. Remove it, or make the request it describes.
```

`Failed to fetch` is how Chrome reports the unreachable server. Safari reports it as `Load failed`.
The second error follows from the first: the test declared the mock, but its request never reached
a server. The mock itself is fine.

## Add a launcher script

Create `scripts/holodeck.mjs` in the app:

```js
import holodeck from '@warp-drive/holodeck';

await holodeck.launchProgram({ port: 7358 });
```

The server runs in a worker thread, which keeps the process alive after `launchProgram` resolves.
Holodeck handles `Ctrl+C` itself and prints `Holodeck program ended`, so the script needs no signal
handling.

The port has to match in three places: this script, `testem.js`, and `MOCK_HOST` in
`tests/test-helper.js`. Holodeck binds only the port it is given, and the browser only knows the
address in `MOCK_HOST`. If yours differ from `7358`, copy the port from `testem.js`.

## Run it with the dev server

Add a script to `package.json` that starts both processes with
[`concurrently`](https://www.npmjs.com/package/concurrently). If your app doesn't have it yet, add
it with `pnpm add -D concurrently`.

```json
{
  "scripts": {
    "start": "vite",
    "test": "vite build --mode development && testem ci --port 0",
    "test:dev": "concurrently --names vite,holodeck --kill-others \"vite\" \"node ./scripts/holodeck.mjs\""
  }
}
```

Run `pnpm test:dev`, then open `http://localhost:4200/tests`. The holodeck banner prints first:

```
[holodeck] 	Holodeck Access Granted
[holodeck] 		program: web
...
[holodeck] 	Serving Holodeck HTTP Mocks from https://localhost:7358
...
[vite]   ➜  Local:   http://localhost:4200/
```

`--kill-others` stops Vite when holodeck exits, and holodeck when Vite exits. You never end up with
a dev server whose tests fail because the mock server quietly died. `Ctrl+C` stops both.

The package script runs from the app's own directory. That matters, because `launchProgram`
reads `package.json` and writes `.mock-cache` in the current working directory.

`start` stays as it was. Keep it separate if you use it for day-to-day work against a real API, so
it doesn't need the holodeck certificate.

## Things to know

* A dev run records fixtures, just like a local `pnpm test`. Holodeck records unless `CI` is set,
  and every test that reaches a `mock()` writes its fixture into `.mock-cache`. Check `git status`
  before you commit, as you would after a local test run. See
  [Record and replay](/guides/the-manual/testing/record-and-replay.md).
* Stop `test:dev` before running `pnpm test`. Both launch holodeck on the same port. The second one
  retries the bind a few times and then exits with
  `Error: listen EADDRINUSE: address already in use ::1:7358`. See
  [The port was taken](/guides/the-manual/testing/troubleshooting.md#the-port-was-taken).
* If `Failed to fetch` or `Load failed` persists while holodeck's banner shows it running, the
  browser you opened `/tests` in does not trust the certificate. See
  [Trust a local certificate](/guides/the-manual/testing/server-setup.md#trust-a-local-certificate).
* Apps that serve their tests with `@warp-drive/diagnostic` don't hit this. Its `launch()` starts
  holodeck from its `setup` hook every time the suite runs.
* The page on `4200` still reaches holodeck on `7358`, so every mocked request is cross-origin.
  [Common setups](/guides/the-manual/testing/common-setups/index.md) puts the mock server on the
  page's own origin, from Vite, from testem, or behind Caddy, with no preflight `OPTIONS` requests.
