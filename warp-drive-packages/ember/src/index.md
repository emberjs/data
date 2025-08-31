 # @warp-drive/ember
 
This library provides reactive utilities for working with promises
and requests, building over these primitives to provide functions
and components that enable you to build robust performant apps with
elegant control flow.

## Using in .hbs files

The components and utils this library exports are intended for use with `
Glimmer Flavored JavaScript (`gjs`). To use them in handlebars files, your
app should re-export them. For instance:

::: code-group

```ts [app/components/await.ts]
export { Await as default } from '@warp-drive/ember';
```

```hbs
<Await @promise={{this.getTheData}}></Await>
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
