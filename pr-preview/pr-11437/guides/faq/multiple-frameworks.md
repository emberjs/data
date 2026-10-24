---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/guides/faq/multiple-frameworks.md
description: >-
  Learn how to use more than one framework on the same page with WarpDrive by
  importing @warp-drive/alien-signals/install before each framework's install
  entry point.
---

# Can I use multiple frameworks on one page (for instance Ember and React)?

Yes. One ***Warp*Drive** store can drive components from more than one framework on the same page.
Import `@warp-drive/alien-signals/install` first, then each framework's `install` entry point:

```ts
import '@warp-drive/alien-signals/install';
import '@warp-drive/ember/install';
import '@warp-drive/react/install';
```

Each framework generally only re-renders in response to its own signals implementation: Ember
re-renders for its autotracking tags, and React components re-render for the signals that
`@warp-drive/react` subscribes them to. On its own, each framework's `install` entry point
configures ***Warp*Drive** to use that framework's signals alone.

[`@warp-drive/alien-signals`](/api/@warp-drive/alien-signals/) solves this. Its `install` entry
point configures a signals graph that the frameworks imported after it add their signals to. It
also provides the memos for all of them, so memoized values update in every framework. Import it
first: importing it after another framework's `install` entry point throws.

::: tip Derivations only track WarpDrive's signals
With `@warp-drive/alien-signals/install`, memoized values such as
[derived fields](/guides/the-manual/schemas/derivations.md) only recompute when a signal
***Warp*Drive** manages changes. If a derivation reads state that only a framework tracks, such
as an Ember `@tracked` property or a React `useState` value, it keeps returning its cached value
when that state changes. Keep the state a derivation reads in ***Warp*Drive**, for instance as a
field on the resource it derives from.
:::

For a complete example with Ember and React, see
[Using Ember and React on the Same Page](/guides/the-manual/cookbook/multiple-frameworks-on-one-page.md).
