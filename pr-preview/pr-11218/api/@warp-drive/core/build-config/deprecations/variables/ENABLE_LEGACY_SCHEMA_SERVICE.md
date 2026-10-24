---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_SCHEMA_SERVICE.md
description: >-
  Deprecation flag that keeps the legacy schema service APIs, such as
  `registerSchemaDefinitionService`, enabled while warning when they are used.
---

# &#x20;ENABLE\_LEGACY\_SCHEMA\_SERVICE&#x20;

```ts
const ENABLE_LEGACY_SCHEMA_SERVICE: boolean;
```

Defined in: [warp-drive-packages/build-config/src/deprecations.ts:463](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/build-config/src/deprecations.ts#L463)

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
