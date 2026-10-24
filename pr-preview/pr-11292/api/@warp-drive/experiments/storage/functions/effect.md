---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/experiments/storage/functions/effect.md
---

&#x20;

# &#x20;effect()

```ts
function effect(fn: <K>(update: ValueTransition<K>) => void, type?: "local" | "session"): PropertyDecorator;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage-resource.ts:206](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/experiments/src/storage/storage-resource.ts#L206)

Effects are fields that run a side-effecting function.

Effects are intended to enable synchronizing get states between
tabs or windows that result in needing to synchronize other
non-reactive state.

For example, when a user selects a light/dark mode theme preference
that differs from the system preference, effects can be used to trigger
DOM updates on the documentElement necessary to ensure its state is
consistent with the persisted resource state and reactive application state.

To do this without an effect would require either setting up your own
storage event listeners or consuming the reactive state of the property
in another effect-like API such as an Ember modifier or React useEffect,

Effects *only* run when the stored value changes due to storage events
emitted from other tabs or windows. They do not run when the property
is updated in the same context.

***

**Example:**

```ts
@LocalResource('user-preferences')
class UserPreferences {
  @effect(syncThemeToDOM)
  explicitThemePreference: 'light' | 'dark' | null = null;

  @matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDarkMode: boolean = false;
}

function syncThemeToDOM(update: ValueTransition<'light' | 'dark' | null>): void {
  const newTheme = update.to;
  document.documentElement.style.colorScheme = newTheme ?? 'light dark';

  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
    document.documentElement.classList.remove('light-theme');
  } else if (newTheme === 'light') {
    document.documentElement.classList.add('light-theme');
    document.documentElement.classList.remove('dark-theme');
  } else {
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.remove('dark-theme');
  }
}
```

## Parameters

### fn

<`K`>(`update`: [`ValueTransition`](../types/ValueTransition.md)<`K`>) => `void`

### type?

`"local"` | `"session"`

## Returns

`PropertyDecorator`
