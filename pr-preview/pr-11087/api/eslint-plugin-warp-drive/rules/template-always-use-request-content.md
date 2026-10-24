---
url: >-
  /pr-preview/pr-11087/api/eslint-plugin-warp-drive/rules/template-always-use-request-content.md
---

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `template-always-use-request-content` | 🐞 | |

> \[!TIP]
> This rule requires a template-aware parser. See [Template Rules](/guides/linting/#template-rules) for setup.

`<Request>` is a component for declaratively resolving a request's `idle` / `loading` / `cancelled`
/ `error` / `content` states in a template. Using it without ever consuming the resolved result is
usually a sign of an anti-pattern in which the result is instead being read indirectly, e.g. by
re-fetching the same resource from the store elsewhere. This defeats the purpose of using
`<Request>` to establish a resolution boundary in the first place.

This rule flags three situations for any `<Request>` element:

* No `:content` block, and no other named block (`:idle`, `:loading`, `:error`, `:cancelled`,
  `:always`, etc.) either. The request's outcome is entirely discarded.
* A `:content` block that does not capture the yielded result via a block param, e.g.
  `<:content>...</:content>`.
* A `:content` block that captures the yielded result but never references it anywhere within the
  block, e.g. `<:content as |result|>...</:content>` where `result` is unused.

The `:content` block's second yielded "state" param (used for things like `state.refresh` or
`state.isBackgroundReloading`) is unrelated to this rule -- whether or not it's used has no effect
on whether the rule reports a violation. The result may also be captured under any name you like;
the rule doesn't care about the specific identifier, only whether it's referenced.

### Incorrect Code

```gjs
import { Request } from '@warp-drive/ember';

<template>
  {{! the result is discarded entirely: no :content block and no other block either }}
  <Request @request={{@request}}>
    <SomeUnrelatedMarkup />
  </Request>
</template>
```

```gjs
import { Request } from '@warp-drive/ember';

<template>
  {{! the :content block never captures the yielded result }}
  <Request @request={{@request}}>
    <:content>
      <SomeUnrelatedMarkup />
    </:content>
  </Request>
</template>
```

```gjs
import { Request } from '@warp-drive/ember';

<template>
  {{! `result` is captured but never used }}
  <Request @request={{@request}}>
    <:content as |result|>
      <SomeUnrelatedMarkup />
    </:content>
  </Request>
</template>
```

### Correct Code

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:content as |result|>
      <h1>{{result.title}}</h1>
    </:content>
  </Request>
</template>
```

```gjs
import { Request } from '@warp-drive/ember';

<template>
  {{! the second "state" param may be used, unused, or omitted -- it's unrelated to this rule }}
  <Request @request={{@request}}>
    <:content as |result state|>
      <h1>{{result.title}}</h1>
      <button {{on "click" state.refresh}}>Refresh</button>
    </:content>
  </Request>
</template>
```

```gjs
import { Request } from '@warp-drive/ember';

<template>
  {{! no :content block, but other named blocks are present, so the request isn't discarded }}
  <Request @request={{@request}}>
    <:idle></:idle>
    <:loading></:loading>
    <:error></:error>
  </Request>
</template>
```

## Variables

* [export=](variables/export=.md)
