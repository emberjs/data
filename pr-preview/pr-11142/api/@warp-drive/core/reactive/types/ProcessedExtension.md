---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/core/reactive/types/ProcessedExtension.md
description: >-
  A registered schema extension normalized into its kind, name, and a map of its
  features keyed by property name.
---

# &#x20;ProcessedExtension

```ts
interface ProcessedExtension {
  features: Map<string | symbol, ExtensionDef>;
  kind: "object" | "array";
  name: string;
}
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:248](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/reactive/-private/schema.ts#L248)

The result of processExtension normalizing a
[CAUTION\_MEGA\_DANGER\_ZONE\_Extension](CAUTION_MEGA_DANGER_ZONE_Extension.md) into a lookup of its features
by name.

## Properties

### features

```ts
features: Map<string | symbol, ExtensionDef>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:254](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/reactive/-private/schema.ts#L254)

Each feature the extension exposes, keyed by its property name.

***

### kind

```ts
kind: "object" | "array";
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:250](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/reactive/-private/schema.ts#L250)

Whether this extension applies to objects/resources or to arrays.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:252](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/reactive/-private/schema.ts#L252)

The name the extension was registered under.
