---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/eslint-plugin-warp-drive/rules/require-request-error-block.md
---

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `require-request-error-block` | 🐞 | |

`<Request>` (from `@warp-drive/react`) is a component for declaratively resolving a request's
`idle` / `loading` / `cancelled` / `error` / `content` states. The handler for each state is
supplied as a property on the `states` prop object, e.g.:

```tsx
states={{ error: MyErrorComponent, ... }}
```

If no `states.error` handler is supplied and the request rejects, the error is thrown from within
the component and can crash the app.

This rule flags any `<Request>` element that cannot be statically shown to provide a
`states.error` handler:

* No `states` prop at all.
* A `states` prop whose value is an object literal that has no `error` key, and no spread element
  that might supply one:

  ```tsx
  states={{ content: MyContent }}
  ```

To avoid false positives, this rule does **not** report when it cannot statically determine
whether `error` is supplied:

* A spread element is present, so the spread source may supply `error` even though it isn't
  listed directly:

  ```tsx
  states={{ ...shared, content: MyContent }}
  ```

* The `states` value isn't an object literal at all, so its shape can't be inspected:

  ```tsx
  states={sharedStates}
  ```

### Incorrect Code

```tsx
import { Request } from '@warp-drive/react';

function UserPreview({ id }: { id: string | null }) {
  // no `states` prop at all: if the request rejects, the error is thrown and can crash the app
  return <Request query={findRecord('user', id)} />;
}
```

```tsx
import { Request } from '@warp-drive/react';

function UserPreview({ id }: { id: string | null }) {
  return (
    <Request
      query={findRecord('user', id)}
      states={{
        // no `error` handler: if the request rejects, the error is thrown and can crash the app
        content: ({ result }) => <h2>{result.name}</h2>,
      }}
    />
  );
}
```

### Correct Code

```tsx
import { Request } from '@warp-drive/react';

function UserPreview({ id }: { id: string | null }) {
  return (
    <Request
      query={findRecord('user', id)}
      states={{
        error: ({ error, features }) => (
          <div>
            <p>Error: {error.message}</p>
            <button onClick={features.retry}>Try Again?</button>
          </div>
        ),
        content: ({ result }) => <h2>{result.name}</h2>,
      }}
    />
  );
}
```

## Variables

* [export=](variables/export=.md)
