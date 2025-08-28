---
title: Writing Documentation
order: 5
---

# Writing Documentation

There are two sources of documentation in this repository:

- [Guides](../guides/) - markdown files that are compiled into the manual for the website
- inline code comments and types - from which the API Docs are compiled

Both are previewable by following the instructions in the [Docs Viewer](../docs-viewer/README.md)

Great documentation requires both guides and docs. We encourage updating any associated guides affected by code changes as you make them, and writing new guides when appropriate.


## API Documentation Infra Overview

API Documentation is generated from [TSDoc](https://tsdoc.org/) comments in the source code
compiled with [TypeDoc](https://typedoc.org/) and transformed for [Vitepress](https://vitepress.dev/) using [typedoc-plugin-markdown](https://www.typedoc-plugin-markdown.org/plugins/vitepress)

TSDoc syntax is similar to YUIDoc and JSDoc but there are occassional nuances where it becomes best to know the underlying grammar is TSDoc
and parser is TypeDoc.

TypeDoc is configured to follow our public package entrypoints to
auto-discover documentation. It documents everything reachable, public or private including properties and methods that have no associated
code docs. It uses typescript to understand the source-code and builds documentation from the combination of Type signatures and TSDoc comments.

This is great, but it means that its very easy to leak private APIs
into the docs, use `/** @internal */` on things that should not be
put into the public docs.

While API Documentation lives with the source-code, the code itself plays no-part in the documentation
that is generated: everything is compiled from comments alone.

The below guide will walk through best practices for writing doc comments, important
nuances and syntaxes to know, as well as how to test and preview the doc comments.

<br>

---

<br>

## Documentation Syntax

<br>

### What are Doc Comments

Only `**` comments are compiled as potential documentation, e.g.

```ts
/**
 * This is a potential documentation block
 */
```

Where as single star comment blocks are not considered documentation

```ts
/*
 * This is not a potential documentation block
 */
```

### Where to put Doc Comments

Documentation comments should be placed directly above the symbol they are documenting.

```ts
/**
 * Documents the class
 */
class Foo {
  /**
   * Documents the method
   */
  bar() {}

  /**
   * Documents the property
   */
  bar = '1';
}

/**
 * Documents the interface
 */
interface Foo {
  /**
   * Documents the member
   */
  bar: string;
}

/**
 * Documents the type
 */
type Foo = {
  /**
   * Documents the member
   */
  bar: string;
}

/**
 * Documents the variable
 */
const Foo = '1';

/**
 * Documents the function
 */
function foo() {}
```

<br>

### Ignored Doc Comments

When compiling the API documentation, comments using the `@internal` tag will be ignored:

For example, the below doc comment would be ignored. This is useful for documenting code
for fellow developers that shouldn't be exposed to end consumers.

```ts
/**
 * This is a private utility for updating the state
 * of a relationship.
 * 
 * @internal
 */
function somethingInside() {}
```

<br>

### Auto Association

TSDoc and TypeDoc will automatically place the documentation for a method inside
the class it is on, the class inside the package it is in and at the export path
it is exported from. Because it knows our entrypoints and our types, we don't need
to tell it much! It already knows when something is an interface vs a class, when
it extends something else, or that it implements a specific signature.

This means you no longer need to add redundant tags like `@module` `@class` `@method`
`@static` and `@property`.

### Doc Comments can be Markdown

Doc comments can contain most any valid markdown syntax, most markdown-valid html,
and can utilize code-highlighting via language prefix on a code block comment.

For instance

```ts
/**
 * ## Overview
 * 
 * Some details
 * 
 * ### An Example
 * 
 * ```ts
 * new Store();
 * ```
 * 
 * @public
 */
```

Additionally, the markdown parser in use by our docs understands documentation groups,
and [many other features](https://vitepress.dev/guide/markdown).

This means we can do code examples that toggle between files or formats.

```ts
/**
 * ::: code-group
 * 
 * ```ts [example.ts]
 * export function numberFromStrong(str: string): number {}
 * ```
 * 
 * ```js [example.js]
 * export function numberFromStrong(str) {}
 * ```
 * 
 * :::
 */
```

Highlighting, focus management and code groups are three features that combine
to enable crafting powerful examples in the documentation.

<br>

### Doc Comments should start every line with a `*`

While technically doc comments only need to start with `/**`, providing a `*` for
every line with matching indentation ensures correct parsing of all tags and documentation.

Without this, some decorators in code examples may be incorrectly parsed as documentation tags,
and some documentation may be unexpectedly truncated.

**Good**

```ts
/**
 * ## Overview
 * 
 * Some details
 * 
 * ### An Example
 * 
 * ```ts
 * class User extends Model {
 *   @attr name;
 * }
 * ```
 * 
 * @public
 */
```

**Bad**

```ts
/**
 ## Overview
 
 Some details
 
 ### An Example
 
 \```ts
 class User extends Model {
   @attr name;
 }
 \```
 
 @public
*/
```

### Documenting Packages and Subpackages

To create an overview for a module path e.g. `@warp-drive/core-types` or `@warp-drive/core-types/symbol` all that is needed is a doc comment at the top of the file with the tag `@module.

For instance, to write documentation giving an overview of `@warp-drive/core-types`
we would do the following in `packages/core-types/src/index.ts`

```ts
/**
 * This package provides essential types and symbols used
 * by all the other WarpDrive/EmberData packages.
 * 
 * @module
 */
```

<br>

### Always specify `@since` on non-type public APIs


```ts
/**
 * @since 1.13.0
 * @public
*/
```

### Use `@hideconstructor` for classes that aren't directly instantiated by users

[@hideconstructor](https://typedoc.org/documents/Tags._hideconstructor.html#hideconstructor)

```ts
/**
 * @hideconstructor
 */
class ReactiveResource {}
```

Methods are documented with `@method` and attatch to the most recent class the parser has
seen.

### Don't document types in @param and @return

Because types are parsed from the typescript, @param and @return should
be used to give a meaningful description only.

```ts
/**
 * Adds two numbers
 * 
 * @param a - the first number to add
 * @param b - the second number to add
 * @return the sum of the two numbers
 */
function add(a: number, b: number): number {}
```

<br>

---

<br>

## Documentation Hygeine

<br>

### Documentation Tests

> [!Caution]
> Ignore this section. Doc tests are deactivated while we
> migrate to tsdoc and typedoc.

Run `pnpm test:docs`

This will lint discovered doc comments for common sources of error, as well as validate that no published documentation
has been added or removed unexpectedly.

If documentation has been added, an entry for it should be added to `tests/docs/fixtures/expected.js`.
If documentation has been removed, similarly any entry for it should be removed from `tests/docs/fixtures/expected.js`.

If documentation you've added is not being discovered by the test, it is likely that either

- it may have been excluded due to using an [ignored doc comment](#ignored-doc-comments)
- it may have been excluded due to not using the right [comment syntax](#what-are-doc-comments)
- it may have been included in the list of paths to search for source code documentation in [yuidoc.json](../docs-generator/yuidoc.json)

<br>

### Previewing Documentation

#### For `docs.warp-drive.io`

From inside the `docs-viewer` directory

- start sync for guides with `bun ./src/start-guides-sync.ts`
- build/rebuild the API docs with `pnpm typedoc` (rerun as needed)
- start the server with `pnpm dev`, visit the site url

#### For `api.emberjs.com`

> [!Caution]
> Ignore this section. Ember api docs are incompatible while we
> migrate to tsdoc and typedoc. Once the migration is nearing
> completion we will create a transform to restore these docs.

Run `bun preview-api-docs` from the project root or the `docs-viewer` directory. 

This will build and run the (external) api-docs app with the current state of the api docs in the repo.

Changes need to be manually rebuilt with `bun rebuild-api-docs`.

See the [Docs Viewer README](../docs-viewer/README.md) for more info.
