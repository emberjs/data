---
url: /pr-preview/pr-11154/guides/the-manual/experiments/storage-resources.md
---

# Storage Resources

Storage Resources are classes with reactive fields that synchronize their value into either [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) or [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

Any existing class can be converted into a Storage Resource using the provided decorators.

::: code-group

```ts [Before]
import { tracked } from '@glimmer/tracking';

class SiteTheme {
  @tracked explicitThemePreference: 'light' | 'dark' | null = null;
}
```

```ts [Decorated]
import { LocalResource, field } from '@warp-drive/experiments/storage';

@LocalResource('site-theme')
export class SiteTheme {
  @field explicitThemePreference: 'light' | 'dark' | null = null;
}
```

:::

## Why Storage Resources?

**No More Vanishing State!**

There's nothing more annoying when using an app than not being able to return to a state you were just in. You click away for a moment, or hit refresh and suddenly you're in an entirely different state!

When that state should be shareable, it makes sense to [use the URL](https://tomdale.net/2012/05/ember-routing/), but not all state belongs being in the url.

Browsers offer two excellent primitives for storing device and session specific states that synchronize across tabs and windows when needed: [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) and [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

This library provides a reactive wrapper for these APIs as a building block for more advanced features.

* [reactive localStorage](/api/@warp-drive/experiments/storage/functions/getLocalStorage)
* [reactive sessionStorage](/api/@warp-drive/experiments/storage/functions/getSessionStorage)

Storage Resources build over these APIs, making it trivial to ensure that a user's application or session state is always persisted when needed, and synchronized into the url properly when it should be shareable.

## Features

### Resource Types

Storage Resources are either a `LocalResource` (backed by localStorage) or a Session Resource (backed by sessionStorage). The type is determined by the decorator used to setup the resource.

::: code-group

```ts [LocalResource]
import { LocalResource, field } from '@warp-drive/experiments/storage';

@LocalResource('home-page')
export class HomePage {
  @field scrollOffset: number = 0;
}
```

```ts [SessionResource]
import { SessionResource, field } from '@warp-drive/experiments/storage';

@SessionResource('home-page')
export class HomePage {
  @field scrollOffset: number = 0;
}
```

:::

#### Field Level Resource Type Overrides

Whether a field is persisted to local or session storage can be overridden on a per-field basis. Below we show the same
field configuration achieved using both a LocalResource and a SessionResource.

::: code-group

```ts [LocalResource]
import { LocalResource, field } from '@warp-drive/experiments/storage';

@LocalResource('home-page')
export class HomePage {
  @field showLargePreviews: boolean = false;
  @field('session') scrollOffset: number = 0;
}
```

```ts [SessionResource]
import { SessionResource, field } from '@warp-drive/experiments/storage';

@SessionResource('home-page')
export class HomePage {
  @field('local') showLargePreviews: boolean = false;
  @field scrollOffset: number = 0;
}
```

:::

### Resource Keys

Each field is stored with a key format: `persisted:{resourceKey}:{fieldName}`

For example, with `@LocalResource('site-theme')` and a field `explicitThemePreference`, the storage key becomes:

```
persisted:site-theme:explicitThemePreference
```

This key format is guaranteed, should you ever need to directly access the value in storage for some reason.

### Static Resource Keys

```ts
// site-theme here is an example of a static resource key
@LocalResource('site-theme')
class SiteTheme {}
```

Every instance of a Storage Resource that shares the same key shares the same underlying storage. This can be useful for singleton state and services, and even for some components. For supporting separate class instances each with their own storage use a dynamic resource key (read on below).

### Dynamic Resource Keys

`LocalResource` and `SessionResource` accept a function for generating their storage key.

The generator runs once per instance the first time a storage field is used, and receives the instance as its only argument.

```ts
type KeyFn = (instance: object) => string;

@LocalResource((instance: UserDashboard) => `user-${instance.userId}`)
class UserDashboard {
  userId: string;

  @field widgets: string[] = [];
  @field layout: string = 'grid';

  constructor(userId: string) {
    this.userId = userId;
  }
}

// Each user gets their own persisted dashboard
const alice = new UserDashboard('alice');
const bob = new UserDashboard('bob');
```

### `@field` Field Values

Values are serialized/deserialized into strings for storage using `JSON.stringify` and `JSON.parse`, making most value types acceptable to use.

Ideally, field values should be primitives (`string` `number` `boolean` `null`), as object values will not react to inner value changes and thus will not properly reactively update or synchronize.

#### Default Field Values

Default values are provided via the field initializer.

```ts
import { LocalResource, field } from '@warp-drive/experiments/storage';

@LocalResource('home-page')
export class HomePage {
  @field scrollOffset: number = 0; // 0 is the "default value"
}
```

When the field initializes, the default value initializer will
run only IF no value for the field is present in storage.

### Reactive Updates from other Tabs/Windows

Fields will automatically update their reactive value when changed by any other browser tab or window, thus also resulting in the recomputation of any derived state that consumes the value.

### Using `@effect` to Respond to Cross-Tab Updates

Very occasionally, external updates result in needing to synchronize non-reactive/derived state. For instance, in order to properly theme a site for light mode vs dark mode, the mode (and typically a class) needs to be added to the document's root element or body element. Since these elements are not generally rendered via derivation, we can't rely on derived state updates to effect these changes.

One approach for these scenarios in Ember is to use a template-based modifier or helper to run a callback when the value changes.

```gts [Helper Approach]
function updateSiteTheme(mode: 'light' | 'dark') {
  document.body.classList.add(mode);
  document.body.classList.remove(mode === 'light' ? 'dark' : 'light');
}

<template>
  {{updateSiteTheme theme.mode}}
</template>
```

But this involves manually wiring up the effect in a different file, which may not be ideal.

Instead, we can change our field into an `effect`.

```ts
import { LocalResource, field } from '@warp-drive/experiments/storage';

@LocalResource('settings')
export class HomePage {
  @effect(syncThemeToDOM)
  mode: 'light' | 'dark' = 'light';
}

function syncThemeToDOM(this: SiteTheme): void {
  const { mode } = this;
  document.body.classList.add(mode);
  document.body.classList.remove(mode === 'light' ? 'dark' : 'light');
}
```

:::warning ⚠️ CAUTION
Unlike the helper approach, effects only run when the value change originates from another tab or window.
:::

Why don't effects run on every change and initialization? Often when synchronizing state the directionality matters. This approach ensures you can easily use context to achieve any desired outcome.

### Turning Components into Storage Resources

Storage Resources work seamlessly with Ember Components, as these are just
regular classes. We can even use component args for calculating our dynamic
resource key and setting our default values.

```gts
import Component from '@glimmer/component';
import { SessionResource, field } from '@warp-drive/experiments/storage';

interface LocationSignature {
  Args: {
    id: string;
    lat: number;
    lng: number;
  }
}

@SessionResource((loc: Location) => `loc:${loc.args.id}`)
export class Location extends Component<LocationSignature> {
  @field mapCenterLat = this.args.lat;
  @field mapCenterLng = this.args.lng;
}
```

### Turning Services into Storage Resources

Storage Resources work seamlessly with Ember Services, as these are just
regular classes.

```ts
import Service from '@ember/service';
import { LocalResource, field } from '@warp-drive/experiments/storage';

@LocalResource('route-history')
export class HistoryService extends Service {
  @field latestRoute: string | null = null;
  @field visitCount: number = 0;
}
```

### Using `@param` to turn Storage Resources into URL param sources

Any Storage Resource's fields can be used as the backing source of state for
URL query params by decorating the field with additional meta information using `@param`.

::: code-group

```ts [Example]
@SessionResource('map-state')
class MapState {
  @param({
    serialize: (value: boolean) => value ? '1' : null,
    deserialize: (urlValue: string) => urlValue === '1',
  })
  @field
  active: boolean = false;
}
```

```ts [Param Options]

/**
 * Configuration options for fields that are also query parameters
 */
export interface ParamConfig {
  /**
   * Convert a value into a string for storage in the URL.
   * `null` indicates the value should be omitted from the URL.
   */
  serialize: (value: unknown, instance: any) => string | null;
  /**
   * Convert a string value from the URL back into
   * its original type
   */
  deserialize: (urlValue: string, instance: any) => unknown;
  /**
   * Get the default value for this param from the given instance.
   *
   * If not present, the value passed to the field initializer
   * will be used as the default.
   *
   * This should return the value in the field's native type,
   * not the serialized URL form.
   */
  getDefault?: (instance: any) => unknown;
}
```

:::tip 💡 TIP
Configuring a field to be consumable as a param does not automatically start
syncing the value to/from the URL (this is the route's responsibility, see
the guide for query params).
:::

Serialization and Deserialization does more than just enable converting values to strings for the URL.

* Returning `null` from serialize indicates a param's current value shouldn't be put into the url
* Comparisons of the url value to local values always use the serialized form of both
* implementing `getDefault` enables fine-tuned control over whether an existing value is default (and thus should be omitted from the url)

The comparison behavior is especially useful. For instance, assume you wanted to serialize `latitude`, `longitude` and `zoom` for a map view into the url. The local values may have 14 digits of precision, which is useful for smoothing purposes but would make a URL hard to read.

```http
/view?lat=37.80454055229913&lng=-122.1770635574278&zoom=13.225286550972479
```

Using serialization, we can cap the precision we care about for the url for each parameter, lets say `5` digits (roughly 1 meter precision) for latitude and longitude and `1` digits for zoom:

```http
/view?lat=37.80454&lng=-122.17706&zoom=13.2
```

The result is a cleaner value for sharing in the URL while our local value remains unaffected.

#### Pre-Built `@param` configs

There are pre-built param config generators for boolean and numerical values.

* `BooleanParam`
* `NumberParam`

::: code-group

```ts [Number Example]
@SessionResource('map-state')
class MapState {
  @param(NumberParam(5))
  @field
  lat: number = 0;
}
```

```ts [Boolean Example]
@SessionResource('map-state')
class MapState {
  @param(BooleanParam())
  @field
  active: boolean = false;
}
```

:::

## Configuration

Configure storage behavior before first use:

```ts
import {
  configureLocalStorage,
  configureSessionStorage
} from '@warp-drive/experiments/storage';

configureLocalStorage({
  // Fallback to in-memory storage in private browsing mode
  fallbackToMemory: true,

  // Update the in-memory reactive state even when storage quota is exceeded
  updateOnQuotaExceeded: false,

  // Handle quota exceeded errors
  onQuotaExceeded: async (key, value) => {
    // Return true to retry, false to skip
    const shouldClear = confirm('Storage full. Clear old data?');
    if (shouldClear) {
      localStorage.clear();
      return true;
    }
    return false;
  }
});
```
