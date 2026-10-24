---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/guides/the-manual/testing/common-setups/caddy.md
description: >-
  Put Caddy in front of the Vite dev server and holodeck, so the test page is
  served over HTTPS on one origin with the certificate holodeck already has.
---

# Caddy

The [Vite dev server](./vite.md) setup gives the page and the mock server one origin, on plain
HTTP. This page adds a reverse proxy in front of both, so the page itself is served over HTTPS
with the certificate holodeck's `ensure-cert` already issued. Caddy is the worked example. Any
reverse proxy that speaks HTTP/2 to its upstream can do the same job.

## Before you start

This page assumes the [Vite dev server](./vite.md) setup works, so `pnpm test:dev` starts holodeck
next to Vite and the test helper uses an empty `MOCK_HOST`. Holodeck serves over TLS only, so a
passing suite means `ensure-cert` already wrote `holodeck-localhost.pem` and
`holodeck-localhost-key.pem` into your home directory, as
[Trust a local certificate](../server-setup.md#trust-a-local-certificate) describes. The
examples use `4200` for Vite, `7358` for holodeck, and `8443` for Caddy.

Install a [Caddy](https://caddyserver.com/docs/install) build that speaks HTTP/2 to its
upstreams. Holodeck accepts nothing else, and [Run it](#run-it) shows how to confirm it once
Caddy is up. Caddy's reverse proxy quick start is at
https://caddyserver.com/docs/quick-starts/reverse-proxy.

## Write the Caddyfile

Save this as `Caddyfile` in the app's root, next to `testem.js`.

```caddyfile
https://localhost:8443 {
	tls {$HOME}/holodeck-localhost.pem {$HOME}/holodeck-localhost-key.pem

	@holodeck path /api/* /__record*
	handle @holodeck {
		reverse_proxy https://localhost:7358
	}

	handle {
		reverse_proxy localhost:4200
	}
}
```

The `tls` line serves holodeck's own certificate. Caddy fills in `{$HOME}` when it reads the
file. If `ensure-cert` wrote the pair somewhere other than your home directory, put those paths
here instead. `ensure-cert` installed its certificate authority with `mkcert -install`, so the
browser already trusts the proxy. Caddy trusts the same authority, so it reaches holodeck without
being told to skip certificate checks.

The `@holodeck` matcher names the two paths that go straight to holodeck. `/api` is the
`namespace` from `setBuildURLConfig`, so if yours differs, change it here. `/__record` is where
each mock helper posts the fixture it records. The last `handle` sends everything else to Vite,
including the requests Vite's own forwarder would otherwise take, which is why the Vite setup
can stay in place underneath.

The blocks use `handle` rather than `handle_path` because `handle` keeps the `/api` prefix, and
fixture names include it, for example `GET::api_users::0`.

A Caddy build that negotiates HTTP/2 needs no transport settings here, and a build that cannot is
not fixed by `transport http { versions 2 }` either.

## Run it

1. Run `pnpm test:dev`.

2. In a second terminal, start Caddy from the app's root. It reads the `Caddyfile` there and
   logs `server running`.

   ```sh
   caddy run
   ```

3. Confirm that Caddy reached holodeck over HTTP/2. Holodeck answers this probe with a 400, which
   is fine. The `via` header is what matters.

   ```sh
   curl -s -D - -o /dev/null 'https://localhost:8443/api/users?__xTestId=probe&__xTestRequestNumber=0' | grep -i via
   ```

   `via: 2.0 Caddy` means HTTP/2. `via: 1.1 Caddy` means this build speaks HTTP/1.1 to the
   upstream, and the suite will fail with `Holodeck failed to record GET api/users (403 )`.
   Install a build that speaks HTTP/2, restart Caddy, and probe again.

4. Open `https://localhost:8443/tests`.

The suite passes. In the browser's network panel, every request goes to `https://localhost:8443`,
and there is no `OPTIONS` request.

## Things to know

* The certificate names only `localhost`, so keep `localhost` as the site address. To use another
  name, such as `app.localhost`, first issue a certificate with `mkcert app.localhost`.
* Caddy writes `~/.config/caddy/autosave.json`. On macOS it also creates
  `~/Library/Application Support/Caddy`.
* `pnpm test` is unchanged. Testem never goes through Caddy.

## Related

* [Vite dev server](./vite.md) is the setup this one sits in front of.
* [Holodeck in dev mode](/guides/the-manual/cookbook/holodeck-in-dev-mode.md) starts holodeck next
  to the dev server.
