---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/guides/the-manual/schemas/resources/polaris-mode.md
description: >-
  Decide whether to try preview PolarisMode by weighing its immutable records
  and explicit editing against its current relationship and state-property
  limitations.
---

# PolarisMode (preview)

:::tip 💡 **PolarisMode is not yet recommended**
Currently we recommend apps use [LegacyMode](./legacy-mode.md). PolarisMode is currently in
preview and will become the recommendation in V6.
:::

PolarisMode will become the default recommendation for new apps beginning in V6. It is currently
in preview.

## Feature Overview

In PolarisMode:

* ReactiveResources are immutable (unless explicitly newly created or checked out for editing)
* The mode changes how mutations are handled, local changes will only show where you want them to on the editable version of a record, while the immutable version will never show local changes.
* The mode removes the API cruft Model had accumulated (references, state props, currentState, methods etc)
* \~~The mode enables deep reactivity for fields~~ (we have now enabled this for LegacyMode)
* \~~enables advanced derivations, aliasing and transformations~~ (we have now enabled this for LegacyMode)
* Relationships use the `resource` and `collection` field kinds, whose values are [relationship documents](../../relational-data/features/resource-relationships.md) (`data`/`links`/`meta`) that are mutated via `data` on a checked-out record. The legacy `belongsTo`/`hasMany` kinds are supported only in [LinksMode](../../misc/links-mode.md).
* **\[preview limitation]** it has no access to reactive properties describing the resource state (such as `isNew` or `isDirty`) or utilities for working with local state like `rollback`
* Async relationships are not wrapped in promise proxies, and there is no autofetch.
