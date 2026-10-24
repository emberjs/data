---
url: https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/holodeck.md
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

## Documentation

* [Testing Overview](https://warp-drive.io/guides/the-manual/testing/) why a real server, and how record and replay works
* [Server Setup](https://warp-drive.io/guides/the-manual/testing/server-setup) certificates, and launching with Diagnostic or Testem
* [Client Setup](https://warp-drive.io/guides/the-manual/testing/client-setup) adding `MockServerHandler` to the request chain
* [Test Framework Integration](https://warp-drive.io/guides/the-manual/testing/test-framework-integration) test ids and the mock host
* [Common Setups](https://warp-drive.io/guides/the-manual/testing/common-setups/) one origin for the page and the mock server, from Vite, testem, or Caddy
* [Writing Mocks](https://warp-drive.io/guides/the-manual/testing/writing-mocks) the mock helpers and the matching rules
* [Recording and Replaying](https://warp-drive.io/guides/the-manual/testing/record-and-replay) modes, fixtures, and CI
* [Troubleshooting](https://warp-drive.io/guides/the-manual/testing/troubleshooting) indexed by the errors holodeck prints

## Classes

* [MockServerHandler](classes/MockServerHandler.md)

## Functions

* [getIsRecording](functions/getIsRecording.md)
* [installAdapterFor](functions/installAdapterFor.md)
* [mock](functions/mock.md)
* [setConfig](functions/setConfig.md)
* [setIsRecording](functions/setIsRecording.md)
* [setTestId](functions/setTestId.md)
