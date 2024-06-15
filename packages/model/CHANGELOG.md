# @ember-data/model Changelog

## v5.3.4-alpha.0 (2024-06-15)

#### :memo: Documentation

* [#9328](https://github.com/emberjs/data/pull/9328) chore: update READMEs with status and dist tag info ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9471](https://github.com/emberjs/data/pull/9471) feat: npx warp-drive ([@runspired](https://github.com/runspired))
* [#9468](https://github.com/emberjs/data/pull/9468) feat: string utils 🌌  ([@runspired](https://github.com/runspired))
* [#9464](https://github.com/emberjs/data/pull/9464) feat: implement support for legacy hasMany and belongsTo relationship reads ([@runspired](https://github.com/runspired))
* [#9407](https://github.com/emberjs/data/pull/9407) feat: v2 addons ([@runspired](https://github.com/runspired))
* [#9453](https://github.com/emberjs/data/pull/9453) feat: update SchemaService to reflect RFC updates ([@runspired](https://github.com/runspired))
* [#9448](https://github.com/emberjs/data/pull/9448) feat: impl SchemaService RFC ([@runspired](https://github.com/runspired))
* [#9450](https://github.com/emberjs/data/pull/9450) feat: improve typing around Model and createRecord ([@runspired](https://github.com/runspired))
* [#9387](https://github.com/emberjs/data/pull/9387) feat: better types for legacy store methods ([@runspired](https://github.com/runspired))
* [#9366](https://github.com/emberjs/data/pull/9366) feat: typed Model ([@runspired](https://github.com/runspired))
* [#9317](https://github.com/emberjs/data/pull/9317) feat: ensure data utils work well with legacy relationship proxies ([@runspired](https://github.com/runspired))
* [#9260](https://github.com/emberjs/data/pull/9260) feat: ember specific data utils ([@runspired](https://github.com/runspired))
* [#9256](https://github.com/emberjs/data/pull/9256) feat: improve alpha types support ([@runspired](https://github.com/runspired))
* [#9250](https://github.com/emberjs/data/pull/9250) feat: fix types for legacy decorator syntax ([@runspired](https://github.com/runspired))
* [#9249](https://github.com/emberjs/data/pull/9249) chore: handle declare statements in module rewriting ([@runspired](https://github.com/runspired))
* [#9245](https://github.com/emberjs/data/pull/9245) feat: add consumer types for Model APIs ([@runspired](https://github.com/runspired))
* [#9244](https://github.com/emberjs/data/pull/9244) feat: improves consumer-facing store types ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9265](https://github.com/emberjs/data/pull/9265) feat: Improve config handling for polyfillUUID ([@MehulKChaudhari](https://github.com/MehulKChaudhari))

#### :house: Internal

* [#9476](https://github.com/emberjs/data/pull/9476) chore: cleanup symbol usage ([@runspired](https://github.com/runspired))
* [#9463](https://github.com/emberjs/data/pull/9463) types: ManyArray => HasMany ([@runspired](https://github.com/runspired))
* [#9292](https://github.com/emberjs/data/pull/9292) feat: add new build-config package ([@runspired](https://github.com/runspired))
* [#9370](https://github.com/emberjs/data/pull/9370) chore: rename macros ([@runspired](https://github.com/runspired))
* [#9303](https://github.com/emberjs/data/pull/9303) infra: setup mirror and types publishing ([@runspired](https://github.com/runspired))
* [#9279](https://github.com/emberjs/data/pull/9279) types: branded transforms and improve types needed for serializers ([@runspired](https://github.com/runspired))

#### Committers: (2)

Chris Thoburn ([@runspired](https://github.com/runspired))
Mehul Kiran Chaudhari ([@MehulKChaudhari](https://github.com/MehulKChaudhari))

For the full project changelog see [https://github.com/emberjs/data/blob/main/CHANGELOG.md](https://github.com/emberjs/data/blob/main/CHANGELOG.md)

## v5.3.1 (2024-02-24)

#### :evergreen_tree: New Deprecation

* [#9189](https://github.com/emberjs/data/pull/9189) fix: mutating ManyArray should handle duplicates gracefully (with deprecation) ([@gitKrystan](https://github.com/gitKrystan))

#### :memo: Documentation

* [#9159](https://github.com/emberjs/data/pull/9159) fix: support full range of json:api for references, update docs ([@runspired](https://github.com/runspired))
* [#9072](https://github.com/emberjs/data/pull/9072) feat: advanced JSON:API queries & basic request example ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9220](https://github.com/emberjs/data/pull/9220) feat: request infra improvements ([@runspired](https://github.com/runspired))
* [#9159](https://github.com/emberjs/data/pull/9159) fix: support full range of json:api for references, update docs ([@runspired](https://github.com/runspired))
* [#9094](https://github.com/emberjs/data/pull/9094) feat: support legacy attribute behaviors in SchemaRecord ([@gitKrystan](https://github.com/gitKrystan))
* [#9095](https://github.com/emberjs/data/pull/9095) feat (internal): support legacy model behaviors in SchemaRecord legacy mode ([@runspired](https://github.com/runspired))
* [#9072](https://github.com/emberjs/data/pull/9072) feat: advanced JSON:API queries & basic request example ([@runspired](https://github.com/runspired))
* [#8949](https://github.com/emberjs/data/pull/8949) feat:prepare for universal reactivity ([@runspired](https://github.com/runspired))
* [#8935](https://github.com/emberjs/data/pull/8935) feat: (private) implement basic field support for schema-record ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9189](https://github.com/emberjs/data/pull/9189) fix: mutating ManyArray should handle duplicates gracefully (with deprecation) ([@gitKrystan](https://github.com/gitKrystan))
* [#9159](https://github.com/emberjs/data/pull/9159) fix: support full range of json:api for references, update docs ([@runspired](https://github.com/runspired))

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
* [#9021](https://github.com/emberjs/data/pull/9021) chore: cleanup ember-data/-private types ([@runspired](https://github.com/runspired))
* [#9019](https://github.com/emberjs/data/pull/9019) chore: make model types strict ([@runspired](https://github.com/runspired))
* [#9006](https://github.com/emberjs/data/pull/9006) chore (internal): convert builder and request tests to use diagnostic+runner ([@runspired](https://github.com/runspired))
* [#8931](https://github.com/emberjs/data/pull/8931) chore: package infra for schema-record ([@runspired](https://github.com/runspired))
* [#8930](https://github.com/emberjs/data/pull/8930) chore: get last request for any record on instantiation ([@runspired](https://github.com/runspired))

#### Committers: (2)

Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))
Chris Thoburn ([@runspired](https://github.com/runspired))

