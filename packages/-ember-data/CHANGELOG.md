# ember-data Changelog

## v5.3.4 (2024-06-15)

#### :evergreen_tree: New Deprecation

* [#9479](https://github.com/warp-drive-data/warp-drive/pull/9479) feat: support migration path for ember-inflector usage ([@runspired](https://github.com/runspired))

#### :memo: Documentation

* [#9328](https://github.com/warp-drive-data/warp-drive/pull/9328) chore: update READMEs with status and dist tag info ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9471](https://github.com/warp-drive-data/warp-drive/pull/9471) feat: npx warp-drive ([@runspired](https://github.com/runspired))
* [#9468](https://github.com/warp-drive-data/warp-drive/pull/9468) feat: string utils 🌌  ([@runspired](https://github.com/runspired))
* [#9407](https://github.com/warp-drive-data/warp-drive/pull/9407) feat: v2 addons ([@runspired](https://github.com/runspired))
* [#9448](https://github.com/warp-drive-data/warp-drive/pull/9448) feat: impl SchemaService RFC ([@runspired](https://github.com/runspired))
* [#9450](https://github.com/warp-drive-data/warp-drive/pull/9450) feat: improve typing around Model and createRecord ([@runspired](https://github.com/runspired))
* [#9366](https://github.com/warp-drive-data/warp-drive/pull/9366) feat: typed Model ([@runspired](https://github.com/runspired))
* [#9260](https://github.com/warp-drive-data/warp-drive/pull/9260) feat: ember specific data utils ([@runspired](https://github.com/runspired))
* [#9244](https://github.com/warp-drive-data/warp-drive/pull/9244) feat: improves consumer-facing store types ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9469](https://github.com/warp-drive-data/warp-drive/pull/9469) Fix exports for 'ember-data' ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* [#9318](https://github.com/warp-drive-data/warp-drive/pull/9318) fix: be more specific in files in case .npmignore is ignored ([@runspired](https://github.com/runspired))

#### :house: Internal

* [#9477](https://github.com/warp-drive-data/warp-drive/pull/9477) fix: add deprecation and avoid breaking configs ([@runspired](https://github.com/runspired))
* [#9292](https://github.com/warp-drive-data/warp-drive/pull/9292) feat: add new build-config package ([@runspired](https://github.com/runspired))
* [#9370](https://github.com/warp-drive-data/warp-drive/pull/9370) chore: rename macros ([@runspired](https://github.com/runspired))

#### Committers: (2)

Chris Thoburn ([@runspired](https://github.com/runspired))
[@NullVoxPopuli](https://github.com/NullVoxPopuli)

For the full project changelog see [https://github.com/warp-drive-data/warp-drive/blob/main/CHANGELOG.md](https://github.com/warp-drive-data/warp-drive/blob/main/CHANGELOG.md)

## v5.3.1 (2024-02-24)

#### :rocket: Enhancement

* [#9220](https://github.com/warp-drive-data/warp-drive/pull/9220) feat: request infra improvements ([@runspired](https://github.com/runspired))
* [#9069](https://github.com/warp-drive-data/warp-drive/pull/9069) feat: Improve extensibility ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#8892](https://github.com/warp-drive-data/warp-drive/pull/8892) doc: Fix paths in transform deprecations ([@HeroicEric](https://github.com/HeroicEric))

#### :house: Internal

* [#9062](https://github.com/warp-drive-data/warp-drive/pull/9062) Extract qunit ESLint config ([@gitKrystan](https://github.com/gitKrystan))
* [#9058](https://github.com/warp-drive-data/warp-drive/pull/9058) Switch from eslint-plugin-prettier to running prettier directly ([@gitKrystan](https://github.com/gitKrystan))
* [#9057](https://github.com/warp-drive-data/warp-drive/pull/9057) Add eslint-plugin-n to eslint config for node files ([@gitKrystan](https://github.com/gitKrystan))
* [#9051](https://github.com/warp-drive-data/warp-drive/pull/9051) chore: use references for tsc, add checks to schema-record, bun to run scripts ([@runspired](https://github.com/runspired))
* [#9032](https://github.com/warp-drive-data/warp-drive/pull/9032) chore(types): split out lint and type commands to be per-package ([@runspired](https://github.com/runspired))
* [#9050](https://github.com/warp-drive-data/warp-drive/pull/9050) chore: use composite mode for tsc ([@runspired](https://github.com/runspired))
* [#9049](https://github.com/warp-drive-data/warp-drive/pull/9049) chore: incremental tsc builds ([@runspired](https://github.com/runspired))
* [#9046](https://github.com/warp-drive-data/warp-drive/pull/9046) chore: reduce number of things turbo builds for build ([@runspired](https://github.com/runspired))
* [#9029](https://github.com/warp-drive-data/warp-drive/pull/9029) chore: add @warp-drive/core as home for shared code ([@runspired](https://github.com/runspired))
* [#9028](https://github.com/warp-drive-data/warp-drive/pull/9028) chore: more isolated types ([@runspired](https://github.com/runspired))
* [#9025](https://github.com/warp-drive-data/warp-drive/pull/9025) chore: reconfigure request package type location ([@runspired](https://github.com/runspired))
* [#9021](https://github.com/warp-drive-data/warp-drive/pull/9021) chore: cleanup ember-data/-private types ([@runspired](https://github.com/runspired))
* [#9017](https://github.com/warp-drive-data/warp-drive/pull/9017) chore: make json-api cache strict ([@runspired](https://github.com/runspired))
* [#8931](https://github.com/warp-drive-data/warp-drive/pull/8931) chore: package infra for schema-record ([@runspired](https://github.com/runspired))

#### Committers: (3)

Chris Thoburn ([@runspired](https://github.com/runspired))
Eric Kelly ([@HeroicEric](https://github.com/HeroicEric))
Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))

