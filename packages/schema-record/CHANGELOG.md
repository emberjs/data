# @warp-drive/schema-record Changelog

## v0.0.0-alpha.71 (2024-06-15)

#### :memo: Documentation

* [#9328](https://github.com/emberjs/data/pull/9328) chore: update READMEs with status and dist tag info ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9471](https://github.com/emberjs/data/pull/9471) feat: npx warp-drive ([@runspired](https://github.com/runspired))
* [#9467](https://github.com/emberjs/data/pull/9467) feat: implement schema-object for schema-record ([@richgt](https://github.com/richgt))
* [#9468](https://github.com/emberjs/data/pull/9468) feat: string utils 🌌  ([@runspired](https://github.com/runspired))
* [#9466](https://github.com/emberjs/data/pull/9466) feat: make @id editable and reactive ([@runspired](https://github.com/runspired))
* [#9465](https://github.com/emberjs/data/pull/9465) feat: implement edit & create cases for legacy relationships ([@runspired](https://github.com/runspired))
* [#9464](https://github.com/emberjs/data/pull/9464) feat: implement support for legacy hasMany and belongsTo relationship reads ([@runspired](https://github.com/runspired))
* [#9407](https://github.com/emberjs/data/pull/9407) feat: v2 addons ([@runspired](https://github.com/runspired))
* [#9453](https://github.com/emberjs/data/pull/9453) feat: update SchemaService to reflect RFC updates ([@runspired](https://github.com/runspired))
* [#9448](https://github.com/emberjs/data/pull/9448) feat: impl SchemaService RFC ([@runspired](https://github.com/runspired))
* [#9366](https://github.com/emberjs/data/pull/9366) feat: typed Model ([@runspired](https://github.com/runspired))
* [#9359](https://github.com/emberjs/data/pull/9359) feat: type checked builders and inferred request types from builders ([@runspired](https://github.com/runspired))
* [#9277](https://github.com/emberjs/data/pull/9277) feat: implement managed object for schemaRecord ([@richgt](https://github.com/richgt))
* [#9260](https://github.com/emberjs/data/pull/9260) feat: ember specific data utils ([@runspired](https://github.com/runspired))
* [#9240](https://github.com/emberjs/data/pull/9240) feat: implement managed array for schemaRecord ([@richgt](https://github.com/richgt))
* [#9244](https://github.com/emberjs/data/pull/9244) feat: improves consumer-facing store types ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9459](https://github.com/emberjs/data/pull/9459) fix: ensure cachehandler responses are cast to documents ([@runspired](https://github.com/runspired))
* [#9265](https://github.com/emberjs/data/pull/9265) feat: Improve config handling for polyfillUUID ([@MehulKChaudhari](https://github.com/MehulKChaudhari))

#### :house: Internal

* [#9292](https://github.com/emberjs/data/pull/9292) feat: add new build-config package ([@runspired](https://github.com/runspired))
* [#9370](https://github.com/emberjs/data/pull/9370) chore: rename macros ([@runspired](https://github.com/runspired))

#### Committers: (3)

Chris Thoburn ([@runspired](https://github.com/runspired))
Rich Glazerman ([@richgt](https://github.com/richgt))
Mehul Kiran Chaudhari ([@MehulKChaudhari](https://github.com/MehulKChaudhari))

For the full project changelog see [https://github.com/emberjs/data/blob/main/CHANGELOG.md](https://github.com/emberjs/data/blob/main/CHANGELOG.md)

## v0.0.0-alpha.9 (2024-02-24)

#### :rocket: Enhancement

* [#9220](https://github.com/emberjs/data/pull/9220) feat: request infra improvements ([@runspired](https://github.com/runspired))
* [#9094](https://github.com/emberjs/data/pull/9094) feat: support legacy attribute behaviors in SchemaRecord ([@gitKrystan](https://github.com/gitKrystan))
* [#9095](https://github.com/emberjs/data/pull/9095) feat (internal): support legacy model behaviors in SchemaRecord legacy mode ([@runspired](https://github.com/runspired))
* [#8949](https://github.com/emberjs/data/pull/8949) feat:prepare for universal reactivity ([@runspired](https://github.com/runspired))
* [#8948](https://github.com/emberjs/data/pull/8948) feat(private): reactive simple fields ([@runspired](https://github.com/runspired))
* [#8946](https://github.com/emberjs/data/pull/8946) feat (private): implement resource relationships for SchemaRecord ([@runspired](https://github.com/runspired))
* [#8939](https://github.com/emberjs/data/pull/8939) feat (private): implement support for derivations in schema-record ([@runspired](https://github.com/runspired))
* [#8935](https://github.com/emberjs/data/pull/8935) feat: (private) implement basic field support for schema-record ([@runspired](https://github.com/runspired))

#### :house: Internal

* [#9110](https://github.com/emberjs/data/pull/9110) Stricter typescript-eslint config ([@gitKrystan](https://github.com/gitKrystan))
* [#9093](https://github.com/emberjs/data/pull/9093) feat(internal): implement legacy mode toggle ([@runspired](https://github.com/runspired))
* [#9085](https://github.com/emberjs/data/pull/9085) Add type-checking to tests/warp-drive__schema-record ([@gitKrystan](https://github.com/gitKrystan))
* [#9058](https://github.com/emberjs/data/pull/9058) Switch from eslint-plugin-prettier to running prettier directly ([@gitKrystan](https://github.com/gitKrystan))
* [#9057](https://github.com/emberjs/data/pull/9057) Add eslint-plugin-n to eslint config for node files ([@gitKrystan](https://github.com/gitKrystan))
* [#9051](https://github.com/emberjs/data/pull/9051) chore: use references for tsc, add checks to schema-record, bun to run scripts ([@runspired](https://github.com/runspired))
* [#9032](https://github.com/emberjs/data/pull/9032) chore(types): split out lint and type commands to be per-package ([@runspired](https://github.com/runspired))
* [#9046](https://github.com/emberjs/data/pull/9046) chore: reduce number of things turbo builds for build ([@runspired](https://github.com/runspired))
* [#9029](https://github.com/emberjs/data/pull/9029) chore: add @warp-drive/core as home for shared code ([@runspired](https://github.com/runspired))
* [#9025](https://github.com/emberjs/data/pull/9025) chore: reconfigure request package type location ([@runspired](https://github.com/runspired))
* [#8931](https://github.com/emberjs/data/pull/8931) chore: package infra for schema-record ([@runspired](https://github.com/runspired))

#### Committers: (2)

Chris Thoburn ([@runspired](https://github.com/runspired))
Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))

