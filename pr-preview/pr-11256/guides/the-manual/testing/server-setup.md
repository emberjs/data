---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/guides/the-manual/testing/server-setup.md
---

# Server setup

Holodeck runs as a real server next to your test server. This page installs it and starts it.
[Client setup](./client-setup.md) wires the browser half.

## Before you start

Install [`mkcert`](https://github.com/FiloSottile/mkcert). Holodeck serves over TLS only, and
`mkcert` is what issues the certificate it serves with.

::: code-group

```sh [macOS]
brew install mkcert
brew install nss # only if you test in Firefox
```

```sh [Linux]
sudo apt install libnss3-tools
# then install mkcert from https://github.com/FiloSottile/mkcert/releases
```

```sh [Windows]
choco install mkcert
```

:::

You also need Node 24.21 or newer, and an app already built with ***Warp*Drive**'s build
configuration. Holodeck's browser build reads the same build-time flags as the rest of
***Warp*Drive**, so the pipeline that builds your tests has to supply them.

## Install the package

Holodeck publishes to the `canary` channel only. Pin an exact version.

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive/holodeck@canary
```

```sh [npm]
npm add -E @warp-drive/holodeck@canary
```

```sh [yarn]
yarn add -E @warp-drive/holodeck@canary
```

```sh [bun]
bun add -E @warp-drive/holodeck@canary
```

:::

`@warp-drive/core` is a required peer dependency. Add `@warp-drive/legacy` as well if your tests go
through legacy adapters.

## Trust a local certificate

Run the bundled `ensure-cert` command once per machine.

```sh
pnpm dlx @warp-drive/holodeck ensure-cert
```

It installs a local certificate authority with `mkcert -install`, issues a certificate for
`localhost`, writes the pair into your home directory, and appends two environment variables to
your shell profile.

```sh
HOLODECK_SSL_CERT_PATH="$HOME/holodeck-localhost.pem"
HOLODECK_SSL_KEY_PATH="$HOME/holodeck-localhost-key.pem"
```

Those two paths are also the defaults. Holodeck finds the certificate without the variables as long
as the files are in your home directory, and announces the fallback when it starts. Set the
variables only when you keep the certificate somewhere else.

`ensure-cert` checks for `mkcert` first and stops with install instructions when it is missing. It
then issues the certificate whatever your shell is, and only after that writes the two variables
to `.zshrc`, `.bashrc`, or fish's `config.fish`, going by the shell named in `$SHELL`. On any other
shell it prints the lines to add yourself and exits normally, because the certificate at the
default paths already works without them.

If you also use `@warp-drive/diagnostic` to serve your tests, it reads the same certificate. A
machine without one fails there first, before holodeck starts at all.

## Start the server with your test server

Holodeck has no command line of its own. Start it from whatever starts your test server, and give
it a port one higher than the test server's.

### With Diagnostic

Use the lifecycle hooks in the launch config in `diagnostic.js`.

```js
import { launch } from '@warp-drive/diagnostic/server';
import holodeck from '@warp-drive/holodeck';

await launch({
  async setup(options) {
    await holodeck.launchProgram({
      port: options.port + 1,
    });
  },
  async cleanup() {
    await holodeck.endProgram();
  },
  entry: './dist-test/index.html',
});
```

### With Testem

Use testem's
[async config](https://github.com/testem/testem/blob/master/docs/config_file.md#returning-a-promise-from-testemjs).

```js
module.exports = async function () {
  const holodeck = (await import('@warp-drive/holodeck')).default;
  await holodeck.launchProgram({
    port: 7373,
  });

  process.on('beforeExit', async () => {
    await holodeck.endProgram();
  });

  return {
    // ... testem config
  };
};
```

To serve the mock from the test suite's own origin, see [Common setups](./common-setups/index.md).
Testem's `proxies` option cannot do it: holodeck accepts only HTTP/2, and `proxies` speaks
HTTP/1.1 to its target.

***Warp*Drive**'s own test apps use Diagnostic, so that is the path with test coverage behind it.

## The port convention

The `+ 1` above is a convention, not a default, and [client setup](./client-setup.md) repeats it on
the browser side. Both halves have to agree, because holodeck binds the port it is given and never
falls back to another one.

Run the launcher from the test app's own directory. `launchProgram` reads `package.json` from the
current working directory, and writes `.mock-cache` there too.

A correct start looks like this.

```
	@warp-drive/holodeck 🌅
	=================================

	Holodeck Access Granted
		program: json-api
		port: 7358

	Serving Holodeck HTTP Mocks from https://localhost:7358

🚀 Serving Diagnostic Tests on https://localhost:7357
```

## Related

* [Client setup](./client-setup.md) adds the handler that scopes requests to a test.
* [Test framework integration](./test-framework-integration.md) gives each test its id.
