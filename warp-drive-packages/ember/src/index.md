 # @warp-drive/ember
 
This library provides reactive utilities for working with promises
and requests, building over these primitives to provide functions
and components that enable you to build robust performant apps with
elegant control flow.

## Using in .hbs files

The components and reactive utilities this library exports are intended
for use with `gjs/gts` (Ember's [Template Tag Format](https://guides.emberjs.com/release/components/template-tag-format/).

 To use them in handlebars (`.hbs`) files, your app should re-export them.

:::tabs

==<Await />

**Definition**

```ts [app/components/await.ts]
export { Await as default } from '@warp-drive/ember';
```

**Usage**

```hbs [app/templates/application.hbs]
<Await @promise={{this.getTheData}}></Await>
```

==<Request />

**Definition**

```ts [app/components/request.ts]
export { Request as default } from '@warp-drive/ember';
```

**Usage**

```hbs [app/templates/application.hbs]
<Request @future={{this.theDataRequest}}></Request>
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
