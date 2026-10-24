---
url: >-
  /pr-preview/pr-11154/guides/contributing/writing-documentation/writing-api-docs.md
---

# Writing Documentation

There are two sources of documentation in this repository:

* [Guides](../../index.md) - markdown files that are compiled into the manual for the website
* inline code comments and types - from which the API Docs are compiled

Both are previewable by following the instructions in the [Docs Viewer](https://github.com/warp-drive-data/warp-drive/blob/main/docs-viewer/README.md)

Great documentation requires both guides and docs. We encourage updating any associated guides affected by code changes as you make them, and writing new guides when appropriate.

## API Documentation Infra Overview

API Documentation is generated from [TSDoc](https://tsdoc.org/) comments in the source code
compiled with [TypeDoc](https://typedoc.org/) and transformed for [Vitepress](https://vitepress.dev/) using [typedoc-plugin-markdown](https://www.typedoc-plugin-markdown.org/plugins/vitepress)

TSDoc syntax is similar to YUIDoc and JSDoc but there are occasional nuances where it becomes best to know the underlying grammar is TSDoc
and parser is TypeDoc.

TypeDoc is configured to follow our public package entrypoints to
auto-discover documentation. It documents everything reachable, public or private including properties and methods that have no associated
code docs. It uses typescript to understand the source-code and builds documentation from the combination of Type signatures and TSDoc comments.

This is great, but it means that its very easy to leak private APIs
into the docs. Use `/** @internal */` on things that should not be
put into the public docs.

While API Documentation lives with the source-code, the code itself plays no part in the documentation
that is generated: everything is compiled from comments alone.

The below guide will walk through best practices for writing doc comments, important
nuances and syntaxes to know, as well as how to test and preview the doc comments.

***

## Documentation Syntax

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
   * Documents the key
   */
  bar: string;
}

/**
 * Documents the type
 */
type Foo = {
  /**
   * Documents the key
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

````ts
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
````

Additionally, the markdown parser in use by our docs understands documentation groups,
and [many other features](https://vitepress.dev/guide/markdown).

This means we can do code examples that toggle between files or formats.

````ts
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
````

Highlighting, focus management and code groups are three features that combine
to enable crafting powerful examples in the documentation.

### Doc Comments should start every line with a `*`

While technically doc comments only need to start with `/**`, providing a `*` for
every line with matching indentation ensures correct parsing of all tags and documentation.

Without this, some decorators in code examples may be incorrectly parsed as documentation tags,
and some documentation may be unexpectedly truncated.

**Good**

````ts
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
````

**Bad**

````ts
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
````

### Documenting Packages and Subpackages

To create an overview for a module path e.g. `@warp-drive/core-types` or `@warp-drive/core-types/symbol` all that is needed is a doc comment at the top of the file with the tag `@module`.

For instance, to write documentation giving an overview of `@warp-drive/core-types`,
we would do the following in `packages/core-types/src/index.ts`

```ts
/**
 * This package provides essential types and symbols used
 * by all the other WarpDrive packages.
 * 
 * @module
 */
```

### Always specify `@since` on non-type public APIs

`@since` renders as a small badge rather than a body section, so it's
always visible next to the name of the thing it describes without
taking up page space.

On a function, class, interface, variable, or type alias, it shows up
right next to that page's own name:

```ts
/**
 * @since 1.13.0
 * @public
*/
```

On a package's `@module` doc comment, it shows up next to that
package's `<ModuleBadge>` on the module's index page instead:

```ts
/**
 * This package provides essential types and symbols used
 * by all the other WarpDrive packages.
 *
 * @module
 * @since 5.9.0
 */
```

> \[!NOTE]
> Module-level `@since` is currently only picked up from a package's
> own root entry file (e.g. `packages/core-types/src/index.ts`), not
> from a subpackage's own `@module` comment (e.g.
> `core-types/src/cache.ts`). Put `@since` on a subpackage's exported
> members instead until this is extended.

On a class's own member (a method, property, etc.), `@since` shows up
on its own line directly below the member's heading instead of next
to it — a nested heading is much narrower than a page's own title, so
crowding it with an inline badge reads worse much sooner.

### Overriding the displayed kind and name with `@badge` and `@title`

Every function, class, interface, variable, type alias, and enumeration
gets its own page whose heading shows its TypeScript kind (`Function`,
`Class`, `Interface`, `Variable`, `Type Alias`, `Enumeration`) as a
badge next to its name. That default is accurate but not always the
most useful label for a reader — a class can be a component, a plain
object can be a request handler, a function can be a request builder.

Use `@badge <Label>` to override the kind badge with a more meaningful
conceptual label:

```ts
/**
 * The `<Await />` component allow you to utilize reactive control flow
 * for asynchronous states in your application.
 *
 * @badge Component
 */
export class Await<T, E> extends Component<AwaitSignature<T, E>> {}
```

```ts
/**
 * A basic Fetch Handler which converts a request into a
 * `fetch` call presuming the response to be `json`.
 *
 * @badge Handler
 */
const Fetch = { ... };
```

Use `@title <Text>` to override the name shown in the page heading
itself, when the raw name (or its generic signature) isn't the most
legible way to present it — for instance showing a component by its
usage syntax instead of its class signature:

```ts
/**
 * @badge Component
 * @title <Await />
 */
export class Await<T, E> extends Component<AwaitSignature<T, E>> {}
```

renders as **`<Await />`** instead of **`Await<T, E>`**. Write the
title exactly as it should be read — no escaping needed, even for
angle brackets.

Both tags only affect the page's own top-level symbol; they have no
effect when used on a nested class member, since only the page's own
heading shows these badges.

### Organizing a page with `@group` and `@category`

TypeDoc supports two independent, standard (not repo-specific) tags
for organizing the children listed on a class's or module's own page.
They look similar but behave very differently — pick whichever fits
what you're organizing.

**`@group <Name>` re-buckets what "kind" a symbol counts as.** Every
symbol already has a default group — the plural of its TypeScript kind
(`Functions`, `Classes`, `Properties`, etc.) — so tagging a symbol with
`@group <Name>` just moves it into a different, named bucket instead.
Nothing else on the page is affected: every other symbol keeps
whatever group it already had, explicit or default.

```ts
class RequestManager {
  /**
   * @group Handlers
   */
  use(handlers: Handler[]): void {}
}
```

**`@category <Name>` arranges children by topic instead of by kind** —
useful when several different kinds of things (a property, a function,
a class) together make up one logical feature and should be presented
as a unit regardless of their TypeScript kind. The tradeoff:
`@category` is all-or-nothing per page. The moment *any* symbol on a
page has a `@category`, every symbol without one falls into a generic
`"Other"` bucket instead — there's no partial opt-in.

Given that tradeoff, **default to `@group`**, and reach for `@category`
only when the grouping you want genuinely cuts across kinds, and
you're prepared to categorize everything relevant on that page rather
than just a few symbols. Never mix the two for symbols that need to
render together in the same page — see [`@decorator` and
`@classDecorator`](#marking-decorators-with-decorator-and-classdecorator)
below for a concrete example of this exact tradeoff.

Tag each member with the category it belongs to:

```ts
class JSONAPICache {
  /**
   * @category Cache Management
   */
  mutate(mutation: Mutation): void {}

  /**
   * @category Cache Forking
   */
  fork(): Promise<JSONAPICache> {}
}
```

which renders as `## Cache Management` and `## Cache Forking` sections
on `JSONAPICache`'s page, each listing the members tagged into it.
Optionally add `@categoryDescription <Name>` to the containing class,
interface, or module's own doc comment to show a short blurb under
that section's heading:

```ts
/**
 * @categoryDescription Cache Management
 * APIs for primary cache management functionality
 */
class JSONAPICache {}
```

Keep category names short, human-scannable topic phrases consistent
with existing ones in the same package (e.g. `Resource Data`,
`Resource Lifecycle`, `Cache Management`) rather than inventing a new
one-off name per symbol.

### Marking decorators with `@decorator` and `@classDecorator`

`@decorator` and `@classDecorator` are repo-specific modifier tags
(implemented by `docs-viewer/typedoc-plugins/decorator-groups.mjs`) for
functions used as a property/field decorator or a class decorator,
respectively:

```ts
/**
 * @since 5.9.0
 * @public
 * @decorator
 */
export function attribute(target: object, key: string): void;
```

```ts
/**
 * @since 5.9.0
 * @public
 * @classDecorator
 */
export function Resource(target: AnyConstructor): void;
```

Each tag fills in two defaults, as long as the symbol doesn't already
set its own:

* `@group` — `"Field Decorators"` for `@decorator`, `"Class
  Decorators"` for `@classDecorator` — so decorators get their own
  section on the module's index page instead of a flat list mixed in
  with everything else. This is `@group` rather than `@category` on
  purpose (see [above](#organizing-a-page-with-group-and-category)):
  decorators live in modules (like `schema-dsl`) that don't otherwise
  use `@category`, so `@group` avoids ever tripping the "one
  `@category` recategorizes the whole page" rule. If a decorator's
  module later needs `@category` for something else, either give the
  decorators an explicit `@category` too, or keep `@category` out of
  that module entirely — don't let the two mix silently.
* `@badge` — `"Decorator"` / `"Class Decorator"` — shown as the kind
  badge on the symbol's own page instead of the default `"Function"`.

A symbol can still set its own `@group` to opt out of the default
bucket, same as any other `@group` usage — this is how `schema-dsl`'s
entity-level decorators (`Resource`, `Trait`, `ObjectSchema`, `trait`)
end up grouped under their own `Entity Decorators` section instead of
`Class Decorators`:

```ts
/**
 * @since 5.9.0
 * @public
 * @classDecorator
 * @group Entity Decorators
 */
export function Resource(target: AnyConstructor): void;
```

### Use `@hideconstructor` for classes that aren't directly instantiated by users

[@hideconstructor](https://typedoc.org/documents/Tags._hideconstructor.html#hideconstructor)

```ts
/**
 * @hideconstructor
 */
class ReactiveResource {}
```

Methods are documented with `@method` and attach to the most recent class the parser has
seen.

### Don't document types in @param and @return

Because types are parsed from the typescript, `@param` and `@return` should
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

***

## Content Standards

### Every Public API Should Have a Usage Example

Even a minimal example dramatically shortens the time it takes for a
consumer to understand how to use an API. Every doc comment for a
`@public` export should include at least one.

````ts
/**
 * Adds two numbers
 *
 * @example
 * ```ts
 * add(1, 2); // 3
 * ```
 *
 * @param a - the first number to add
 * @param b - the second number to add
 * @return the sum of the two numbers
 * @public
 */
function add(a: number, b: number): number {}
````

### Link the First Mention of Other Public APIs

The first time a doc comment mentions another documented, public token,
that mention should be a `{@link}` to it. This turns our docs into a
web that's easy to navigate instead of a pile of disconnected pages.

```ts
/**
 * Updates the {@link User.name | User's name} with the provided
 * value.
 *
 * @public
 */
function updateUserName(user: User, name: string): void {}
```

### Link Every Member of a Union or Object-as-Enum

Union types and object-as-enum types should link each of their
members so that readers can jump directly to whichever member is
relevant to them.

```ts
/**
 * See also:
 * - {@link PendingRequest}
 * - {@link ResolvedRequest}
 * - {@link RejectedRequest}
 * - {@link CancelledRequest}
 */
export type RequestState<
  RT = unknown,
  E extends Error = Error,
> = PendingRequest | ResolvedRequest<RT> | RejectedRequest<RT, E> | CancelledRequest<RT, E>;
```

### Cross-Link Within a Class, Interface, or Object

Cross-linking between the members of the same class, interface, or
object is highly encouraged. This makes it fast and easy to navigate
around the documentation for that class/object/interface.

```ts
/**
 * Additional properties exposed on errors thrown by the
 * {@link Fetch | Fetch Handler}.
 *
 * In the case of an Abort or system/browser level issue,
 * this extends {@link DOMException}.
 *
 * Else it extends from {@link AggregateError} if the
 * response includes an array of errors, falling back
 * to {@link Error} as its base.
 */
export interface FetchError extends DOMException {
  /**
   * Alias for {@link FetchError.status | status}.
   *
   * @privateRemarks
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/status)
   */
  code: number;

  /**
   * The name associated to the {@link FetchError.status | status code}.
   *
   * Typically this will be of the formula `StatusTextError` for instance
   * a 404 status with status text of `Not Found` would have the name
   * `NotFoundError`.
   */
  name: string;

  /**
   * The http status code associated to the returned error.
   *
   * Browser/System level network errors will often have an error code of `0` or `5`.
   * Aborted requests will have an error code of `20`.
   *
   * @privateRemarks
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/status)
   */
  status: number;

  /**
   * The Status Text associated to the {@link FetchError.status | status code}
   * for the error.
   *
   * @privateRemarks
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/statusText)
   */
  statusText: string;

  /**
   * A property signifying that an Error uses the {@link FetchError}
   * interface.
   */
  isRequestError: true;
}
```

### Linking Symbols You Haven't Imported

`{@link}` can only resolve to symbols that TypeDoc can see referenced
in the file. To link a symbol you otherwise have no need to import,
import it as a type and suppress the resulting lint error:

```ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Thing } from './thing.ts';
import { functionThatReturnsThing } from './thing.ts';

/**
 * Does stuff and returns a {@link Thing}
 */
function doStuff() {
  return functionThatReturnsThing();
}
```

> \[!NOTE]
> We would like to improve the `@typescript-eslint/no-unused-vars` lint
> rule (or its config) so that type-only imports which exist solely for
> documentation linking purposes don't trigger this error. If you'd like
> to help investigate this, reach out!

### Linking a Module

Link an entire module (for instance, to point readers at a set of
related flags or utilities) by importing it as a type namespace:

```ts
import type * as FEATURES from './features.ts';

/**
 * see {@link FEATURES | features} for the available flags.
 *
 * @public
 */
```

### Linking to MDN

[typedoc-plugin-mdn-links](https://www.npmjs.com/package/typedoc-plugin-mdn-links)
automatically links the appropriate MDN page for web-platform types
(`Response`, `AbortController`, etc.) in published documentation, so
you don't need to (and shouldn't) manually link these in the main body
of a doc comment.

It can still be useful to include the MDN reference manually via
`@privateRemarks` for ease of navigation while reading the source:

```ts
/**
 * Cancel this request by firing the {@link AbortController}'s signal.
 *
 * @privateRemarks
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController/abort)
 *
 * @param reason - optional reason for aborting the request
 * @public
 */
```

The correct link to use can usually be found by jumping to the
TypeScript typedef for the token, which itself is documented with the
canonical MDN reference. For instance, this is (an excerpt of)
TypeScript's own type for `AbortController`:

```ts
/**
 * A controller object that allows you to abort one or more DOM requests as and when desired.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController)
 */
interface AbortController {
  /**
   * Returns the AbortSignal object associated with this object.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController/signal)
   */
  readonly signal: AbortSignal;

  /**
   * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController/abort)
   */
  abort(reason?: any): void;
}
```

### The `@deprecated` Tag

`@deprecated` is a standard TSDoc tag. The description below is an
add-on to, not a replacement for, its standard meaning: it signals
that consumers should stop using the tagged function, component, or
object because it is actively being removed.

* Whenever possible, link the `@recommended` replacement.
* If the deprecation is tracked by [the deprecations guide](/api/@warp-drive/build-config/deprecations/)
  (i.e. it has a deprecation id like `ember-data:deprecate-store-extends-ember-object`
  and a corresponding `DEPRECATE_*` flag), link both the guide and the
  specific deprecation id using `@id`.

```ts
/**
 * @deprecated use {@link ResourceKey} instead
 */
export type StableRecordIdentifier<T extends string = string> = ResourceKey<T>;
```

A glowing red badge is automatically added next to the heading of
whatever the tag describes; the deprecation message itself stays in
the page body as its own `#### Deprecated` section rather than being
absorbed into the badge, since it's usually worth reading in full.

### The `@discouraged` Tag

`@discouraged` signals that a function, object, or class is an older,
but not-yet-deprecated, way of doing something. Unlike `@deprecated`,
something tagged `@discouraged` may still have valid use cases; it's
optional to describe those cases in the tag.

If a `@recommended` alternative exists, cross-link to it.

A glowing orange badge is automatically added next to the heading of
whatever the tag describes.

### The `@recommended` Tag

`@recommended` is a companion tag to `@deprecated` and `@discouraged`.
It marks a function, object, or class as the preferred way of doing
something. It's not mandatory to link back to the `@discouraged` or
`@deprecated` alternative(s), but doing so is encouraged. Since
`@recommended` implies the existence of a `@discouraged` and/or
`@deprecated` counterpart, it shouldn't be used on its own.

A glowing blue/green badge is automatically added next to the heading
of whatever the tag describes.

### The `@legacy` Tag, and the `@warp-drive/legacy` and `@warp-drive/experiments` Badges

`@legacy` is a repo-specific modifier tag for symbols that predate the
current architecture but aren't (yet) `@deprecated` — it renders as a
plain, unstyled ``**`Legacy`**`` flag before the summary, the same
way any other modifier tag without special handling does (see
`@discouraged`/`@recommended` above for tags that *do* get special
handling).

Separate from that tag, every page under the `@warp-drive/legacy`
package automatically gets a red "@legacy" badge next to its
`<ModuleBadge>`, and every page under `@warp-drive/experiments`
automatically gets an orange "@experimental" badge the same way.
Both are applied purely by which package a file lives in — via
`docs-viewer/src/site-utils.ts` checking the generated file's path —
not by any doc comment tag, so nothing needs to be written in source
to get them; anything moved into (or out of) either package picks up
(or loses) its badge automatically.

Note that TypeDoc's own standard `@experimental` modifier tag (along
with `@alpha`/`@beta`/`@internal`/`@public`) is unrelated to the
`@warp-drive/experiments` badge above — tagging a symbol
`@experimental` elsewhere in the codebase does not add that badge, and
currently renders as nothing more than an unstyled
``**`Experimental`**`` flag, same as `@legacy` above.

***

## Documentation Hygiene

### Troubleshooting

If you have added docs but are not seeing them when previewing locally, and if you
have confirmed the docs preview server is running (and has not crashed)

* The docs may have been excluded due to using an [ignored doc comment](#ignored-doc-comments)
* The docs may have been excluded due to not using the right [comment syntax](#what-are-doc-comments)
* The documented thing may not be accessible via any public API entrypoint
* TypeDoc may be configured to ignore it (extremely rare)

### Previewing Documentation

#### For `docs.warp-drive.io`

From inside the `docs-viewer` directory

* start sync for guides with `bun ./src/start-guides-sync.ts`
* build/rebuild the API docs with `pnpm typedoc` (rerun as needed)
* start the server with `pnpm dev`, visit the site url
