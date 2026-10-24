---
url: >-
  https://canary.warp-drive.io/api/@warp-drive/core/types/spec/error/types/ApiError.md
description: >-
  One {json:api} error object, with optional `status`, `code`, `title`,
  `detail`, `source`, `links`, and `meta`, found in a document's `errors` array.
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

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:25](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L25)

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
code?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:59](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L59)

an application-specific error code, expressed as a string value

***

### detail?

```ts
detail?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:38](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L38)

a human-readable explanation specific to this occurrence of the problem

***

### id?

```ts
id?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:29](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L29)

a unique identifier for this particular occurrence of the problem

***

### links?

```ts
links?: {
  about?: Link;
  type?: Link;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:42](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L42)

links related to the error

#### about?

```ts
about?: Link;
```

a link that leads to further details about this particular occurrence of the problem

#### type?

```ts
type?: Link;
```

a link that identifies the type of error that this particular error is an instance of

***

### meta?

```ts
meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:84](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L84)

non-standard meta-information about the error

***

### source?

```ts
source?: {
  header?: string;
  parameter?: string;
  pointer?: string;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:67](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L67)

an object containing references to the primary source of the error

The spec says this SHOULD include one of `pointer`, `parameter` or
`header`. For example, an error sourced from a query param includes `parameter` and no
`pointer`.

#### header?

```ts
header?: string;
```

the name of a single request header which caused the error

#### parameter?

```ts
parameter?: string;
```

the URI query parameter that caused the error

#### pointer?

```ts
pointer?: string;
```

a JSON Pointer to the value in the request document that caused the error

***

### status?

```ts
status?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:55](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L55)

the HTTP status code applicable to this problem, expressed as a string value

***

### title?

```ts
title?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/error.ts:34](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/spec/error.ts#L34)

a short, human-readable summary of the problem that should not
change from occurrence to occurrence of the problem
