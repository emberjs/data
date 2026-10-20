---
releases: ["5.10"]
---
Upgrading has a new ember-data → WarpDrive section for apps still on `ember-data` 1.x through
4.12. Those releases never share a package name with `@warp-drive/*`, so such an app can install
the latest WarpDrive directly, with no mirror packages, and migrate one route at a time with a
second store: the route-level service swap, carrying the store through a subtree with
`ember-provide-consume-context`, and what to do at a component both stores share. The Upgrading
index now picks a guide by the `ember-data` version an app is on, and the 4.12 incremental
adoption guide moves into the same section, rewritten against what 4.12.8 ships, as
[Adopting the Request APIs on 4.12](/upgrading/ember-data/incremental-adoption.md). See
[Migrating from ember-data](/upgrading/ember-data/index.md).
