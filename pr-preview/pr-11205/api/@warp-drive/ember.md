---
url: https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/ember.md
---

This library provides reactive utilities for working with promises
and requests, building over these primitives to provide functions
and components that enable you to build robust performant apps with
elegant control flow.

## What it exports

The main entry point, `@warp-drive/ember`, provides the request and promise control-flow
components and their function forms:

* [`<Request />`](/api/@warp-drive/ember/classes/Request) renders a request's `idle`, `loading`,
  `content`, `error` and `cancelled` states, with refresh and autorefresh controls.
* [`<Await />`](/api/@warp-drive/ember/classes/Await) does the same for a plain promise.
* [`getRequestState`](/api/@warp-drive/core/reactive/functions/getRequestState) and
  [`getPromiseState`](/api/@warp-drive/core/reactive/functions/getPromiseState), re-exported from
  `@warp-drive/core/reactive`, expose the same reactive state to JavaScript.

## Paginate reactively

:::danger ⚠️ Experimental, use at your own risk
The pagination components have not been through an RFC and may change or be removed in a minor
release. Read the [Experiments guide](/guides/the-manual/experiments/) before depending on them.
:::

The `@warp-drive/ember/experiments` entry point provides the components for paginated collections:

* [`<Paginate />`](/api/@warp-drive/ember/experiments/classes/Paginate) monitors the request that
  loads a collection's first page and yields a pagination state for navigating its pages, in either
  `paged` or `infinite` mode.
* [`<EachLink />`](/api/@warp-drive/ember/experiments/classes/EachLink) yields the numbered,
  first/prev/next/last page links for a paged collection.

They build on the framework-agnostic primitives published from
[`@warp-drive/experiments/pagination`](/api/@warp-drive/experiments/pagination/), such as
`getPaginationState`, which is equally usable directly in JavaScript.

## Using in .hbs files

The components and reactive utilities this library exports are intended
for use with `gjs/gts` (Ember's [Template Tag Format](https://guides.emberjs.com/release/components/template-tag-format/).

To use them in handlebars (`.hbs`) files, your app should re-export them.

:::tabs

\==

**Definition**

```ts [app/components/await.ts]
export { Await as default } from '@warp-drive/ember';
```

**Usage**

```hbs [app/templates/application.hbs]
<Await @promise={{this.getTheData}}></Await>
```

\==

**Definition**

```ts [app/components/request.ts]
export { Request as default } from '@warp-drive/ember';
```

**Usage**

```hbs [app/templates/application.hbs]
<Request @future={{this.theDataRequest}}></Request>
```

\==

`<EachLink />` is only ever used inside a `<Paginate />` content block, so re-export both.

**Definition**

::: code-group

```ts [app/components/paginate.ts]
export { Paginate as default } from '@warp-drive/ember/experiments';
```

```ts [app/components/each-link.ts]
export { EachLink as default } from '@warp-drive/ember/experiments';
```

:::

**Usage**

```hbs [app/templates/users.hbs]
<Paginate @request={{this.usersRequest}}>
  <:content as |pages|>
    <EachLink @pages={{pages}} as |state|>
      {{#each state.links as |link|}}
        <button {{on "click" link.setActive}}>{{link.text}}</button>
      {{/each}}
    </EachLink>
  </:content>
</Paginate>
```

:::

This approach allows renaming them to avoid conflicts just by using a different
filename if desired:

::: code-group

```ts [app/components/warp-drive-await.ts]
export { Await as default } from '@warp-drive/ember';
```

```hbs
<WarpDriveAwait @promise={{this.getTheData}}></WarpDriveAwait>
```

:::

## Components

* [Await](classes/Await.md)
* [Request](classes/Request.md)
* [Throw](classes/Throw.md)

## Other

* [experiments](experiments/index.md)
* [install](install/index.md)
