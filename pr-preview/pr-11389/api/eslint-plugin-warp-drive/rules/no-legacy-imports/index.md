---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/eslint-plugin-warp-drive/rules/no-legacy-imports.md
description: >-
  Lint rule, with autofix, that rewrites imports written against an older
  EmberData or WarpDrive release to the modules that hold those exports in a
  newer one, and reports the imports it cannot rewrite.
---

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-legacy-imports` | 🏆 | ✅ |

> \[!NOTE]
> Rewrites imports written against an older EmberData or WarpDrive release to the modules that
> hold the same exports in a newer one, and reports the imports it cannot rewrite. The rule
> decides from data that ships with the plugin: what every public module exported in each
> covered release since 4.12, how each export moved from one release to the next, and a
> judged answer for the exports whose history alone does not say where they went. It never
> reads the network.

> \[!TIP]
> This rule is autofixable. A fix can split one import declaration into several when its names
> moved to different modules, and it adds names to an import of the target module that is
> already in the file. Review the fixes in the diff.

## Examples

With `{ from: '4.12', to: '5.9' }`, before:

```js
import Store from '@ember-data/store';
import Model, { attr, hasMany, Unknown } from '@ember-data/model';
import Adapter from '@ember-data/adapter/rest';
import { ManyArray } from '@ember-data/model/-private';
import DS from 'ember-data';
```

After:

```js
import { Store } from '@warp-drive/core';
import Model, { attr, hasMany } from '@warp-drive/legacy/model';
import { Unknown } from '@ember-data/model';
import { RESTAdapter as Adapter } from '@warp-drive/legacy/adapter/rest';
import { ManyArray } from '@ember-data/model/-private';
import DS from 'ember-data';
```

`Unknown` is reported because `@ember-data/model` did not export it in 4.12. `ManyArray` is
reported because 5.9 has only a type by that name. `DS` is reported because importing
`ember-data` also sets things up as a side effect, so the import cannot be moved.

## Options

```js
rules: {
  'warp-drive/no-legacy-imports': ['error', { from: '4.12', to: '5.9' }],
}
```

* `from` is the release your imports were written against. The default is `4.12`, the oldest
  release the data covers. Set it to the release your app was on before the upgrade: the same
  module path can mean different things in different releases.
* `to` is the release to rewrite the imports for. The default is the version of
  `@warp-drive/core` that resolves from the directory ESLint runs in, or the newest release in
  the data when none resolves or the data does not cover it. When that version is older than
  `from`, the default is `from`.

Both take a version (`'5.9.1'`), its minor (`'5.9'`), any patch or prerelease of a minor
(`'5.9.0'`, `'5.10.0-alpha.1'`) or `'head'`, the unreleased version this plugin was built with.
The data lists a release only when it moved or removed a public export, so a minor between two
listed releases means the older one: `'5.3'` means 5.0. A version older than 4.12 or newer than
the data is an error when the rule starts, and the error lists the versions the data covers.

## What the rule does with each import

The rule looks at every top-level `import ... from '...'` declaration, including `import type`
and side-effect imports like `import '...'`. Each imported name gets one of these outcomes.

* **Rewrite** (`warp-drive.no-legacy-imports`). The export has a home in `to`, in another module
  or under another name. The fix imports it from there.
* **Rewrite to a private module** (`warp-drive.no-legacy-imports.private-target`). The only home
  is a module whose path has a segment starting with `-`, such as
  `@warp-drive/core/store/-private`. The fix still imports from there, and the message says so,
  because a private module can change in any release.
* **Removed** (`warp-drive.no-legacy-imports.removed`). Nothing in `to` continues the export. The
  import is left as written. When the removal was judged, the message names the pull request
  that removed it and can show a short shim that restores it. The message links the upgrade guide,
  the API docs and the request service cheat sheet.
* **Untracked** (`warp-drive.no-legacy-imports.untracked`). The module existed in `from` but did
  not export this name, so the data has no record of where it went. Check the name, or set `from`
  to the release the code was written against. When the module is a shim in `to`, a single
  `export * from` another module, the name follows that module instead, as a rewrite.
* **Type-only target** (`warp-drive.no-legacy-imports.type-only-target`). A value import of
  something that was a value in `from` and is only a type in `to`, in another module or in the
  same one. The import would bring in a name with no runtime value, so it is left as written. Use
  `import type` if the name is only used as a type, and the rule then rewrites it when the type
  lives elsewhere. Otherwise it needs manual migration.
* **Side effect** (`warp-drive.no-legacy-imports.side-effect`). `ember-data` and
  `ember-data/store` set up things as a side effect of being imported, so no import of them is
  moved. The rule reports the declaration once and links the upgrade guide.
* **Keep**. The export did not move, or the module is not one the `from` release had. Third-party
  packages and modules that were new after `from` are never touched.

When an export has several homes in `to`, the rule picks one by these rules, in order:

0. a module that holds the export before a shim, a module whose entry is a single
   `export * from` another module;
1. a public module before a private one;
2. a `@warp-drive/*` (or other modern) package before `ember-data` and `@ember-data/*`;
3. fewer path segments below the package name;
4. not deprecated;
5. a value before a type;
6. the same export name;
7. a module of the `@warp-drive/ember` package before other modules;
8. module name, then export name, in alphabetical order.

When the module and the name you import are one of the homes, the import stays unless rules 0
to 5 rank another home before it. `import { getRequestState } from '@warp-drive/react'` stays
on React although rule 7 prefers `@warp-drive/ember`.

## What the fix writes

* It keeps your local binding names. When the export was renamed, or a default export became a
  named one, the fix imports the new name under your old local name, as
  `RESTAdapter as Adapter` shows above. A named export that became a default one is imported as
  the default.
* Names that move to different modules split the declaration, one declaration per module, in
  the order the names first appear. Names that stay keep a declaration from the original module.
* `import type` and inline `type` specifiers stay type-only. A declaration whose names are all
  types is written as `import type`.
* When the file already imports from the target module, the fix adds the names to that
  declaration instead of writing a second one. It does not add to a namespace import, a
  side-effect import, an import with attributes, or values to an `import type` declaration.
  When two declarations move names to the same new module, the second one is merged in on
  ESLint's next fix pass.
* Quotes and semicolons follow the declaration being fixed.

## Namespace and side-effect imports

`import * as ns from '...'` and `import '...'` depend on the whole module. They follow the
module's re-export target in `to` when the module only re-exports another one, or the move of
the whole module when every export moved to one other module under the same names. They stay as
written while the module exists in `to`, and are reported as removed when it does not.

## What the rule ignores

* Imports from `warp-drive`, `@ember-data/codemods` and `eslint-plugin-warp-drive`, the packages
  the data does not map. The fix never moves an import into them either.
* Re-exports, such as `export { attr } from '@ember-data/model'` and `export * from '...'`.
* Dynamic `import()` and CommonJS `require()`.
* Imports nested in a TypeScript `declare module` block.

When the plugin is installed without its data, for example from a checkout where the data was
not generated, the rule reports nothing.

## Variables

* [export=](variables/export=.md)

## Types

* [Entry](types/Entry.md)
* [Item](types/Item.md)
