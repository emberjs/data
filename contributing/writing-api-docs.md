# Writing API Docs

API Documentation is generated from [yuidoc](https://yui.github.io/yuidoc/) comments in the source code.

YUIDoc syntax is very similar to [JSDoc](https://jsdoc.app/) but there are occassional nuances where
it becomes best to know the underlying parser is YUIDoc.

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

<br>

### Ignored Doc Comments

When compiling the API documentation, several categories of comments will be ignored:

- `@internal` - signifies internal documentation for contributors for a non-public API
- `@feature` - signifies documentation for an unreleased feature gated by a canary flag
- `@typedoc` - signifies typescript-only (in-editor) documentation that should not be compiled into the API docs

Additionally, use of the following tags will cause a doc comment to be ignored due to intended use primarily being docs
written for in-editor experience similar to `@typedoc`

- `@see`
- `@link`
- `@inheritdoc`

For example, the below doc comment would be ignored

```ts
/**
 * This is a private utility for updating the state
 * of a relationship.
 * 
 * @internal
 */
```

<br>

### Always Start with `@module`

The YUIDocs parser will attribute all documentation it discovers to the most recent
`module` (package) declaration it has seen. For this reason, any file that has documentation
comments should declare the package it applies to at the top of the file.

For instance, if we were writing documentation for a feature within the `@ember-data/store`
package, we would declare the following at the top of the file:

```ts
/**
 * @module @ember-data/store
 */
```

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
 * @class Store
 * @public
 */
```

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
 * @class Store
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
 
 @class Store
 @public
*/
```

### Documenting Modules

Yuidoc syntax refers to packages as "modules". To declare that some code
is part of a module, we use `@module <name>`, so the package `@warp-drive/core-types`
is `@module @warp-drive/core-types`.

Modules are documented using a special `@main` tag.

For instance, to write documentation giving an overview of `@warp-drive/core-types`
we would do the following.

```ts
/**
 * This package provides essential types and symbols used
 * by all the other WarpDrive/EmberData packages.
 * 
 * @module @warp-drive/core-types
 * @main @warp-drive/core-types
 */
```

Sometimes we may want to reuse the documentation for a primary default export
class as the module documentation as well. In this case `@module` will be
declared standalone while `@main` will be affixed to the exported class doc comment.

```ts
/**
 * @module @ember-data/serializer/json-api
 */
/**
 * << module (and class) overview goes here >>
 * 
 * @class JSONAPISerializer
 * @main @ember-data/serializer/json-api
 * @public
 */
```

<br>

### Documenting Classes

Classes are documented using `@class`.

```ts
/**
 * @since 1.13.0
 * @class JSONAPIAdapter
 * @main @ember-data/adapter/json-api
 * @public
 * @constructor
 * @extends RESTAdapter
*/
```

Methods are documented with `@method` and attatch to the most recent class the parser has
seen.

```ts
/**
 * Some documentation
 * 
 * @method myMethod
 * @public
 * @param {AType} myParam explanation of the param
 * @return {AnotherType} explanation of the return value
 */
```

Properties are documented with `@property` and attach to the most recent class the parser has seen.

```ts
/**
 * An explanation of the property
 *
 * @property {SomeType} propertyName
 * @public
 */
```

Static methods and properties can be documented by adding `@static` to the definition.

<br>

### Documenting Functions

Functions are documented as "static" methods on modules. For instance the method `recordIdentifierFor`
imported from `@ember-data/store` would be done like the below

```ts
/**
 * Description of the function
 *
 * @public
 * @static
 * @for @ember-data/store
 * @param {Object} record a record instance previously obstained from the store.
 * @return {StableRecordIdentifier}
 */
```


<br>

### Documenting Interfaces and Types

Yuidoc and the ember API docs do not have a mechanism for documenting types. However, because
documentation is entirely doc-comment driven, we can document interfaces and types as classes,
and mark them as such by giving them impossible names. Generally we follow the convention of
`<Interface> AnInterface` and `<Type> AType` for this.

For example, the interface for creating a request handler is documented as a class below
whose name is `<Interface> Handler`.

```ts
/**
 * << Handler Documentation >>
 * 
 * @class <Interface> Handler
 * @public
 */
```

<br>

---

<br>

## Documentation Hygeine

<br>

### Documentation Tests

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

Run `bun preview-api-docs` from the project root or the `docs-viewer` directory. 

This will build and run the (external) api-docs app with the current state of the api docs in the repo.

Changes need to be manually rebuilt with `bun rebuild-api-docs`.

See the [Docs Viewer README](../docs-viewer/README.md) for more info.
