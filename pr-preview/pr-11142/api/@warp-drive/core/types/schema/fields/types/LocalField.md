---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/core/types/schema/fields/types/LocalField.md
description: >-
  Field schema of kind `@local` for memoized, writable per-record state that is
  never cached or sent to the server; currently private to built-in fields.
---

# &#x20;LocalField

```ts
interface LocalField {
  kind: "@local";
  name: string;
  options?: { defaultValue?: PrimitiveValue };
  type?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:458](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/schema/fields.ts#L458)

Represents a field whose value is a local
value that is not stored in the cache, nor
is it sent to the server.

Local fields can be written to, and their
value is both memoized and reactive (though
not deep-tracked).

Because their state is not derived from the cache
data or the server, they represent a divorced
uncanonical source of state.

For this reason Local fields should be used sparingly.

Currently, while we document this feature here,
only allow our own ReactiveResource default fields to
utilize them and the feature should be considered private.

Example use cases that drove the creation of local
fields are states like `isDestroying` and `isDestroyed`
which are specific to a record instance but not
stored in the cache. We wanted to be able to drive
these fields from schema the same as all other fields.

Don't make us regret this decision.

## Properties

### kind

```ts
kind: "@local";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:464](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/schema/fields.ts#L464)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:471](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/schema/fields.ts#L471)

The name of the field.

***

### options?

```ts
optional options?: {
  defaultValue?: PrimitiveValue;
};
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:485](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/schema/fields.ts#L485)

Options for the field.

#### defaultValue?

```ts
optional defaultValue?: PrimitiveValue;
```

The default value to use for the field when no value
has yet been set.

***

### type?

```ts
optional type?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:478](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/schema/fields.ts#L478)

Not currently utilized, we are considering
allowing transforms to operate on local fields
