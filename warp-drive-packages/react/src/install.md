```ts [src/app.ts]
import '@warp-drive/react/install';
```

This module is used to import and install a reactive signals implementation based on 
[TC39 Signals](https://github.com/tc39/proposal-signals) that is capable of being integrated into React applications, allowing
all of *Warp***Drive**'s fine-grained reactive state to correctly update the rendered output
of React applications.

It should be included at the top of the application, as well as within any test setup that occurs for tests that use reactive
state but which do not import and use the full application.
