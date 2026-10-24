---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/guides/the-manual/testing/common-setups.md
description: >-
  Serve the test page and the holodeck mock server from one origin, so mocked
  requests need no CORS and no preflight, with the forwarder that Vite, testem,
  and Caddy setups share.
---

# Common setups

Holodeck runs as its own server, so out of the box the page that runs your tests and the mock
server have two origins. Vite serves the page at `http://localhost:4200`, testem at a port of its
own, and holodeck answers at `https://localhost:7358`. Every mocked request is cross-origin. The
browser applies CORS to it, and any request outside the CORS
["simple request" category](../client-setup.md#what-the-handler-does), such as a `DELETE`, costs
a preflight `OPTIONS` first.

The setups in this section give the page and the mock server one origin. Each one puts something
in front of holodeck that answers on the page's own origin and forwards the mocked requests.

* [Vite dev server](./vite.md), for the suite you open at `/tests` while `vite` runs.
* [Testem](./testem.md), for the suite `pnpm test` runs.
* [Caddy](./caddy.md), when you also want the page itself served over HTTPS.

The first two share the forwarder below and the same one-line change to the test helper. Set
those up first. Caddy sits in front of Vite and needs neither.

## Holodeck speaks HTTP/2 only

Holodeck's server is built on `node:http2` and does not accept HTTP/1.1 connections. A client
that speaks HTTP/1.1 to it gets `403 Forbidden` with a body that starts with
``Missing ALPN Protocol, expected `h2` to be available.``

That rules out the proxy options that come with the tools. Vite's `server.proxy` and testem's
`proxies` both use the `http-proxy` library, which opens its upstream connection with Node's
`https.request`, an HTTP/1.1 client. Point either at holodeck and every test fails with
`Holodeck failed to record GET api/users (403 Forbidden)`.

Node's own `fetch` negotiates HTTP/2. The forwarder below is a Connect-style middleware built on
it, and both the Vite dev server and testem's express app accept one.

## The forwarder

Save this as `forward-to-holodeck.mjs` in the app's root, next to `testem.js` and
`vite.config.mjs`.

```js
import tls from 'node:tls';

export function forwardToHolodeck({ host = 'https://localhost:7358' } = {}) {
  tls.setDefaultCACertificates(tls.getCACertificates('system'));

  return async function forward(req, res, next) {
    const url = new URL(req.url, host);
    if (url.pathname !== '/__record' && !url.searchParams.has('__xTestId')) {
      return next();
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let upstream;
    try {
      upstream = await fetch(url, {
        method: req.method,
        headers: {
          accept: req.headers.accept ?? '*/*',
          'content-type': req.headers['content-type'] ?? '',
        },
        body: chunks.length ? Buffer.concat(chunks) : undefined,
      });
    } catch (error) {
      return next(error);
    }
    res.statusCode = upstream.status;
    upstream.headers.forEach((value, name) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name)) {
        res.setHeader(name, value);
      }
    });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  };
}
```

Three parts carry the decisions.

The `tls` line makes Node trust the certificate holodeck serves. `mkcert -install`, which
[Trust a local certificate](../server-setup.md#trust-a-local-certificate) runs for you, put its
root into the operating system's store. The browser and `curl` read that store, but Node does
not, and without the line `fetch` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Starting the
process with `NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"` does the same job from outside.
The two `tls` functions exist from Node 24.21, the oldest Node holodeck runs on.

The `if` forwards only the requests that are holodeck's. `MockServerHandler`, the handler
[client setup](../client-setup.md) adds to the request chain, appends `__xTestId` to every mocked
request, and the mock helpers post each fixture to `/__record`. Everything else falls through to
whatever the server would have done with it. If holodeck is not running, a forwarded request
fails with a 500 and the server prints `fetch failed`.

The header filter drops `content-encoding`, `content-length`, and `transfer-encoding`. Holodeck
replays fixtures brotli-compressed, `fetch` decodes them on the way through, and the browser would
otherwise try to decode the plain body a second time.

## The test helper

With the forwarder in place, holodeck needs no host of its own. In `tests/test-helper.js`, the
two calls that point requests at the mock server, the ones
[test framework integration](../test-framework-integration.md#point-requests-at-the-mock-server)
and [Holodeck in dev mode](/guides/the-manual/cookbook/holodeck-in-dev-mode.md#before-you-start)
show, get an empty host:

```js
import { setConfig } from '@warp-drive/holodeck';
import { setBuildURLConfig } from '@warp-drive/utilities';

const MOCK_HOST = '';

setBuildURLConfig({ host: MOCK_HOST, namespace: 'api' });
setConfig({ host: MOCK_HOST });
```

`setBuildURLConfig` then builds root-relative URLs such as `/api/users`, and `setConfig` posts
recordings to `/__record`. Whatever serves the page forwards both. `/api` is the `namespace`
your app already uses; the forwarder does not care what it is, because it matches on
`__xTestId` rather than on the path.

## What you should see

With any of the three setups, the suite passes, and in the browser's network panel every request
goes to the page's own origin and there is no `OPTIONS` request. A passing suite is itself the
proof: with an empty `MOCK_HOST` and no forwarder, every mocked request would come back as a 404
from the server that served the page.

Fixtures are unaffected. Holodeck names them from the request path alone, so a fixture recorded
cross-origin replays through a forwarder, and the other way round. A forwarded run records like
any other local run; see [Record and replay](../record-and-replay.md).

***Warp*Drive**'s own test apps use `@warp-drive/diagnostic` and run cross-origin. None of this
applies to them.
