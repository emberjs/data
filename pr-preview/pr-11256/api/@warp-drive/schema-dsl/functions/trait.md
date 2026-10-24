---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/schema-dsl/functions/trait.md
description: >-
  Class decorator that records which traits a schema-dsl resource or trait
  composes, compiling their names into its `traits` array without merging their
  fields.
---

# &#x20;trait()&#x20;

```ts
function trait(..._traits: AnyConstructor[]): (target: AnyConstructor) => void;
```

Defined in: [entities/compose-trait.ts:48](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/entities/compose-trait.ts#L48)

**`Class Decorator`**

Composes one or more [Trait](Trait-1.md)-decorated classes onto a
[Resource](Resource.md) or [Trait](Trait-1.md), populating the compiled schema's
`traits` array with each composed trait's (dasherized) name.

Traits passed here must still be registered with the store (e.g. via
`store.schema.registerTrait`) separately; this decorator only records
which traits a resource depends on, it does not merge their fields into
the compiled output.

Has no effect when stacked on an [ObjectSchema](ObjectSchema.md)-decorated class:
object schemas do not compile a `traits` array.

## Parameters

### \_traits

...`AnyConstructor`\[]

## Returns

(`target`: `AnyConstructor`) => `void`

## Example

::: code-group

```ts [user.ts]
import { Resource, field, trait } from '@warp-drive/schema-dsl';

import { Timestamped } from './timestamped.ts';

@Resource
@trait(Timestamped)
export class User {
  @field declare name: string;
}
```

```json [compiled schema (excerpt)]
{
  "type": "user",
  "traits": ["timestamped"]
}
```

:::
