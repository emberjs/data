---
url: https://canary.warp-drive.io/api/@warp-drive/holodeck.md
description: >-
  ⚡️ Simple, Fast HTTP Mocking for Tests: experimental mocking that makes real
  network requests and replays git-managed recordings, via `MockServerHandler`
  and the `GET`/`POST` helpers in `@warp-drive/holodeck/mock`.
---

:::danger 🛑 **CANARY ONLY** 🛑
**@warp-drive/holodeck** is still experimental
:::

* ⚡️ Real network requests
  * brotli compression
  * http/2
  * no CORS preflight requests
* 💜 Unparalleled DX
  * debug real network requests
  * every request is scoped to a test
  * run as many tests as desired simultaneously
* 🔥 Blazing Fast Tests
  * record your tests when you change them
  * replays from cache until you change them again
  * the cache is managed by git, so switching branches works seamlessly, and CI and
    rebases skip work that is already recorded
  * zero-work: setup work is skipped when in replay mode

## Installation

```sh
pnpm add -E @warp-drive/holodeck@canary
```

## Guides

* [Testing Overview](/guides/the-manual/testing/): why a real server, and how record and replay works.
* [Server Setup](/guides/the-manual/testing/server-setup.md): certificates, and launching with Diagnostic or Testem.
* [Client Setup](/guides/the-manual/testing/client-setup.md): adding `MockServerHandler` to the request chain.
* [Test Framework Integration](/guides/the-manual/testing/test-framework-integration.md): test ids and the mock host.
* [Common Setups](/guides/the-manual/testing/common-setups/): one origin for the page and the mock server, from Vite, testem or Caddy.
* [Writing Mocks](/guides/the-manual/testing/writing-mocks.md): the mock helpers and the matching rules.
* [Recording and Replaying](/guides/the-manual/testing/record-and-replay.md): modes, fixtures and CI.
* [Troubleshooting](/guides/the-manual/testing/troubleshooting.md): indexed by the errors holodeck prints.
* [HoloPrograms](/guides/the-manual/testing/holo-programs.md): a proposed, not yet implemented, way to set up a test's whole API state in one call.
* [Holodeck in Dev Mode](/guides/the-manual/cookbook/holodeck-in-dev-mode.md): run holodeck next to your dev server so the test page in the browser works too.

## Classes

* [MockServerHandler](classes/MockServerHandler.md)

## Functions

* [getIsRecording](functions/getIsRecording.md)
* [installAdapterFor](functions/installAdapterFor.md)
* [mock](functions/mock.md)
* [setConfig](functions/setConfig.md)
* [setIsRecording](functions/setIsRecording.md)
* [setTestId](functions/setTestId.md)
