---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/reactive/types/ProcessedExtension.md
---

# &#x20;ProcessedExtension

```ts
interface ProcessedExtension {
  features: Map<string | symbol, ExtensionDef>;
  kind: "object" | "array";
  name: string;
}
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:236](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L236)

The result of processExtension normalizing a
[CAUTION\_MEGA\_DANGER\_ZONE\_Extension](CAUTION_MEGA_DANGER_ZONE_Extension.md) into a lookup of its features
by name.

## Properties

### features

```ts
features: Map<string | symbol, ExtensionDef>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:242](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L242)

Each feature the extension exposes, keyed by its property name.

***

### kind

```ts
kind: "object" | "array";
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:238](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L238)

Whether this extension applies to objects/resources or to arrays.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:240](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L240)

The name the extension was registered under.
