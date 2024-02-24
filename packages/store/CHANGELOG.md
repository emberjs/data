# @ember-data/store Changelog

For the full project changelog see [https://github.com/emberjs/data/blob/main/CHANGELOG.md](https://github.com/emberjs/data/blob/main/CHANGELOG.md)

## v5.3.1 (2024-02-24)

#### :evergreen_tree: New Deprecation

* [#9189](https://github.com/emberjs/data/pull/9189) fix: mutating ManyArray should handle duplicates gracefully (with deprecation) ([@gitKrystan](https://github.com/gitKrystan))

#### :memo: Documentation

* [#9162](https://github.com/emberjs/data/pull/9162) feat: improve store.request documentation ([@runspired](https://github.com/runspired))
* [#9159](https://github.com/emberjs/data/pull/9159) fix: support full range of json:api for references, update docs ([@runspired](https://github.com/runspired))
* [#9072](https://github.com/emberjs/data/pull/9072) feat: advanced JSON:API queries & basic request example ([@runspired](https://github.com/runspired))
* [#9070](https://github.com/emberjs/data/pull/9070) docs: fix note notation to make use of github formatting ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9220](https://github.com/emberjs/data/pull/9220) feat: request infra improvements ([@runspired](https://github.com/runspired))
* [#9163](https://github.com/emberjs/data/pull/9163) feat: improved lifetimes-service capabilities ([@runspired](https://github.com/runspired))
* [#9159](https://github.com/emberjs/data/pull/9159) fix: support full range of json:api for references, update docs ([@runspired](https://github.com/runspired))
* [#9094](https://github.com/emberjs/data/pull/9094) feat: support legacy attribute behaviors in SchemaRecord ([@gitKrystan](https://github.com/gitKrystan))
* [#9095](https://github.com/emberjs/data/pull/9095) feat (internal): support legacy model behaviors in SchemaRecord legacy mode ([@runspired](https://github.com/runspired))
* [#9072](https://github.com/emberjs/data/pull/9072) feat: advanced JSON:API queries & basic request example ([@runspired](https://github.com/runspired))
* [#8949](https://github.com/emberjs/data/pull/8949) feat:prepare for universal reactivity ([@runspired](https://github.com/runspired))
* [#8946](https://github.com/emberjs/data/pull/8946) feat (private): implement resource relationships for SchemaRecord ([@runspired](https://github.com/runspired))
* [#8935](https://github.com/emberjs/data/pull/8935) feat: (private) implement basic field support for schema-record ([@runspired](https://github.com/runspired))
* [#8921](https://github.com/emberjs/data/pull/8921) feat: Improved Fetch Errors ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9189](https://github.com/emberjs/data/pull/9189) fix: mutating ManyArray should handle duplicates gracefully (with deprecation) ([@gitKrystan](https://github.com/gitKrystan))
* [#9183](https://github.com/emberjs/data/pull/9183) fix: keep a backreference for previously merged identifiers ([@runspired](https://github.com/runspired))
* [#8927](https://github.com/emberjs/data/pull/8927) fix: live-array delete sync should not clear the set on length match ([@runspired](https://github.com/runspired))
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
* [#9027](https://github.com/emberjs/data/pull/9027) chore: improve types for store package ([@runspired](https://github.com/runspired))
* [#9029](https://github.com/emberjs/data/pull/9029) chore: add @warp-drive/core as home for shared code ([@runspired](https://github.com/runspired))
* [#9028](https://github.com/emberjs/data/pull/9028) chore: more isolated types ([@runspired](https://github.com/runspired))
* [#9025](https://github.com/emberjs/data/pull/9025) chore: reconfigure request package type location ([@runspired](https://github.com/runspired))
* [#9021](https://github.com/emberjs/data/pull/9021) chore: cleanup ember-data/-private types ([@runspired](https://github.com/runspired))
* [#9019](https://github.com/emberjs/data/pull/9019) chore: make model types strict ([@runspired](https://github.com/runspired))
* [#9016](https://github.com/emberjs/data/pull/9016) chore: make type-only files strict ([@runspired](https://github.com/runspired))
* [#8931](https://github.com/emberjs/data/pull/8931) chore: package infra for schema-record ([@runspired](https://github.com/runspired))
* [#8906](https://github.com/emberjs/data/pull/8906) feat: expand mock-server capabilities, add to main tests ([@runspired](https://github.com/runspired))

#### Committers: (2)

Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))
Chris Thoburn ([@runspired](https://github.com/runspired))

