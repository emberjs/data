---
url: /pr-preview/pr-11087/api/@warp-drive/core/types/record/types/Validate.md
---

# &#x20;Validate\<K *extends* `object`, T *extends* `K`>

```ts
type Validate<K extends object, T extends K> = T extends K ? K : never;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:359](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/record.ts#L359)

A utility that takes two types, K and T, and ensures that K is a valid subset of T.

That's a mouthful, so let's break it down:

Let's say you have a User type and an Address type.

```ts
interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface User {
  name: string;
  title: string;
  address: Address;
}
```

Now, imagine you want to load a preview of the user with some information about their address,
but you don't want to load the entire user or address. You probably want to still ensure
the type of the data you do load matches the underlying Address and User types, but doesn't
include everything.

You might do something like this:

```ts
interface UserPreview {
  name: string;
  address: AddressPreview;
}

interface AddressPreview {
  city: string;
}
```

From a TypeScript performance perspective, this is the best way to approach these preview
types, but this is also error-prone, especially if the User or Address types change.

Validate can help ensure that your preview types remain valid.

```ts
type IsValidUserPreview = Validate<UserPreview, User>; // This will be valid
```

For help creating subsets of types, see [Mask](Mask.md)

## Type Parameters

### K

`K` *extends* `object`

### T

`T` *extends* `K`
