---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/skills/holodeck/set-up-holodeck.md
---
# Set Up Holodeck

Use this skill when a test suite needs to mock HTTP and nothing is wired up yet. Holodeck is a
real HTTPS mock server rather than an in-page interceptor, so it needs a certificate, a port, and
two configuration calls before any mock works.

## Steps

1. Install `mkcert`, then install the package pinned to an exact canary version. `@warp-drive/core`
   is a required peer.

   ```sh
   brew install mkcert            # or the platform equivalent
   pnpm add -E @warp-drive/holodeck@canary
   ```
2. Issue and trust a certificate once per machine, then restart the terminal so the exported
   variables take effect.

   ```sh
   pnpm dlx @warp-drive/holodeck ensure-cert
   ```

   The command stops with install instructions if `mkcert` is missing. Otherwise it issues the
   certificate into the home directory, then writes `HOLODECK_SSL_CERT_PATH` and
   `HOLODECK_SSL_KEY_PATH` into the profile of the shell named by `$SHELL` (`bash`, `zsh`, or
   `fish`). On any other shell it prints the two lines to add yourself and exits normally. The
   home-directory paths are also holodeck's defaults, so the certificate works without them.
3. Start the server from the script that starts the test server, on the test server's port plus
   one. Run that script from the test app's own directory, because `launchProgram` reads
   `package.json` from the working directory and writes `.mock-cache` there.

   ```js
   await launch({
     async setup(options) { await holodeck.launchProgram({ port: options.port + 1 }); },
     async cleanup() { await holodeck.endProgram(); },
     entry: './dist-test/index.html',
   });
   ```
4. Point the app at the server in the test suite's boot file. Both calls are required and they do
   different jobs.

   ```ts
   const MockHost = `https://${window.location.hostname}:${Number(window.location.port) + 1}`;
   setBuildURLConfig({ host: MockHost, namespace: '' }); // aims the app's real requests
   setConfig({ host: MockHost });                        // aims only the recording request
   ```

   Setting `setConfig` alone records fixtures that no request will ever read.
5. Register the test id per test, against the test context object itself.

   ```ts
   setupGlobalHooks((hooks) => {
     hooks.beforeEach(function (assert) { setTestId(this, assert.test.testId); });
     hooks.afterEach(function () { setTestId(this, null); });
   });
   ```
6. Put `MockServerHandler` ahead of `Fetch` in the request chain, constructed with that same
   test context. Use `handlers: [new MockServerHandler(this)]` on a store, or
   `manager.use([new MockServerHandler(this), Fetch])` on a bare `RequestManager`.

## Notes

* Holodeck identifies a test by object identity, not by name. The object passed to `setTestId`,
  to `new MockServerHandler()`, and to every mock helper must be the same one. Use `function` test
  bodies so `this` is the test context.
* The `+ 1` port convention is hardcoded twice, in the launcher and in the browser. Holodeck binds
  exactly the port it is given and never renegotiates, so both halves must agree.
* There is no plaintext mode and no way to skip the certificate.

## Related

* Full guide: [Server Setup](/guides/the-manual/testing/server-setup.md),
  [Client Setup](/guides/the-manual/testing/client-setup.md), and
  [Test Framework Integration](/guides/the-manual/testing/test-framework-integration.md)
* Related skills: [Mock HTTP Requests in Tests](/skills/holodeck/mock-http-requests-in-tests) for
  declaring mocks once the server runs
