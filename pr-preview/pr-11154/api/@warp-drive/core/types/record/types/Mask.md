---
url: /pr-preview/pr-11154/api/@warp-drive/core/types/record/types/Mask.md
---

# &#x20;Mask\<K *extends* `object`, T *extends* `K`>

```ts
type Mask<K extends object, T extends K> = { [P in keyof T]: P extends keyof K ? T[P] extends K[P] ? K[P] : never : T[P] };
```

Defined in: [warp-drive-packages/core/src/types/record.ts:304](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/record.ts#L304)

A utility that takes two types, K and T, and produces a new type that is a "mask" of T based on K.

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

If you did this manually, you might do something like this:

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
types, but this is also tedious and error-prone, especially if the User or Address types change.

For Address, we could create a validated type using `Pick`:

```ts
type AddressPreview = Pick<Address, 'city'>;
```

This ensures that if the Address type changes, our AddressPreview will still be valid.
However, for UserPreview, we can't just use `Pick` because the `address` property is of type `Address`,
not `AddressPreview`. This is where the `Mask` type comes in.

With `Mask`, we define the `UserPreview` in two parts

* first, we define the subset of fields we want to include from `User`, using `Pick` or an interface.
* then, we use `Mask` to replace the related types of fields like Address with their more limited subset.

Here's how we can do it:

```ts
// First, we define the base of UserPreview with Pick
type UserPreviewBase = Pick<User, 'name' | 'address'>;
// Then, we use Mask to replace Address with AddressPreview
type UserPreview = Mask<{ address: AddressPreview }, UserPreviewBase>;
```

Now, `UserPreview` will have the `name` field from `User` and the `address` field will be of type `AddressPreview`.
This way, if the `User` or `Address` types change, TypeScript will ensure that our `UserPreview` and `AddressPreview`
types remain valid and consistent with the underlying types.

But what if your app has data with massive interfaces such that the TypeScript performance of this
approach becomes a problem? In that case, see [Validate](Validate.md)

## Type Parameters

### K

`K` *extends* `object`

### T

`T` *extends* `K`
