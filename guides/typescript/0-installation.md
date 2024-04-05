# Installation

> [!CAUTION]
> EmberData does not maintain the DefinitelyTyped types for 
> EmberData (e.g. the `@types/ember-data__*`). If you were
> previously using these, you should uninstall them first.

> [!IMPORTANT]
> EmberData's Native Types require the use of Ember's
> Native Types.

> [!IMPORTANT]  
> Type definitions need to be installed top-level, this means
> you have to install every EmberData package `ember-data`
> depends on.

> [!TIP]
> When installing packages, use the `@canary` dist tag to get the latest
> version. E.g. `pnpm install ember-data@canary`

There are currently two ways to gain access to EmberData's native types.

1) [Use Canary](#using-canary)

2) [Use Official Types Packages](#using-types-packages)
with releases `>= 4.12.*`

---

### Using Canary

Required Packages for Canary Types

| Name | Version |
| ---- | ------- |
| [ember-data](https://github.com/emberjs/data/blob/main/packages/-ember-data/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/ember-data/canary?label=&color=90EE90) |
| [@ember-data/adapter](https://github.com/emberjs/data/blob/main/packages/adapter/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/adapter/canary?label=&color=90EE90) |
| [@ember-data/graph](https://github.com/emberjs/data/blob/main/packages/graph/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/graph/canary?label=&color=90EE90) |
| [@ember-data/json-api](https://github.com/emberjs/data/blob/main/packages/json-api/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/json-api/canary?label=&color=90EE90) |
| [@ember-data/legacy-compat](https://github.com/emberjs/data/blob/main/packages/legacy-compat/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/legacy-compat/canary?label=&color=90EE90) |
| [@ember-data/model](https://github.com/emberjs/data/blob/main/packages/model/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/model/canary?label=&color=90EE90) |
| [@ember-data/request](https://github.com/emberjs/data/blob/main/packages/request/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/request/canary?label=&color=90EE90) |
| [@ember-data/request-utils](https://github.com/emberjs/data/blob/main/packages/request-utils/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/request-utils/canary?label=&color=90EE90) |
| [@ember-data/serializer](https://github.com/emberjs/data/blob/main/packages/serializer/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/serializer/canary?label=&color=90EE90) |
| [@ember-data/store](https://github.com/emberjs/data/blob/main/packages/store/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/store/canary?label=&color=90EE90) |
| [@ember-data/tracking](https://github.com/emberjs/data/blob/main/packages/tracking/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/tracking/canary?label=&color=90EE90) |
| [@warp-drive/core-types](https://github.com/emberjs/data/blob/main/packages/core-types/README.md) | ![NPM Canary Version](https://img.shields.io/npm/v/%40warp-drive/core-types/canary?label=&color=90EE90) |

Here's an example change to package.json which drops all use of types from `@types/` for both Ember and EmberData and adds the appropriate canary packages.

```diff
-    "@types/ember": "4.0.11",
-    "@types/ember-data": "4.4.16",
-    "@types/ember-data__adapter": "4.0.6",
-    "@types/ember-data__model": "4.0.5",
-    "@types/ember-data__serializer": "4.0.6",
-    "@types/ember-data__store": "4.0.7",
-    "@types/ember__application": "4.0.11",
-    "@types/ember__array": "4.0.10",
-    "@types/ember__component": "4.0.22",
-    "@types/ember__controller": "4.0.12",
-    "@types/ember__debug": "4.0.8",
-    "@types/ember__destroyable": "4.0.5",
-    "@types/ember__engine": "4.0.11",
-    "@types/ember__error": "4.0.6",
-    "@types/ember__helper": "4.0.7",
-    "@types/ember__modifier": "4.0.9",
-    "@types/ember__object": "4.0.12",
-    "@types/ember__owner": "4.0.9",
-    "@types/ember__routing": "4.0.22",
-    "@types/ember__runloop": "4.0.10",
-    "@types/ember__service": "4.0.9",
-    "@types/ember__string": "3.16.3",
-    "@types/ember__template": "4.0.7",
-    "@types/ember__test": "4.0.6",
-    "@types/ember__utils": "4.0.7",
-    "ember-data": "~5.3.3",
+    "ember-data": "5.4.0-alpha.52",
+    "@ember-data/store": "5.4.0-alpha.52",
+    "@ember-data/adapter": "5.4.0-alpha.52",
+    "@ember-data/graph": "5.4.0-alpha.52",
+    "@ember-data/json-api": "5.4.0-alpha.52",
+    "@ember-data/legacy-compat": "5.4.0-alpha.52",
+    "@ember-data/request": "5.4.0-alpha.52",
+    "@ember-data/request-utils": "5.4.0-alpha.52",
+    "@ember-data/serializer": "5.4.0-alpha.52",
+    "@ember-data/model": "5.4.0-alpha.52",
+    "@ember-data/tracking": "5.4.0-alpha.52",
+    "@warp-drive/core-types": "0.0.0-alpha.38",
```

> [!TIP]
> If your package manager enables deduping, we recommend deduping types as much as possible.

>[!TIP]
> It is best to ensure no other dependencies are still bringing `@types/*` packages as this will cause weird type bugs.

---

### Using Types Packages

Every package in the project that ships types also publishes its types under a second package name.
This enables older releases to consume these types instead of relying on the DefinitelyTyped project.

These types-only packages have the same version number as the version they were published with, and their org or name is suffixed with `-types`. 


**Required Packages for Types**


| Name | Types Package | Version |
| ---- | ------- | ------- |
| [ember-data](https://github.com/emberjs/data/blob/main/packages/-ember-data/README.md) | ember-data-types | ![NPM Canary Version](https://img.shields.io/npm/v/ember-data-types/canary?label=&color=90EE90) |
| [@ember-data/adapter](https://github.com/emberjs/data/blob/main/packages/adapter/README.md) | @ember-data-types/adapter | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/adapter/canary?label=&color=90EE90) |
| [@ember-data/graph](https://github.com/emberjs/data/blob/main/packages/graph/README.md) | @ember-data-types/graph | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/graph/canary?label=&color=90EE90) |
| [@ember-data/json-api](https://github.com/emberjs/data/blob/main/packages/json-api/README.md) | @ember-data-types/json-api | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/json-api/canary?label=&color=90EE90) |
| [@ember-data/legacy-compat](https://github.com/emberjs/data/blob/main/packages/legacy-compat/README.md) | @ember-data-types/legacy-compat | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/legacy-compat/canary?label=&color=90EE90) |
| [@ember-data/model](https://github.com/emberjs/data/blob/main/packages/model/README.md) | @ember-data-types/model | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/model/canary?label=&color=90EE90) |
| [@ember-data/request](https://github.com/emberjs/data/blob/main/packages/request/README.md) | @ember-data-types/request | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/request/canary?label=&color=90EE90) |
| [@ember-data/request-utils](https://github.com/emberjs/data/blob/main/packages/request-utils/README.md) | @ember-data-types/request-utils | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/request-utils/canary?label=&color=90EE90) |
| [@ember-data/serializer](https://github.com/emberjs/data/blob/main/packages/serializer/README.md) | @ember-data-types/serializer | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/serializer/canary?label=&color=90EE90) |
| [@ember-data/store](https://github.com/emberjs/data/blob/main/packages/store/README.md) | @ember-data-types/store | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/store/canary?label=&color=90EE90) |
| [@ember-data/tracking](https://github.com/emberjs/data/blob/main/packages/tracking/README.md) | @ember-data-types/tracking | ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data-types/tracking/canary?label=&color=90EE90) |
| [@warp-drive/core-types](https://github.com/emberjs/data/blob/main/packages/core-types/README.md) | @warp-drive-types/core-types | ![NPM Canary Version](https://img.shields.io/npm/v/%40warp-drive-types/core-types/canary?label=&color=90EE90) |

> [!WARNING]
> When consuming types in this way, you may sometimes
> encounter a misalignment between the types and the actual API. These misalignments should be rare for 4.12.* => 5.4.*. Overall, even when these misalignments occur, we suspect there are fewer mistakes or issues with these types than in the DefinitelyTyped types.

Here's an example change to package.json which drops all use of types from `@types/` for both Ember and EmberData and adds the appropriate canary packages.

```diff
-    "@types/ember": "4.0.11",
-    "@types/ember-data": "4.4.16",
-    "@types/ember-data__adapter": "4.0.6",
-    "@types/ember-data__model": "4.0.5",
-    "@types/ember-data__serializer": "4.0.6",
-    "@types/ember-data__store": "4.0.7",
-    "@types/ember__application": "4.0.11",
-    "@types/ember__array": "4.0.10",
-    "@types/ember__component": "4.0.22",
-    "@types/ember__controller": "4.0.12",
-    "@types/ember__debug": "4.0.8",
-    "@types/ember__destroyable": "4.0.5",
-    "@types/ember__engine": "4.0.11",
-    "@types/ember__error": "4.0.6",
-    "@types/ember__helper": "4.0.7",
-    "@types/ember__modifier": "4.0.9",
-    "@types/ember__object": "4.0.12",
-    "@types/ember__owner": "4.0.9",
-    "@types/ember__routing": "4.0.22",
-    "@types/ember__runloop": "4.0.10",
-    "@types/ember__service": "4.0.9",
-    "@types/ember__string": "3.16.3",
-    "@types/ember__template": "4.0.7",
-    "@types/ember__test": "4.0.6",
-    "@types/ember__utils": "4.0.7",
+    "@ember-data-types/adapter": "^5.4.0-alpha.52",
+    "@ember-data-types/model": "^5.4.0-alpha.52",
+    "@ember-data-types/serializer": "^5.4.0-alpha.52",
+    "@ember-data-types/store": "^5.4.0-alpha.52",
+    "@ember-data-types/graph": "^5.4.0-alpha.52",
+    "@ember-data-types/json-api": "^5.4.0-alpha.52",
+    "@ember-data-types/legacy-compat": "^5.4.0-alpha.52",
+    "@ember-data-types/request": "^5.4.0-alpha.52",
+    "@ember-data-types/request-utils": "^5.4.0-alpha.52",
+    "@ember-data-types/tracking": "^5.4.0-alpha.52",
+    "@warp-drive-types/core-types": "^0.0.0-alpha.38",
     "ember-data": "^4.12.7",
+    "ember-data-types": "^5.4.0-alpha.52",
```
