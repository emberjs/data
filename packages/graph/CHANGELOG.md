# @ember-data/graph Changelog

## v5.3.4-alpha.0 (2024-06-15)

#### :memo: Documentation

* [#9328](https://github.com/emberjs/data/pull/9328) chore: update READMEs with status and dist tag info ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9471](https://github.com/emberjs/data/pull/9471) feat: npx warp-drive ([@runspired](https://github.com/runspired))
* [#9468](https://github.com/emberjs/data/pull/9468) feat: string utils 🌌  ([@runspired](https://github.com/runspired))
* [#9407](https://github.com/emberjs/data/pull/9407) feat: v2 addons ([@runspired](https://github.com/runspired))
* [#9448](https://github.com/emberjs/data/pull/9448) feat: impl SchemaService RFC ([@runspired](https://github.com/runspired))
* [#9366](https://github.com/emberjs/data/pull/9366) feat: typed Model ([@runspired](https://github.com/runspired))
* [#9260](https://github.com/emberjs/data/pull/9260) feat: ember specific data utils ([@runspired](https://github.com/runspired))
* [#9249](https://github.com/emberjs/data/pull/9249) chore: handle declare statements in module rewriting ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9364](https://github.com/emberjs/data/pull/9364) fix: restore old behavior in deprecation ([@enspandi](https://github.com/enspandi))
* [#9265](https://github.com/emberjs/data/pull/9265) feat: Improve config handling for polyfillUUID ([@MehulKChaudhari](https://github.com/MehulKChaudhari))
* [#9263](https://github.com/emberjs/data/pull/9263) fix: set localState to latest identifier in belongsTo when merging identifiers ([@runspired](https://github.com/runspired))
* [#9251](https://github.com/emberjs/data/pull/9251) fix: notify during replace if existing localState never previously calculated ([@runspired](https://github.com/runspired))

#### :house: Internal

* [#9292](https://github.com/emberjs/data/pull/9292) feat: add new build-config package ([@runspired](https://github.com/runspired))
* [#9370](https://github.com/emberjs/data/pull/9370) chore: rename macros ([@runspired](https://github.com/runspired))
* [#9303](https://github.com/emberjs/data/pull/9303) infra: setup mirror and types publishing ([@runspired](https://github.com/runspired))

#### Committers: (3)

Chris Thoburn ([@runspired](https://github.com/runspired))
Andreas Minnich ([@enspandi](https://github.com/enspandi))
Mehul Kiran Chaudhari ([@MehulKChaudhari](https://github.com/MehulKChaudhari))

For the full project changelog see [https://github.com/emberjs/data/blob/main/CHANGELOG.md](https://github.com/emberjs/data/blob/main/CHANGELOG.md)

## v5.3.1 (2024-02-24)

#### :rocket: Enhancement

* [#9220](https://github.com/emberjs/data/pull/9220) feat: request infra improvements ([@runspired](https://github.com/runspired))
* [#8949](https://github.com/emberjs/data/pull/8949) feat:prepare for universal reactivity ([@runspired](https://github.com/runspired))
* [#8935](https://github.com/emberjs/data/pull/8935) feat: (private) implement basic field support for schema-record ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9221](https://github.com/emberjs/data/pull/9221) fix: prevent rollbackRelationships from setting remoteState and localState to the same array reference ([@runspired](https://github.com/runspired))
* [#9097](https://github.com/emberjs/data/pull/9097) fix: allow decorator syntax in code comments during yui doc processing ([@jaredgalanis](https://github.com/jaredgalanis))

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
* [#9025](https://github.com/emberjs/data/pull/9025) chore: reconfigure request package type location ([@runspired](https://github.com/runspired))
* [#9017](https://github.com/emberjs/data/pull/9017) chore: make json-api cache strict ([@runspired](https://github.com/runspired))
* [#8931](https://github.com/emberjs/data/pull/8931) chore: package infra for schema-record ([@runspired](https://github.com/runspired))

#### Committers: (3)

Chris Thoburn ([@runspired](https://github.com/runspired))
Jared Galanis ([@jaredgalanis](https://github.com/jaredgalanis))
Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))

