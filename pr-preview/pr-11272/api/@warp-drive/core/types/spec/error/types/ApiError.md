---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/spec/error/types/ApiError.md
---

# &#x20;ApiError

```ts
interface ApiError {
  code?: string;
  detail?: string;
  id?: string;
  links?: { about?: Link; type?: Link };
  meta?: ObjectValue;
  source?: { header?: string; parameter?: string; pointer?: string };
  status?: string;
  title?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:18](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L18)

Represents a single error in the `errors` member of a {json:api} document.

[{json:api} Spec](https://jsonapi.org/format/#error-objects)

## Example

```json
{
  "status": "422",
  "source": { "pointer": "/data/attributes/name" },
  "title": "Invalid Attribute",
  "detail": "name cannot be blank"
}
```

## Properties

### code?

```ts
optional code?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:52](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L52)

an application-specific error code, expressed as a string value

***

### detail?

```ts
optional detail?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:31](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L31)

a human-readable explanation specific to this occurrence of the problem

***

### id?

```ts
optional id?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:22](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L22)

a unique identifier for this particular occurrence of the problem

***

### links?

```ts
optional links?: {
  about?: Link;
  type?: Link;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:35](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L35)

links related to the error

#### about?

```ts
optional about?: Link;
```

a link that leads to further details about this particular occurrence of the problem

#### type?

```ts
optional type?: Link;
```

a link that identifies the type of error that this particular error is an instance of

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:77](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L77)

non-standard meta-information about the error

***

### source?

```ts
optional source?: {
  header?: string;
  parameter?: string;
  pointer?: string;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:60](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L60)

an object containing references to the primary source of the error

The spec says this SHOULD include one of `pointer`, `parameter` or
`header`. For example, an error sourced from a query param includes `parameter` and no
`pointer`.

#### header?

```ts
optional header?: string;
```

the name of a single request header which caused the error

#### parameter?

```ts
optional parameter?: string;
```

the URI query parameter that caused the error

#### pointer?

```ts
optional pointer?: string;
```

a JSON Pointer to the value in the request document that caused the error

***

### status?

```ts
optional status?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:48](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L48)

the HTTP status code applicable to this problem, expressed as a string value

***

### title?

```ts
optional title?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:27](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/error.ts#L27)

a short, human-readable summary of the problem that should not
change from occurrence to occurrence of the problem
