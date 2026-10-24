---
url: /pr-preview/pr-11087/api/@warp-drive/schema-dsl/functions/trait.md
---

# &#x20;trait()&#x20;

```ts
function trait(..._traits: AnyConstructor[]): (target: AnyConstructor) => void;
```

Defined in: [entities/compose-trait.ts:46](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/entities/compose-trait.ts#L46)

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
