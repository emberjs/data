# @ember-data/request Changelog

## v5.3.4 (2024-06-15)

#### :memo: Documentation

* [#9328](https://github.com/emberjs/data/pull/9328) chore: update READMEs with status and dist tag info ([@runspired](https://github.com/runspired))
* [#9298](https://github.com/emberjs/data/pull/9298) docs(request): remove duplicate line in readme ([@Yelinz](https://github.com/Yelinz))
* [#9275](https://github.com/emberjs/data/pull/9275) doc: don't mention unexisting ESA auth handler ([@sly7-7](https://github.com/sly7-7))

#### :rocket: Enhancement

* [#9471](https://github.com/emberjs/data/pull/9471) feat: npx warp-drive ([@runspired](https://github.com/runspired))
* [#9407](https://github.com/emberjs/data/pull/9407) feat: v2 addons ([@runspired](https://github.com/runspired))
* [#9443](https://github.com/emberjs/data/pull/9443) feat: universal consts ([@runspired](https://github.com/runspired))
* [#9366](https://github.com/emberjs/data/pull/9366) feat: typed Model ([@runspired](https://github.com/runspired))
* [#9260](https://github.com/emberjs/data/pull/9260) feat: ember specific data utils ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9459](https://github.com/emberjs/data/pull/9459) fix: ensure cachehandler responses are cast to documents ([@runspired](https://github.com/runspired))
* [#9383](https://github.com/emberjs/data/pull/9383) fix: ensure cache-handler clones full errors ([@runspired](https://github.com/runspired))
* [#9360](https://github.com/emberjs/data/pull/9360) fix: Make IS_MAYBE_MIRAGE work in Firefox ([@MichalBryxi](https://github.com/MichalBryxi))
* [#9307](https://github.com/emberjs/data/pull/9307) fix: mirage does not support anything ([@runspired](https://github.com/runspired))
* [#9265](https://github.com/emberjs/data/pull/9265) feat: Improve config handling for polyfillUUID ([@MehulKChaudhari](https://github.com/MehulKChaudhari))
* [#9254](https://github.com/emberjs/data/pull/9254) Update IS_MAYBE_MIRAGE function to check for Mirage in development mode ([@Baltazore](https://github.com/Baltazore))

#### :house: Internal

* [#9292](https://github.com/emberjs/data/pull/9292) feat: add new build-config package ([@runspired](https://github.com/runspired))
* [#9385](https://github.com/emberjs/data/pull/9385) fix: Make IS_MAYBE_MIRAGE simplified ([@MichalBryxi](https://github.com/MichalBryxi))
* [#9370](https://github.com/emberjs/data/pull/9370) chore: rename macros ([@runspired](https://github.com/runspired))

#### Committers: (6)

Chris Thoburn ([@runspired](https://github.com/runspired))
Yelin Zhang ([@Yelinz](https://github.com/Yelinz))
Sylvain Mina ([@sly7-7](https://github.com/sly7-7))
Michal Bryxí ([@MichalBryxi](https://github.com/MichalBryxi))
Mehul Kiran Chaudhari ([@MehulKChaudhari](https://github.com/MehulKChaudhari))
Kirill Shaplyko ([@Baltazore](https://github.com/Baltazore))

For the full project changelog see [https://github.com/emberjs/data/blob/main/CHANGELOG.md](https://github.com/emberjs/data/blob/main/CHANGELOG.md)

## v5.3.1 (2024-02-24)

#### :memo: Documentation

* [#9072](https://github.com/emberjs/data/pull/9072) feat: advanced JSON:API queries & basic request example ([@runspired](https://github.com/runspired))
* [#9068](https://github.com/emberjs/data/pull/9068) docs: unroll details sections ([@runspired](https://github.com/runspired))

#### :rocket: Enhancement

* [#9220](https://github.com/emberjs/data/pull/9220) feat: request infra improvements ([@runspired](https://github.com/runspired))
* [#9072](https://github.com/emberjs/data/pull/9072) feat: advanced JSON:API queries & basic request example ([@runspired](https://github.com/runspired))
* [#8935](https://github.com/emberjs/data/pull/8935) feat: (private) implement basic field support for schema-record ([@runspired](https://github.com/runspired))
* [#8921](https://github.com/emberjs/data/pull/8921) feat: Improved Fetch Errors ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

* [#9203](https://github.com/emberjs/data/pull/9203) fix: Fetch handler hacks for Mirage (canary) ([@gitKrystan](https://github.com/gitKrystan))

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
* [#8931](https://github.com/emberjs/data/pull/8931) chore: package infra for schema-record ([@runspired](https://github.com/runspired))
* [#8906](https://github.com/emberjs/data/pull/8906) feat: expand mock-server capabilities, add to main tests ([@runspired](https://github.com/runspired))

#### Committers: (2)

Chris Thoburn ([@runspired](https://github.com/runspired))
Krystan HuffMenne ([@gitKrystan](https://github.com/gitKrystan))

