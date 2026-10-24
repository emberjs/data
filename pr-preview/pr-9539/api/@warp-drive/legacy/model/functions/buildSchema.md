---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/legacy/model/functions/buildSchema.md
description: >-
  Legacy factory for a schema service that reads resource schemas from an app's
  `Model` classes, returned from the store's `createSchemaService` hook.
---

&#x20;

# &#x20;buildSchema()

```ts
function buildSchema(store: Store$1): SchemaService;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/schema-provider.ts:276](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/legacy/src/model/-private/schema-provider.ts#L276)

The `createSchemaService` implementation for use with `Model`. Pass
the result of this to your store's `createSchemaService` method when
configuring the store to use `Model` for schema information.

## Parameters

### store

`Store$1`

## Returns

`SchemaService`
