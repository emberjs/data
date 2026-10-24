---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/build-config/deprecations/variables/ENABLE_LEGACY_SCHEMA_SERVICE.md
---

# &#x20;ENABLE\_LEGACY\_SCHEMA\_SERVICE&#x20;

```ts
const ENABLE_LEGACY_SCHEMA_SERVICE: boolean = true;
```

Defined in: [deprecations.ts:443](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/build-config/src/deprecations.ts#L443)

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
