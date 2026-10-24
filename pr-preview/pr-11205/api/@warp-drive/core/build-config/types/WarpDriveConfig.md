---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/build-config/types/WarpDriveConfig.md
---

# &#x20;WarpDriveConfig

```ts
interface WarpDriveConfig {
  compatWith?:  ${number}.${number} ;
  debug?: Partial<*typeof* t>;
  deprecations?: Partial<{
  DEPRECATE_CATCH_ALL: boolean;
  DEPRECATE_COMPUTED_CHAINS: boolean;
  DEPRECATE_EMBER_INFLECTOR: boolean;
  DEPRECATE_LEGACY_IMPORTS: boolean;
  DEPRECATE_MANY_ARRAY_DUPLICATES: boolean;
  DEPRECATE_NON_STRICT_ID: boolean;
  DEPRECATE_NON_STRICT_TYPES: boolean;
  DEPRECATE_NON_UNIQUE_PAYLOADS: boolean;
  DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE: boolean;
  DEPRECATE_STORE_EXTENDS_EMBER_OBJECT: boolean;
  DEPRECATE_TRACKING_PACKAGE: boolean;
  DISABLE_7X_DEPRECATIONS: boolean;
  ENABLE_LEGACY_REQUEST_METHODS: boolean;
  ENABLE_LEGACY_SCHEMA_SERVICE: boolean;
}>;
  features?: Partial<{
  ENFORCE_STRICT_RESOURCE_FINALIZATION: boolean;
  JSON_API_CACHE_VALIDATION_ERRORS: boolean;
  SAMPLE_FEATURE_FLAG: boolean;
}>;
  includeDataAdapterInProduction?: boolean;
  polyfillUUID?: boolean;
}
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/index.d.ts:50](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/index.d.ts#L50)

Build Configuration options for WarpDrive that
allow adjusting logging, deprecations, canary features
and optional features.

## Properties

### compatWith?

```ts
optional compatWith?: `${number}.${number}`;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/index.d.ts:102](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/index.d.ts#L102)

The most recent version of the library from which all
deprecations have been resolved.

For instance if all deprecations released prior to or
within `5.3` have been resolved, then setting this to
`5.3` will remove all the support for the deprecated
features for associated deprecations.

:::caution **Universal Apps**
This value should be at least `5.6` for universal/non-ember
applications as that was the first version that builds
without any ember-source dependencies provided all deprecations
are resolved.
:::

See DEPRECATIONS | deprecations for more details.

***

### debug?

```ts
optional debug?: Partial<typeof t>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/index.d.ts:64](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/index.d.ts#L64)

An object of key/value pairs of logging flags

see LOGGING | debugging for the available flags.

```ts
{
 LOG_CACHE: true,
}
```

***

### deprecations?

```ts
optional deprecations?: Partial<{
  DEPRECATE_CATCH_ALL: boolean;
  DEPRECATE_COMPUTED_CHAINS: boolean;
  DEPRECATE_EMBER_INFLECTOR: boolean;
  DEPRECATE_LEGACY_IMPORTS: boolean;
  DEPRECATE_MANY_ARRAY_DUPLICATES: boolean;
  DEPRECATE_NON_STRICT_ID: boolean;
  DEPRECATE_NON_STRICT_TYPES: boolean;
  DEPRECATE_NON_UNIQUE_PAYLOADS: boolean;
  DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE: boolean;
  DEPRECATE_STORE_EXTENDS_EMBER_OBJECT: boolean;
  DEPRECATE_TRACKING_PACKAGE: boolean;
  DISABLE_7X_DEPRECATIONS: boolean;
  ENABLE_LEGACY_REQUEST_METHODS: boolean;
  ENABLE_LEGACY_SCHEMA_SERVICE: boolean;
}>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/index.d.ts:116](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/index.d.ts#L116)

An object of key/value pairs of logging flags

see DEPRECATIONS | deprecations for the available flags.

```ts
{
  DEPRECATE_THING: false,
}
```

***

### features?

```ts
optional features?: Partial<{
  ENFORCE_STRICT_RESOURCE_FINALIZATION: boolean;
  JSON_API_CACHE_VALIDATION_ERRORS: boolean;
  SAMPLE_FEATURE_FLAG: boolean;
}>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/index.d.ts:132](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/index.d.ts#L132)

An object of key/value pairs of canary feature flags
for use when testing new features gated behind a flag
in a canary release version.

see FEATURES | features for the available flags.

```ts
{
  FEATURE_A: true,
}
```

***

### includeDataAdapterInProduction?

```ts
optional includeDataAdapterInProduction?: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/index.d.ts:83](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/index.d.ts#L83)

By default, the integration required to support the ember-inspector
browser extension is included in production builds only when using
the `ember-data` package.

Otherwise the default is to exclude it. This setting allows to explicitly
enable/disable it in production builds.

***

### polyfillUUID?

```ts
optional polyfillUUID?: boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/index.d.ts:72](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/index.d.ts#L72)

If you are using the library in an environment that does not
support `window.crypto.randomUUID` you can enable a polyfill
for it.
