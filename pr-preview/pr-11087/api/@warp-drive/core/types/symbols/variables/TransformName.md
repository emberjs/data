---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/types/symbols/variables/TransformName.md
---

# &#x20;TransformName

```ts
const TransformName: "___(unique) Symbol($type)" = Type;
```

Defined in: [warp-drive-packages/core/src/types/symbols.ts:84](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/symbols.ts#L84)

Symbol for the name of a transform.

This is an optional feature that can be used by
transform implementations to provide a typescript
hint for the name of the transform.

If not used, `attr<Transform>('name')` will
allow any string name. `attr('name')` will always
allow any string name.

If used, `attr<Transform>('name')` will enforce
that the name is the same as the transform name.
