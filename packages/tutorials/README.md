# @warp-drive/tutorials

The apps behind the [WarpDrive tutorials](https://warp-drive.io/guides/tutorials/).
Each tutorial has a directory per framework, holding a `solution/` app and the
`starter/` app learners begin from.

| Tutorial        | Framework | Guide                                                            |
| --------------- | --------- | ---------------------------------------------------------------- |
| `todomvc-ember` | Ember     | [TodoMVC](https://warp-drive.io/guides/tutorials/todomvc/) |

This package is private for now. It will be published so learners can create an
app with `npx @warp-drive/tutorials`.

## Updating a tutorial

**Edit `solution/` only.** `starter/` is generated from it, so changes made directly
in `starter/` are overwritten and fail CI.

```sh
node packages/tutorials/scripts/make-starter.mjs
```

Run this from the repo root after any change to `solution/`, and commit the
regenerated `starter/` with your change.

### How the starter is made

The generator copies `solution/` to `starter/`. The solution marks what the learner
writes, next to the code itself:

```ts
// #replace-in-starter TODO (chapter 4): send the create request
await this.store.request(createTodo(attributes));
// #end-replace-in-starter
```

| Marker | In the starter |
| --- | --- |
| `// #replace-in-starter <text>` … `// #end-replace-in-starter` | The block is replaced by `// <text>` |
| `// #remove-from-starter` … `// #end-remove-from-starter` | The block is removed, for example an import the learner adds |
| The same markers as `{{! … }}` | The same, inside a `<template>` |
| `// #omit-file-from-starter` as a file's first line | The file is left out, because the learner writes it |

Blocks can't nest. The generator reads every text file in `solution/`, and copies binary files unchanged.
`#omit-file-from-starter` only parses as a `//` comment, so a file without `//` comments,
such as CSS, HTML or YAML, can't be omitted.

The guides write their code inline, so they don't update when `solution/` does.

### Common changes

| Change | What to do |
| --- | --- |
| Fix a bug, or update for a WarpDrive API change | Edit `solution/`, then regenerate |
| Change what a learner sees at a `TODO` | Edit the `#replace-in-starter` line, then regenerate |
| Move taught code to another chapter | Change the chapter number in its `#replace-in-starter` line, then regenerate |
| Add a dependency | Add it to `solution/package.json` and regenerate, which also updates this package's `devDependencies`. Then run `pnpm install` and commit `pnpm-lock.yaml`. |

If you changed code in a block the starter replaces, update that chapter of the guide to match.

### Deliberate difference

The routes' `model()` return `todos?:`, and `TodoProvider` takes `todoFuture?:`, so the
starter type-checks before the learner writes chapter 1's request. `<Request>`'s types accept
an undefined request, but at runtime it throws when there's no request and no `<:idle>`
block. The finished app always passes a request, but once
the learner writes chapter 1's `<Request>`, `/active` and `/completed` throw until they
write chapter 3's requests.

### What CI checks

| Failure | Meaning |
| --- | --- |
| `starter is out of date` | `starter/` doesn't match the generator's output. Regenerate, or move a direct edit into `solution/`. |
| `packages/tutorials/package.json devDependencies are out of date` | An app's dependencies changed without regenerating. Regenerate. |
| `blocks can't nest`, `never closed`, `without a block to close`, `can't close` | A block's start and end markers don't pair up. Each start needs its matching end. |
| `malformed tutorial starter directive` | A directive is misspelled or outdated, `#replace-in-starter` has no text, or another directive has text. |
| `#omit-file-from-starter must be the file's first line` | Move the directive to line 1. |
| `lint:oxfmt` or `lint:prettier` fails on `starter/` | The generator produced code the formatters reject. Change `solution/` so the generated code is formatted, such as by moving a block, rather than editing `starter/`. |
| Solution or starter tests fail | The app is broken. Both apps are type-checked and tested. |
