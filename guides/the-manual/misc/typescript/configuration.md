# Configuration

There are currently two ways to gain access to WarpDrives's native types.
Follow the configuration guide below for the [installation](./installation.md)
option you chose.

1) [Use A Version That Has Types](#using-native-types)

2) [Use Official Types Packages](#using-types-packages)
with releases `>= 4.12.*`

> [!IMPORTANT]
> WarpDrive's Native Types require the use of Ember's
> Native Types, the configuration below will also setup
> Your application to consume Ember's Native Types.

### Using Native Types

To consume `alpha` stage types, you must import the types in your project's `tsconfig.json`.

For alpha stage types, we add `unstable-preview-types` to the path to help you remember the
potential volatility.

```json
 {
   "compilerOptions": {
     "types": [
       "ember-source/types",
       "ember-data/unstable-preview-types", // [!code ++:13]
       "@ember-data/store/unstable-preview-types",
       "@ember-data/adapter/unstable-preview-types",
       "@ember-data/graph/unstable-preview-types",
       "@ember-data/json-api/unstable-preview-types",
       "@ember-data/legacy-compat/unstable-preview-types",
       "@ember-data/request/unstable-preview-types",
       "@ember-data/request-utils/unstable-preview-types",
       "@ember-data/model/unstable-preview-types",
       "@ember-data/serializer/unstable-preview-types",
       "@warp-drive/core-types/unstable-preview-types",
       "@warp-drive/build-config/unstable-preview-types",
       "@warp-drive/schema-record/unstable-preview-types"
     ]
   }
 }
```

### Using Types Packages

To consume `alpha` stage types, you must import the types in your project's `tsconfig.json`.

For alpha stage types, we add `unstable-preview-types` to the path to help you remember the
potential volatility.

```diff
 {
   "compilerOptions": {
+   "types": [
+      "ember-source/types",
+      "ember-data-types/unstable-preview-types",
+      "@ember-data-types/store/unstable-preview-types",
+      "@ember-data-types/adapter/unstable-preview-types",
+      "@ember-data-types/graph/unstable-preview-types",
+      "@ember-data-types/json-api/unstable-preview-types",
+      "@ember-data-types/legacy-compat/unstable-preview-types",
+      "@ember-data-types/request/unstable-preview-types",
+      "@ember-data-types/request-utils/unstable-preview-types",
+      "@ember-data-types/model/unstable-preview-types",
+      "@ember-data-types/serializer/unstable-preview-types",
+      "@warp-drive-types/core-types/unstable-preview-types"
+    ]
   }
 }
```
