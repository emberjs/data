# Installation

There are currently two ways to gain access to EmberData's native types.

1) [Use Canary](#using-canary) (latest canary is ![NPM Canary Version](https://img.shields.io/npm/v/ember-data/canary?label=%40canary&color=FFBF00))

2) [Use Official Types Packages](#using-types-packages)
with releases `>= 4.12.*`


> [!CAUTION]
> EmberData does not maintain the DefinitelyTyped types for 
> EmberData (e.g. the `@types/ember-data__*`). If you were
> previously using these, you should uninstall them first.

### Using Canary

> [!IMPORTANT]  
> Type definitions need to be installed top-level, this means
> you have to install every EmberData package `ember-data`
> depends on.

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


### Using Types Packages

> [!IMPORTANT]  
> Type definitions need to be installed top-level, this means
> you have to install types for every EmberData package
> `ember-data` depends on.

the `@ember-data-types/*` and `@warp-drive-types/*` packages
