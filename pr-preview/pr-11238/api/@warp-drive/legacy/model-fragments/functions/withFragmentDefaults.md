---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/legacy/model-fragments/functions/withFragmentDefaults.md
description: >-
  Legacy ModelFragments migration helper that builds a `schema-object` field for
  a single `fragment:` type with the `ember-object` and `fragment` extensions.
---

&#x20;

# &#x20;withFragmentDefaults()

```ts
function withFragmentDefaults<FragmentType extends string, FragmentName extends string>(fragmentType: FragmentType, fragmentName?: FragmentName): {
  kind: "schema-object";
  name: FragmentType | FragmentName;
  options: {
     objectExtensions: string[];
  };
  type: `fragment:${FragmentType}`;
};
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/utilities/with-fragment-defaults.ts:11](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/model-fragments/utilities/with-fragment-defaults.ts#L11)

Used as a helper to setup the relevant parts of a fragment schema
and add extensions etc.

## Type Parameters

### FragmentType

`FragmentType` *extends* `string`

### FragmentName

`FragmentName` *extends* `string`

## Parameters

### fragmentType

`FragmentType`

The type of the fragment

### fragmentName?

`FragmentName`

The optional name of the fragment. If not provided, it will default to the fragmentType.

## Returns

The schema for a fragment

### kind

```ts
kind: "schema-object";
```

This field is a `'schema-object'` field, a single fragment.

### name

```ts
name: FragmentType | FragmentName;
```

The name of the fragment field.

### options

```ts
options: {
  objectExtensions: string[];
};
```

The schema options for this fragment field.

#### options.objectExtensions

```ts
objectExtensions: string[];
```

The registered object-schema extensions to apply to this fragment.

### type

```ts
type: `fragment:${FragmentType}`;
```

The resource type of the fragment.
