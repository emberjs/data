---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/reactive/types/ExtensionDef.md
---

# &#x20;ExtensionDef

```ts
type ExtensionDef = 
  | {
  fn: Function;
  kind: "method";
}
  | {
  kind: "readonly-value";
  value: unknown;
}
  | {
  kind: "mutable-value";
  value: unknown;
}
  | {
  get: () => unknown;
  kind: "readonly-field";
}
  | {
  get: () => unknown;
  kind: "mutable-field";
  set: (value: unknown) => void;
}
  | {
  kind: "writeonly-field";
  set: (value: unknown) => void;
};
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:190](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/reactive/-private/schema.ts#L190)

Describes one feature added to a resource by a schema extension, as
classified by processExtension from the property descriptor it
was declared with (a method, a plain value, or a getter/setter pair).

## Union Members

### Type Literal

```ts
{
  fn: Function;
  kind: "method";
}
```

#### fn

```ts
fn: Function;
```

The function to invoke when the feature is called.

#### kind

```ts
kind: "method";
```

A callable feature, installed as a method.

***

### Type Literal

```ts
{
  kind: "readonly-value";
  value: unknown;
}
```

#### kind

```ts
kind: "readonly-value";
```

A plain, non-writable data feature.

#### value

```ts
value: unknown;
```

The value to expose for the feature.

***

### Type Literal

```ts
{
  kind: "mutable-value";
  value: unknown;
}
```

#### kind

```ts
kind: "mutable-value";
```

A plain, writable data feature.

#### value

```ts
value: unknown;
```

The value to expose for the feature.

***

### Type Literal

```ts
{
  get: () => unknown;
  kind: "readonly-field";
}
```

#### get

```ts
get: () => unknown;
```

Computes the feature's value.

##### Returns

`unknown`

#### kind

```ts
kind: "readonly-field";
```

An accessor feature with only a getter.

***

### Type Literal

```ts
{
  get: () => unknown;
  kind: "mutable-field";
  set: (value: unknown) => void;
}
```

#### get

```ts
get: () => unknown;
```

Computes the feature's value.

##### Returns

`unknown`

#### kind

```ts
kind: "mutable-field";
```

An accessor feature with both a getter and a setter.

#### set

```ts
set: (value: unknown) => void;
```

Assigns the feature's value.

##### Parameters

###### value

`unknown`

##### Returns

`void`

***

### Type Literal

```ts
{
  kind: "writeonly-field";
  set: (value: unknown) => void;
}
```

#### kind

```ts
kind: "writeonly-field";
```

An accessor feature with only a setter.

#### set

```ts
set: (value: unknown) => void;
```

Assigns the feature's value.

##### Parameters

###### value

`unknown`

##### Returns

`void`
