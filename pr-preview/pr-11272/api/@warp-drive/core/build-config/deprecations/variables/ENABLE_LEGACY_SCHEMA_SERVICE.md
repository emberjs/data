---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_SCHEMA_SERVICE.md
---

# &#x20;ENABLE\_LEGACY\_SCHEMA\_SERVICE&#x20;

```ts
const ENABLE_LEGACY_SCHEMA_SERVICE: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/deprecations.d.ts:433](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/deprecations.d.ts#L433)

When the flag is `true` (default), the legacy schema
service features will be enabled on the store and
the service, and deprecations will be thrown when
they are used.

Deprecated features include:

* `Store.registerSchema` method is deprecated in favor of the `Store.createSchemaService` hook
* `Store.registerSchemaDefinitionService` method is deprecated in favor of the `Store.createSchemaService` hook
* `Store.getSchemaDefinitionService` method is deprecated in favor of `Store.schema` property
* `SchemaService.doesTypeExist` method is deprecated in favor of the `SchemaService.hasResource` method
* `SchemaService.attributesDefinitionFor` method is deprecated in favor of the `SchemaService.fields` method
* `SchemaService.relationshipsDefinitionFor` method is deprecated in favor of the `SchemaService.fields` method

## Until

6.0
