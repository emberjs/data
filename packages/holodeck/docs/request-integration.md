# Request Integration

In order to properly manage test isolation holodeck intercepts and decorates requests. For this, we take advantage of each test context typically having its own WarpDrive RequestManager instance.

You should add the HolodeckHandler to the RequestManager chain prior to `Fetch` (or any equivalent handler that proceeds to network).

From within a test this might look like:

```ts
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { HolodeckHandler } from '@warp-drive/holodeck';
import { module, test } from 'qunit';

module('my module', function() {
  test('my test', async function() {
    const manager = new RequestManager()
      .use([new HolodeckHandler(this), Fetch]);
  });
});
```

We can use the `isTesting` macro from [@embroider/macros]() to add this handler into our chain all the time to ease test setup:

```ts
    const manager = new RequestManager()
      .use(
        [
          // only include the HolodeckHandler in testing envs
          macroCondition(
            isTesting()
          ) ? new HolodeckHandler(this) : false,
          Fetch
        ].filter(Boolean)
      );
```

