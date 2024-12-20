# Server Setup

The holodeck server can be easily integrated into any testing process. Below we show integration with either Testem and Diagnostic.

## Testem

You can integrate holodeck with Testem using testem's [async config capability](https://github.com/testem/testem/blob/master/docs/config_file.md#returning-a-promise-from-testemjs):

```ts
module.exports = async function () {
  const holodeck = (await import('@warp-drive/holodeck/server')).default;
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

If you need the API mock to run on the same port as the test suite, you can use Testem's [API Proxy](https://github.com/testem/testem/tree/master?tab=readme-ov-file#api-proxy)

```ts
module.exports = async function () {
  const holodeck = (await import('@warp-drive/holodeck/server')).default;
  await holodeck.launchProgram({
    port: 7373,
  });

  process.on('beforeExit', async () => {
    await holodeck.endProgram();
  });

  return {
    "proxies": {
      "/api": {
        // holodeck always runs on https
        // the proxy is transparent so this means /api/v1 will route to https://localhost:7373/api/v1
        "target": "https://localhost:7373",
        // "onlyContentTypes": ["xml", "json"],
        // if test suite is on http, set this to false
        // "secure": false,
      },
    }
  };
};
```

## Diagnostic

holodeck can be launched and cleaned up using the lifecycle hooks in the launch config
for diagnostic in `diagnostic.js`:

```ts
import launch from '@warp-drive/diagnostic/server/default-setup.js';
import holodeck from '@warp-drive/holodeck/server';

await launch({
  async setup(options) {
    await holodeck.launchProgram({
      port: options.port + 1,
    });
  },
  async cleanup() {
    await holodeck.endProgram();
  },
});
```
