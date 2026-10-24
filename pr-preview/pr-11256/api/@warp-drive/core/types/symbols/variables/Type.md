---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/symbols/variables/Type.md
description: >-
  Symbol key that brands a record with its resource type for TypeScript, and
  names a derivation or transformation when it is registered.
---

# &#x20;Type

```ts
const Type: "___(unique) Symbol($type)";
```

Defined in: [warp-drive-packages/core/src/types/symbols.ts:60](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/symbols.ts#L60)

Symbol for the name of a resource, transformation
or derivation.

### With Resources

This is an optional feature that can be used by
record implementations to provide a typescript
hint for the type of the resource.

When used, WarpDrive APIs can
take advantage of this to provide better type
safety and intellisense.

### With Derivations

Required for derivations registered with
`store.registerDerivation(derivation)`.

```ts
function concat(record: object, options: ObjectValue | null, prop: string): string {}
concat[Name] = 'concat';
```

### With Transforms

Required for new-style transformations registered
with `store.registerTransform(transform)`.

For legacy transforms, if not used,
`attr<Transform>('name')` will allow any string name.
`attr('name')` will always allow any string name.

If used, `attr<Transform>('name')` will enforce
that the name is the same as the transform name.
