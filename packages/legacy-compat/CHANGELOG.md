# @ember-data/legacy-compat Changelog

## v5.3.4 (2024-06-15)

#### :memo: Documentation

* [#9328](https://github.com/emberjs/data/pull/9328) chore: update READMEs with status and dist tag info ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9474](https://github.com/emberjs/data/pull/9474) Improve query types for legacy-compat/builders ([@gitKrystan](https://github.com/gitKrystan))
* [#9471](https://github.com/emberjs/data/pull/9471) feat: npx warp-drive ([@runspired](https://github.com/runspired))
* [#9468](https://github.com/emberjs/data/pull/9468) feat: string utils 🌌  ([@runspired](https://github.com/runspired))
* [#9407](https://github.com/emberjs/data/pull/9407) feat: v2 addons ([@runspired](https://github.com/runspired))
* [#9448](https://github.com/emberjs/data/pull/9448) feat: impl SchemaService RFC ([@runspired](https://github.com/runspired))
* [#9444](https://github.com/emberjs/data/pull/9444) feat: rename LifetimesService => CachePolicy for clarity ([@runspired](https://github.com/runspired))
* [#9400](https://github.com/emberjs/data/pull/9400) feat: add expectId util ([@runspired](https://github.com/runspired))
* [#9366](https://github.com/emberjs/data/pull/9366) feat: typed Model ([@runspired](https://github.com/runspired))
* [#9359](https://github.com/emberjs/data/pull/9359) feat: type checked builders and inferred request types from builders ([@runspired](https://github.com/runspired))
* [#9353](https://github.com/emberjs/data/pull/9353) feat: utilies for migrating to stricter type and id usage ([@runspired](https://github.com/runspired))
* [#9319](https://github.com/emberjs/data/pull/9319) Add @ember-data/legacy-compat/builders ([@gitKrystan](https://github.com/gitKrystan))
* [#9260](https://github.com/emberjs/data/pull/9260) feat: ember specific data utils ([@runspired](https://github.com/runspired))
* [#9244](https://github.com/emberjs/data/pull/9244) feat: improves consumer-facing store types ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9265](https://github.com/emberjs/data/pull/9265) feat: Improve config handling for polyfillUUID ([@MehulKChaudhari](https://github.com/MehulKChaudhari))

#### :house: Internal

* [#9292](https://github.com/emberjs/data/pull/9292) feat: add new build-config package ([@runspired](https://github.com/runspired))
* [#9392](https://github.com/emberjs/data/pull/9392) Fix some typos after reading code ([@Baltazore](https://github.com/Baltazore))
* [#9370](https://github.com/emberjs/data/pull/9370) chore: rename macros ([@runspired](https://github.com/runspired))
* [#9279](https://github.com/emberjs/data/pull/9279) types: branded transforms and improve types needed for serializers ([@runspired](https://github.com/runspired))

#### Committers: (4)

Chris Thoburn ([@runspired](https://github.com/runspired))
Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))
Mehul Kiran Chaudhari ([@MehulKChaudhari](https://github.com/MehulKChaudhari))
Kirill Shaplyko ([@Baltazore](https://github.com/Baltazore))

For the full project changelog see [https://github.com/emberjs/data/blob/main/CHANGELOG.md](https://github.com/emberjs/data/blob/main/CHANGELOG.md)

## v5.3.1 (2024-02-24)

#### :memo: Documentation

* [#9072](https://github.com/emberjs/data/pull/9072) feat: advanced JSON:API queries & basic request example ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9220](https://github.com/emberjs/data/pull/9220) feat: request infra improvements ([@runspired](https://github.com/runspired))
* [#9095](https://github.com/emberjs/data/pull/9095) feat (internal): support legacy model behaviors in SchemaRecord legacy mode ([@runspired](https://github.com/runspired))
* [#9072](https://github.com/emberjs/data/pull/9072) feat: advanced JSON:API queries & basic request example ([@runspired](https://github.com/runspired))
* [#8935](https://github.com/emberjs/data/pull/8935) feat: (private) implement basic field support for schema-record ([@runspired](https://github.com/runspired))
* [#8921](https://github.com/emberjs/data/pull/8921) feat: Improved Fetch Errors ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#8934](https://github.com/emberjs/data/pull/8934) fix: JSONAPISerializer should not reify empty records ([@runspired](https://github.com/runspired))

#### :house: Internal

* [#9110](https://github.com/emberjs/data/pull/9110) Stricter typescript-eslint config ([@gitKrystan](https://github.com/gitKrystan))
* [#9058](https://github.com/emberjs/data/pull/9058) Switch from eslint-plugin-prettier to running prettier directly ([@gitKrystan](https://github.com/gitKrystan))
* [#9057](https://github.com/emberjs/data/pull/9057) Add eslint-plugin-n to eslint config for node files ([@gitKrystan](https://github.com/gitKrystan))
* [#9055](https://github.com/emberjs/data/pull/9055) Fix ESLint for VSCode ([@gitKrystan](https://github.com/gitKrystan))
* [#9051](https://github.com/emberjs/data/pull/9051) chore: use references for tsc, add checks to schema-record, bun to run scripts ([@runspired](https://github.com/runspired))
* [#9032](https://github.com/emberjs/data/pull/9032) chore(types): split out lint and type commands to be per-package ([@runspired](https://github.com/runspired))
* [#9050](https://github.com/emberjs/data/pull/9050) chore: use composite mode for tsc ([@runspired](https://github.com/runspired))
* [#9049](https://github.com/emberjs/data/pull/9049) chore: incremental tsc builds ([@runspired](https://github.com/runspired))
* [#9046](https://github.com/emberjs/data/pull/9046) chore: reduce number of things turbo builds for build ([@runspired](https://github.com/runspired))
* [#9029](https://github.com/emberjs/data/pull/9029) chore: add @warp-drive/core as home for shared code ([@runspired](https://github.com/runspired))
* [#9028](https://github.com/emberjs/data/pull/9028) chore: more isolated types ([@runspired](https://github.com/runspired))
* [#9025](https://github.com/emberjs/data/pull/9025) chore: reconfigure request package type location ([@runspired](https://github.com/runspired))
* [#9019](https://github.com/emberjs/data/pull/9019) chore: make model types strict ([@runspired](https://github.com/runspired))
* [#9017](https://github.com/emberjs/data/pull/9017) chore: make json-api cache strict ([@runspired](https://github.com/runspired))
* [#9016](https://github.com/emberjs/data/pull/9016) chore: make type-only files strict ([@runspired](https://github.com/runspired))
* [#8931](https://github.com/emberjs/data/pull/8931) chore: package infra for schema-record ([@runspired](https://github.com/runspired))
* [#8906](https://github.com/emberjs/data/pull/8906) feat: expand mock-server capabilities, add to main tests ([@runspired](https://github.com/runspired))

#### Committers: (2)

Chris Thoburn ([@runspired](https://github.com/runspired))
Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))

