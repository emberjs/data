---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/eslint-plugin-warp-drive/rules/template-require-request-error-block.md
---

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `template-require-request-error-block` | 🐞 | |

> \[!TIP]
> This rule requires a template-aware parser. See [Template Rules](/guides/linting/#template-rules) for setup.

`<Request>` and `<Await>` are components for declaratively resolving a request or promise's states
in a template. Both only render an `:error` block if you provide one -- if the request or promise
rejects and no `:error` block was supplied, the error is thrown from within the component and can
crash the app.

This rule flags any `<Request>` or `<Await>` element that does not have an `:error` named block
among its children, including a completely empty or self-closing element.

### Incorrect Code

```gjs
import { Request } from '@warp-drive/ember';

<template>
  {{! no :error block: if the request rejects, the error is thrown and can crash the app }}
  <Request @request={{@request}}>
    <:content as |result|>
      <h1>{{result.title}}</h1>
    </:content>
  </Request>
</template>
```

```gjs
import { Await } from '@warp-drive/ember';

<template>
  {{! no :error block: if the promise rejects, the error is thrown and can crash the app }}
  <Await @promise={{@promise}}>
    <:success as |result|>
      <h1>{{result.title}}</h1>
    </:success>
  </Await>
</template>
```

```gjs
import { Request } from '@warp-drive/ember';

<template>
  {{! completely empty, self-closing <Request> has no :error block either }}
  <Request @request={{@request}} />
</template>
```

### Correct Code

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:error as |error|>
      <ErrorForm @error={{error}} />
    </:error>

    <:content as |result|>
      <h1>{{result.title}}</h1>
    </:content>
  </Request>
</template>
```

```gjs
import { Await } from '@warp-drive/ember';

<template>
  <Await @promise={{@promise}}>
    <:pending>
      <Spinner />
    </:pending>

    <:error as |error|>
      <ErrorForm @error={{error}} />
    </:error>

    <:success as |result|>
      <h1>{{result.title}}</h1>
    </:success>
  </Await>
</template>
```

## Variables

* [export=](variables/export=.md)
