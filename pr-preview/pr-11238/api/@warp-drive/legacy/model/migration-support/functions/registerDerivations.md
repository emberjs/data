---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/legacy/model/migration-support/functions/registerDerivations.md
description: >-
  Legacy setup that registers the derivation, relationship behaviors, and
  extension a schema service needs to support LegacyMode records.
---

&#x20;

# &#x20;registerDerivations()

```ts
function registerDerivations(schema: SchemaService): void;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:450](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/model/migration-support.ts#L450)

A function which registers the necessary derivations to support
the LegacyMode features of @warp-drive/legacy/model while migrating to WarpDrive.

This must be called in order to use the fields added by [withDefaults](withDefaults.md) or
[withRestoredDeprecatedModelRequestBehaviors](withRestoredDeprecatedModelRequestBehaviors.md).

## Parameters

### schema

`SchemaService`

The schema service to register the derivations with.

## Returns

`void`
