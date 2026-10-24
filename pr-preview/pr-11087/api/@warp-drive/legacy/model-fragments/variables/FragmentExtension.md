---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/legacy/model-fragments/variables/FragmentExtension.md
---

&#x20;

# &#x20;FragmentExtension

```ts
const FragmentExtension: {
  features: typeof Fragment;
  kind: "object";
  name: "fragment";
};
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:73](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L73)

A schema extension that adds the [Fragment](../classes/Fragment.md) API to migrated
`ModelFragments` object resources.

## Type Declaration

### features

```ts
features: typeof Fragment;
```

The features ([Fragment](../classes/Fragment.md)) added by this extension.

### kind

```ts
kind: "object";
```

This extension applies to `'object'` schemas.

### name

```ts
name: "fragment";
```

The registered name of this extension.
