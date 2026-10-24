---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/legacy/adapter/error/variables/AdapterError.md
---

&#x20;

# &#x20;AdapterError

```ts
AdapterError: AdapterRequestErrorConstructor<AdapterError>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/error.ts:74](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/adapter/error.ts#L74)

:::danger
⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
If starting a new app or thinking of implementing a new adapter, consider writing a
Handler instead to be used with the [RequestManager](../../../../core/classes/RequestManager.md)
:::

An `AdapterError` is used by an adapter to signal that an error occurred
during a request to an external API. It indicates a generic error, and
subclasses are used to indicate specific error states.

To create a custom error to signal a specific error state in communicating
with an external API, extend the `AdapterError`. For example, if the
external API exclusively used HTTP `503 Service Unavailable` to indicate
it was closed for maintenance:

```js [app/adapters/maintenance-error.js]
import AdapterError from '@warp-drive/legacy/adapter/error';

export default AdapterError.extend({ message: "Down for maintenance." });
```

This error would then be returned by an adapter's `handleResponse` method:

```js [app/adapters/application.js]
import JSONAPIAdapter from '@warp-drive/legacy/adapter/json-api';
import MaintenanceError from './maintenance-error';

export default class ApplicationAdapter extends JSONAPIAdapter {
  handleResponse(status) {
    if (503 === status) {
      return new MaintenanceError();
    }

    return super.handleResponse(...arguments);
  }
}
```

And can then be detected in an application and used to send the user to an
`under-maintenance` route:

```js [app/routes/application.js]
import MaintenanceError from '../adapters/maintenance-error';

export default class ApplicationRoute extends Route {
  actions: {
    error(error, transition) {
      if (error instanceof MaintenanceError) {
        this.transitionTo('under-maintenance');
        return;
      }

      // ...other error handling logic
    }
  }
}
```

### Signaling an Error Without Extending `AdapterError`

Extending `AdapterError` (or one of its subclasses) is a convenience, not
a requirement. WarpDrive only inspects an error for the [AdapterRequestError](../types/AdapterRequestError.md)
shape: an `isAdapterError` flag, a `code`, and an {json:api}-formatted
`errors` array. Any object satisfying that shape — including a plain
`Error` with those properties attached — will be handled identically to
an instance created via `new AdapterError()` or one of its subclasses.

This is useful when you'd rather not introduce a class hierarchy, or
when the error needs to be constructed from data you don't control
(for example, re-throwing an error surfaced by a third-party library):

```js [app/adapters/application.js]
import JSONAPIAdapter from '@warp-drive/legacy/adapter/json-api';

export default class ApplicationAdapter extends JSONAPIAdapter {
  handleResponse(status, headers, payload) {
    if (status === 503) {
      const error = new Error('Down for maintenance.');
      error.isAdapterError = true;
      error.code = 'MaintenanceError';
      error.errors = [{ title: 'Service Unavailable', detail: 'Down for maintenance.' }];
      return error;
    }

    return super.handleResponse(status, headers, payload);
  }
}
```

Because `code` is just a string you control, `error instanceof AdapterError`
checks won't match a plain object built this way — consumers should
instead branch on `error.isAdapterError && error.code === 'MaintenanceError'`,
or on whichever of the AdapterError subclasses' `code` values
(e.g. `'InvalidError'`, `'NotFoundError'`) the error's `code` matches.
