---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/guides/faq/polaris-mode-with-ember-and-react.md
description: >-
  Learn why an app rendering Ember and React on the same page can share a
  WarpDrive store in LegacyMode, and which Model fields won't re-render React
  components.
---

# Do I need PolarisMode to share state between Ember and React on the same page?

No. An app that renders both Ember and React on the same page can share one store between them
while using [LegacyMode](/guides/the-manual/schemas/resources/legacy-mode.md), the schema mode that
emulates Models, rather than switching to
[PolarisMode (preview)](/guides/the-manual/schemas/resources/polaris-mode.md). See
[Setup - React](/guides/configuration/react.md) for giving React components access to the store.

We recommend that apps without Ember avoid LegacyMode because legacy features such as Models,
Adapters and Serializers are built on `EmberObject`. Using them means shipping `ember-source` and
Ember's reactivity system, a large cost in bundle size and performance for an app that doesn't
otherwise use Ember (see
[Drawbacks of Using LegacyMode](/guides/the-manual/schemas/resources/legacy-mode.md#drawbacks-of-using-legacymode)).
When Ember is already on the page, the app has already paid that cost, so LegacyMode adds little
on top of it.

## Watch Out For `@computed` and `@tracked` on Models

The fields WarpDrive defines for a Model, such as `@attr`, `@belongsTo` and `@hasMany`, use
***Warp*Drive**'s own signals, so React components that read them re-render when they change.
Properties you add to a Model yourself with Ember's `@computed` or `@tracked` don't use those
signals. Ember templates still update when they change, but React components that read them
won't re-render.

:::tip 🔭 Coming Soon
***Warp*Drive** uses signal decorators internally to define reactive fields. Watch the
[RFCs](/rfcs/index.md) for an upcoming proposal to make them public, so apps can define
properties that re-render in any framework.
:::
