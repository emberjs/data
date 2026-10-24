---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/contributing/writing-documentation/writing-api-docs.md
description: >-
  How to write the TSDoc comments that become the API reference, including which
  tags to use, the @summary each API page needs, usage examples, and what stays
  out of the published docs.
---

# Writing API Docs

Our [API Docs](/api/) are compiled from TSDoc comments in the source code and from each
package's `src/index.md`. For where API docs fit alongside guides and other documentation, see the
[Writing Documentation overview](./index.md).

Of the [audiences](./index.md#know-your-audience) our documentation serves, API docs are read by
existing users who already know what they want and need the details, and by readers who followed
a link from a guide. Assume they use ***Warp*Drive**; do not assume they know the concept behind
the symbol, so link the guide that teaches it on first mention. LLMs and coding agents are the
third reader, and they usually read the comment in the source rather than the rendered page, where
the status badges and automatic MDN links described below do not exist. Write so the words alone
carry the meaning: a `@deprecated` comment names its replacement in text, not only by badge.

## API Documentation Infra Overview

API Documentation is generated from [TSDoc](https://tsdoc.org/) comments in the source code
compiled with [TypeDoc](https://typedoc.org/) and transformed for [Vitepress](https://vitepress.dev/) using [typedoc-plugin-markdown](https://www.typedoc-plugin-markdown.org/plugins/vitepress).

TSDoc looks like JSDoc, but the grammar is TSDoc and the parser is TypeDoc, and the differences
matter: types come from the TypeScript signature rather than from `{type}` annotations in tags,
and TypeDoc adds tags JSDoc does not have (`@since`, `@internal`, `@group`, `@category`, and the
repo-specific ones described below).

TypeDoc is configured to follow our public package entrypoints (the `exports` in each package's
`package.json`) to auto-discover documentation. It documents everything reachable, public or
private, including properties and methods that have no associated code docs. It uses TypeScript to understand the source-code and builds documentation from the combination of Type signatures and TSDoc comments.

This is great, but it means that its very easy to leak private APIs
into the docs.

::: warning Avoid leaking private APIs into the public docs
Use `/** @internal */` on anything that should not appear in the public docs.
:::

While API Documentation lives with the source-code, the code's behavior plays no part in the
documentation that is generated: everything is compiled from type signatures and comments.

The below guide will walk through best practices for writing doc comments, important
nuances and syntaxes to know, as well as how to preview the doc comments.

## A Complete Doc Comment

Everything the rest of this page asks for, on one public function:

````ts
/**
 * Adds two numbers.
 *
 * @example
 * ```ts
 * add(1, 2); // 3
 * ```
 *
 * @param a - the first number to add
 * @param b - the second number to add
 * @return the sum of the two numbers
 * @since 5.10.0
 * @public
 */
export function add(a: number, b: number): number {}
````

* The `/**` opener and the `*` on every line: [Documentation Syntax](#documentation-syntax).
* The summary sentence, the `@example`, and `{@link}` on first mention of other public symbols:
  [Content Standards](#content-standards), next.
* `@param` and `@return` with descriptions only: [Don't document types in @param and @return](#don-t-document-types-in-param-and-return).
* `@since` with the full version: [Always specify `@since`](#always-specify-since-on-non-type-public-apis).
* `@public`, or `@internal` to keep it out of the docs:
  [Mark public exports with `@public`](#mark-public-exports-with-public).

## Content Standards

### Give Each API Page a `@summary`

`llms.txt`, the index coding agents read to decide which page to fetch, has one entry per API
page (see [Frontmatter and Agent-Only Content](./writing-guides.md#frontmatter-and-agent-only-content)).
The docs site takes that entry's description from a `@summary` tag, exactly as written; a page
without one is listed by name only, and nothing is guessed from the comment's prose. So add a
`@summary`, one sentence saying what the symbol does or is for, to the comment that owns a page:

* an exported class, function, interface, type alias, variable, or enum, each of which gets its
  own page
* a `@module` comment, which owns that module's page

Members don't need one. A method, property, or accessor renders on its parent's page, so its
`@summary` is never read.

````ts
/**
 * ## Import
 *
 * ```js
 * import { RequestManager } from '@warp-drive/core';
 * ```
 *
 * For complete usage guide see the [RequestManager Documentation](/guides/).
 *
 * @summary Runs each request through a chain of handlers that can fulfill, modify, or pass it along, and returns a `Future` for the response.
 * @public
 */
````

* Write it for a reader who sees nothing else: name the symbol's purpose rather than restating
  its name, and don't lean on the prose around it.
* Keep it to one sentence, under about 200 characters. A multi-line `@summary` is joined into
  one line.
* Inline code and `{@link}` are fine; `{@link Store}` contributes its link text. Avoid other
  markdown and HTML entities, which reach `llms.txt` as literal characters.
* `@summary` is not rendered on the page, so it doesn't repeat the prose readers see. It is a
  TypeDoc tag, not a TSDoc one; TSDoc treats everything before `@remarks` as the summary and has
  no `@summary`.
* For an overloaded function, put it on the implementation's comment or the first overload's.
* A package landing page built from `src/index.md` has no doc comment, so it can't carry one
  and is listed by name only.

### Every Public API Should Have a Usage Example

Even a minimal example dramatically shortens the time it takes for a
consumer to understand how to use an API. Every doc comment for a
[`@public`](#mark-public-exports-with-public) export should include at least one, under the
`@example` tag. Headings inside a comment body are fine for other structure, as the markdown
examples later on this page show, but the usage example itself goes under `@example`, which is
the convention in this repo. This applies to the exported symbol itself: a class, function, or
variable. A class member needs its own example only when using it is not obvious from the class
example, such as a method with several call patterns.

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
Write `{@link Symbol}` to show the symbol's own name, or
`{@link Symbol | other text}` to show other text; the `|` separates the
target from the label.

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
export type RequestState<RT = unknown, E extends Error = Error> =
  PendingRequest | ResolvedRequest<RT> | RejectedRequest<RT, E> | CancelledRequest<RT, E>;
```

### Cross-Link Within a Class, Interface, or Object

Cross-linking between the members of the same class, interface, or
object is highly encouraged. This makes it fast and easy to navigate
around the documentation for that class/object/interface. The
`@privateRemarks` blocks in the example below are notes for people
reading the source; TypeDoc excludes that tag from the rendered docs by
default.

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

`@deprecated` is a standard TSDoc tag. In this repo it carries one extra
meaning on top of the standard one: the tagged function, component, or
object is actively being removed, not merely out of favor (that is
[`@discouraged`](#the-discouraged-tag), below).

* Whenever possible, link the replacement, and tag that replacement
  [`@recommended`](#the-recommended-tag).
* If the deprecation is tracked by [the deprecations guide](/api/@warp-drive/build-config/deprecations/)
  (i.e. it has a deprecation id like `ember-data:deprecate-store-extends-ember-object`
  and a corresponding `DEPRECATE_*` flag), link the guide and name the
  deprecation id so readers can find its entry there.

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

## Documentation Syntax

### What are Doc Comments

Only `/**` comments are compiled as potential documentation, e.g.

```ts
/**
 * This is a potential documentation block
 */
```

Whereas single star comment blocks are not considered documentation

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
};

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

When compiling the API documentation, any symbol whose doc comment carries the `@internal` tag is
left out of the published docs entirely, along with everything nested under it (TypeDoc runs with
`excludeInternal`). This is how to document code for fellow developers without exposing it to end
consumers. For example, the function below would not appear in the docs:

::: warning `@internal` also removes the declaration from the package's types
`@warp-drive/core` compiles with `stripInternal`, so TypeScript drops every `@internal` declaration
from the emitted `.d.ts` as well. Tagging a symbol that another workspace package imports, which
includes anything exported from a `-private.ts` barrel, breaks that package's declaration build
with a `MISSING_EXPORT` error. Use `@internal` on class members and on symbols nothing else
imports. For a symbol that must stay importable but out of the docs, leave it in a `-private`
module: each package's `typedoc.config.mjs` excludes `-private` entry points, so nothing there is
documented unless a public entry re-exports it.
:::

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

This means you no longer need to add redundant tags like `@class` `@method` `@static` and
`@property`. The one structural tag still in use is `@module`, for package and subpackage
overviews (see below).

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

> \[!TIP]
> The fence around the example above uses four backticks (` ```` `) instead of three so the
> nested ` ```ts ` block doesn't close it early — a closing fence must be at least as long as the
> opening one, per the [CommonMark rule for fenced code blocks](https://spec.commonmark.org/current/#fenced-code-blocks).
> This is plain markdown, not a TSDoc feature: our docs render through VitePress's `markdown-it`,
> which implements the same rule. Use the same trick any time an example needs a code block inside
> another code block.

Additionally, the markdown parser in use by our docs understands
[code groups](https://vitepress.dev/guide/markdown#code-groups), and
[many other features](https://vitepress.dev/guide/markdown).

This means we can do code examples that toggle between files or formats.

````ts
/**
 * ::: code-group
 *
 * ```ts [example.ts]
 * export function numberFromString(str: string): number {}
 * ```
 *
 * ```js [example.js]
 * export function numberFromString(str) {}
 * ```
 *
 * :::
 */
````

[Line highlighting](https://vitepress.dev/guide/markdown#line-highlighting-in-code-blocks),
[focus](https://vitepress.dev/guide/markdown#focus-in-code-blocks), and code groups are three
VitePress features that combine to enable crafting powerful examples in the documentation.

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

 ```ts
 class User extends Model {
   @attr name;
 }
 ```

 @public
*/
````

### Documenting Packages and Subpackages

A package's documentation has three entry points, each its own file with its own purpose and
audience:

* **The README** is what npm and GitHub show. It is for someone deciding whether to install the
  package, and someone who just did and wants the first thing to type. Its rules are under
  [READMEs and `src/index.md`](#readmes-and-src-index-md) below.
* **The package landing page**, `src/index.md`, renders at `/api/<package>/` in the API docs. It
  is for an existing user who landed on the package and wants to know where to start, so it
  holds the setup and the map of the package's code entry points.
* **Subpath entry points** such as `@warp-drive/core/request` render at `/api/<package>/<path>/`,
  one page per entry file the package's `exports` map points at (`src/request.ts` for that one).
  They are for an existing user who already knows which part of the package they need.

The README and the landing page share an elevator-pitch snippet on purpose; everything else
belongs to exactly one of the three. The rest of this section covers the two in the API docs.

**Subpath entry points** such as `@warp-drive/core/request` or `@warp-drive/utilities/string` get
their overview from a doc comment at the top of the entry file with the tag `@module`. The prose
in that comment renders at the top of the subpath's page, above its member listing:

```ts
/**
 * Utilities for building request URLs and query strings.
 *
 * @module
 */
```

**The package root** `src/index.ts` is different. Its doc comment carries no prose, only tags:
these two, plus a module-level `@since` where one applies (see the end of this section). Every
package has this comment. `<project>` is typed literally; it is TypeDoc's name for the package
root:

```ts
/**
 * @module
 * @mergeModuleWith <project>
 */
```

The landing prose for the package lives in `src/index.md` instead, and the package's
`typedoc.config.mjs` names it with `readme: 'src/index.md'` (see
[README vs `src/index.md`](#readme-vs-src-index-md)).

The reason is how TypeDoc's `packages` entry point strategy treats a package with more than one
entry point: `src/index.ts` becomes a sub-module named `index`, with its own page at
`/api/<package>/index/`. The package's landing page at `/api/<package>/` then has no intro at all,
and whatever prose the `@module` comment held is reachable only from that sub-page.
`@mergeModuleWith <project>` folds the `index` module's exports into the package root and removes
the `index` module, its comment included, which is why the prose cannot live there. TypeDoc
renders the `readme` file at the top of the package's landing page, so that is where the prose
goes. A package with little to say still carries both; its `src/index.md` holds at least the
package name as an H1 and one sentence on what the package is, so that adding more later is a
one-file change.

A package whose `typedoc.config.mjs` points TypeDoc at `dist/*.d.ts` rather than `src` (because
its source has files TypeDoc cannot parse, such as the `.gts` components in `@warp-drive/ember`)
loses the `@module` / `@mergeModuleWith` comment when the d.ts files are bundled. Re-add it to
the root `index.d.ts` with the `banner` option in the package's `tsdown.config.mjs`;
`warp-drive-packages/ember/tsdown.config.mjs` shows how. `readme: 'src/index.md'` works unchanged
for such a package.

The one tag that may join the two above is a module-level `@since`, when the package as a whole
first shipped in a known version. `docs-viewer/src/typedoc-since-plugin.mjs` reads it from that
comment and renders it as a badge on the landing page.

### Mark public exports with `@public`

TSDoc's release tags say who a symbol is for. In this repo every export intended for consumers
carries `@public`; `@alpha` and `@beta` are not used. The rule applies to symbols reachable from
a public entry point: an export reachable from one with no tag is published as if it were public,
so give it `@public` or move it out of the public surface. Symbols exported only from `-private`
modules need no tag, because TypeDoc never sees those entry points, and must not get `@internal`
if another package imports them (see [Ignored Doc Comments](#ignored-doc-comments) for why).
Members of a `@public` class or interface inherit its visibility and do not need their own
`@public`; use `@internal` on a member to hide just that member. The
[Content Standards](#content-standards) above apply to anything public.

### Always specify `@since` on non-type public APIs

`@since` names the release the API first shipped in, using the full
stable version (`5.9.0`, not `5.9` and not a prerelease tag). For an API
you are adding now, that is the next stable release. It renders as a small badge rather than a
body section, so it's always visible next to the name of the thing it
describes without taking up page space. The other examples on this page
leave it out to stay short; real public APIs must not.

On a function, class, or variable it shows up right next to that page's
own name (an interface or type alias renders it the same way if you add
one, but types don't require it):

```ts
/**
 * @since 1.13.0
 * @public
 */
```

On a package's `@module` doc comment, it shows up next to that
package's `<ModuleBadge>` (the pill showing the module path at the top
of the module's index page) instead:

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

`@badge` and `@title` are repo-specific tags, implemented in
`docs-viewer/src/site-utils.ts`. Use `@badge <Label>` to override the
kind badge with a more meaningful conceptual label:

```ts
/**
 * The `<Await />` component allows you to utilize reactive control flow
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
than just a few symbols. Once any symbol on a page has a `@category`,
give every symbol on that page one; they may keep a `@group` as well,
since the two tags answer different questions — see [`@decorator` and
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
removes the constructor from the class's page. Use it on classes the
`Store` or a manager creates for the user, so the docs don't suggest
calling `new` on them:

```ts
/**
 * @hideconstructor
 */
class ReactiveResource {}
```

### Don't document types in @param and @return

Because types are parsed from the TypeScript, `@param` and `@return` should
be used to give a meaningful description only. This repo uses `@return`;
TypeDoc also accepts TSDoc's standard `@returns`.

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

## READMEs and `src/index.md`

Every published package has a `README.md` next to its `package.json`. It is the first thing a
reader sees on the package's GitHub directory and on its npm page, and `package.json` lists it in
`files` so it ships in the tarball. Its job is to say what the package is, whether the reader
wants it, and where the real documentation lives. It is not the place to teach the package.

Of the [audiences](./index.md#know-your-audience) our documentation serves, a README is for two
readers: a technical evaluator or hobbyist on npm or GitHub deciding whether to install this
package at all, and someone who just installed it and needs to know the first thing to do.
Neither is reading the docs site yet, so the README has to stand on its own, and neither wants
depth, so it has to hand them off quickly.

### README structure

A package README has these sections, in this order. The packages named in parentheses are the
ones the shape is taken from; copy from them.

* **Logo block.** A centered `<img>` of `./logos/logo-yellow-slab.svg` with `class="project-logo"`.
  The package's `logos/` directory is a synced copy of the repo-root `logos/synced/` (see the
  notice in `logos/synced/README.md`), so never edit it inside a package.
* **Badges.** Five badges from shields.io: npm version, npm downloads, license, and the EmberJS
  and ***Warp*Drive** Discord servers. Copy the block from another package of the same kind. A
  modern package's version and download badges name the package itself, URL-encoded
  (`%40warp-drive%2Fcore`), as `@warp-drive/core` does: non-Ember apps install it directly, and
  some modern packages version independently of the rest (`@warp-drive/holodeck`, `warp-drive`),
  so an `ember-data` version badge would be wrong for them. A legacy package keeps the
  `ember-data` targets, as `@ember-data/store` does: most of them ship as dependencies of the
  `ember-data` meta package and share its version, and the meta package's numbers describe the
  ecosystem they belong to better than their own would. An unpublished package keeps the
  `ember-data` targets too, since a badge for a name npm does not know renders as "not found". If
  the package wants its own release badges, add a **Tagged Releases** list between the H1 and the
  description (`@warp-drive/ember` has one).
* **Package name as the H1**, `# @warp-drive/json-api`. `@warp-drive/core` is the exception: it
  is the project's front door and uses the ***Warp*Drive** tagline instead.
* **The introduction: what it is, who should use it, and why.** One paragraph is enough for a
  small package; `@warp-drive/json-api` says it is a `{json:api}` cache implementation and that
  most apps should use it. A few paragraphs and a diagram are fine when they help an evaluator
  decide, as the two architecture diagrams in `@ember-data/store` do. A legacy or deprecated
  package opens this section with a GitHub alert (`> [!WARNING]`) that says so and names the
  replacement, as `@ember-data/store` does; the alert is not optional, since npm and GitHub
  readers never see the landing page's warning container.
* **Install and the elevator-pitch snippet.** A `pnpm add` line and the smallest code sample that
  shows the package in use: a developer skimming npm decides whether to keep reading from that
  sample, not from prose. The landing page shows the same thing in more depth, and that overlap
  is intended; it is the one piece of duplication a README carries on purpose. Keep the sample to
  what fits on one screen and link the landing page for the rest. `@warp-drive/memory-alpha` is
  read from `node_modules` rather than imported, so its sample is the install and a file path.
* **`## Documentation`** with the same *Get Started* link to the Guides every package uses,
  followed by a link to the package's own landing page in the [API docs](/api/) when the docs
  build publishes the package (`@ember-data/store` has both; `@ember-data/debug` is not in the
  build and has only the first). Both are absolute URLs: the README is rendered by GitHub and
  npm, so the root-relative `/guides/` links the rest of the docs use do not resolve here.
* **`## Code of Conduct` and `### License`**, linking the repo's `CODE_OF_CONDUCT.md` on GitHub
  and the package's own `LICENSE.md`, which ships in `files` alongside the README.

Two branding blocks sit outside that order. Several READMEs open with a centered tagline `<p>`
right under the H1. Every `@warp-drive/*` README closes, after the License section, with the
collapsible `### ♥️ Credits` block and the `<style>` tag inside it; copy the block from
`@warp-drive/vue` byte for byte, since a few older copies have drifted. Legacy `@ember-data/*`
READMEs keep whatever branding they already have. These blocks are wanted: keep them when editing
a README and copy them when creating one.

A few older READMEs (`@warp-drive/ember`, `@ember-data/request`) predate this shape and carry a
full manual. Do not copy that: their API detail has to be kept in sync by hand, and the link
checker does not cover READMEs (see [Checking Links](./index.md#checking-links)).

### README vs `src/index.md`

Each package's `typedoc.config.mjs` sets `readme: 'src/index.md'`, and TypeDoc renders that file
as the package's landing page in the [API docs](/api/) at `/api/<package-name>/`, above the
generated member listing. It pairs with the bare `@module` / `@mergeModuleWith <project>` comment
at the top of `src/index.ts`; [Documenting Packages and Subpackages](#documenting-packages-and-subpackages)
explains why both are needed. A package whose config still says `readme: 'none'` has a landing
page that silently does not render; the fix is to set `readme: 'src/index.md'` and create that
file, not to put the prose somewhere else.

The split follows from where each file renders:

* `README.md` is GitHub-flavored markdown for GitHub and npm. Use `> [!WARNING]` alerts and
  absolute URLs. It answers "should I install this?".
* `src/index.md` is VitePress markdown for the docs site. It can use `:::tip` and `:::warning`
  containers, `::: code-group`, root-relative links like `/api/@warp-drive/core/`, and TSDoc
  `{@link}` references, as `packages/request/src/index.md` does. It starts with the package name
  as an H1 and answers "I am on the API docs for this package, where do I start?", so this is the
  place for the setup snippet, as `warp-drive-packages/json-api/src/index.md` shows. A
  `{@link}` here resolves against every package in the docs build, not against the imports of
  `src/index.ts`, so name the package: `{@link @warp-drive/core!Store | Store}`, where the `!`
  separates the package from the symbol. For a symbol under a subpath entry point, use a
  root-relative URL instead, `[Cache](/api/@warp-drive/core/types/cache/types/Cache)`; copy the
  path from the symbol's rendered page. A bare `{@link Store}` renders as plain text with a
  `Failed to resolve link` warning in the build log.

Some packages still duplicate paragraphs between the two. When you touch one, read the other and
move each sentence to the file that answers its question.

### Keep READMEs short

A README links to the [Guides](/guides/) and the [API docs](/api/) instead of restating them.
Concepts live in a guide (see [Writing Guides](./writing-guides.md)); signatures, options, and
per-member behavior live in TSDoc, as the rest of this page describes. If a README sentence
explains how something works, it belongs in one of those and the README should link there.

Short means without the manual, not without the introduction or the elevator-pitch snippet. When
a landing page or guide now owns a section, remove that section from the README and link there.
Everything in [README structure](#readme-structure) stays: the introduction and its legacy alert,
the install line and the one snippet, and every branding block. A README cut down to badges and
links fails the evaluator it exists for.

When code changes, follow the
[Cross-Documentation Checklist](./index.md#cross-documentation-checklist): a new public API
gets a README or `src/index.md` mention only if it changes the package's headline story, and a
breaking change means fixing any README example that uses the old API. Preview README changes by
viewing the file on your branch on GitHub.

## Previewing and Troubleshooting

### Previewing Documentation

Run `pnpm start` from `docs-viewer/`; it rebuilds the API docs when package sources change. The
static build and the pull-request preview are covered in
[Previewing Your Changes](./index.md#previewing-your-changes).

### Troubleshooting

If you have added docs but are not seeing them when previewing locally, and if you
have confirmed the docs preview server is running (and has not crashed):

* The docs may have been excluded due to using an [ignored doc comment](#ignored-doc-comments)
* The docs may have been excluded due to not using the right [comment syntax](#what-are-doc-comments)
* The documented thing may not be accessible via any public API entrypoint (the `exports` in the
  package's `package.json`)
* TypeDoc may be configured to ignore it (extremely rare; see `docs-viewer/typedoc.config.mjs`)
