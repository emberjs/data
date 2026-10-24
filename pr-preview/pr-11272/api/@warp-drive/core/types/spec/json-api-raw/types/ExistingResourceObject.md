---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/spec/json-api-raw/types/ExistingResourceObject.md
---

# &#x20;ExistingResourceObject\<T *extends* `string` = `string`>

```ts
interface ExistingResourceObject<T extends string = string> {
  attributes?: ObjectValue;
  id: string;
  lid?: string;
  links?: Links;
  meta?: ObjectValue;
  relationships?: ResourceRelationshipsObject<ExistingResourceIdentifierObject<string>>;
  type: T;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:271](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L271)

Contains the data for an existing resource in JSON:API format

## Type Parameters

### T

`T` *extends* `string` = `string`

## Properties

### attributes?

```ts
optional attributes?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:279](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L279)

the resource's attributes

***

### id

```ts
id: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:98](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L98)

the resource's persisted id

#### Inherited from

```ts
ExistingResourceIdentifierObject.id
```

***

### lid?&#x20;

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:121](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L121)

While not officially part of the `JSON:API` spec,
`ember-data` allows the use of `lid` as a local
identifier for a `Resource`.

It is best to include the lid used when creating
a new resource if this is the response to a new resource creation,
also recommended if this resource type uses secondary indexes.

Once a `ResourceIdentifierObject` has been seen by the cache, `lid`
should always be present. Only when inbound from the an `API` response
is `lid` considered optional.

[Identifiers RFC](https://github.com/emberjs/rfcs/blob/main/text/0403-ember-data-identifiers.md#ember-data--identifiers)

#### Inherited from

```ts
ExistingResourceIdentifierObject.lid
```

***

### links?

```ts
optional links?: Links;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:287](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L287)

links related to the resource

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:275](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L275)

meta information about the resource

#### Overrides

```ts
ExistingResourceIdentifierObject.meta
```

***

### relationships?

```ts
optional relationships?: ResourceRelationshipsObject<ExistingResourceIdentifierObject<string>>;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:283](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L283)

the resource's relationships to other resources

***

### type

```ts
type: T;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:103](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L103)

the resource's type

#### Inherited from

`ExistingResourceObject`.[`type`](#type)
