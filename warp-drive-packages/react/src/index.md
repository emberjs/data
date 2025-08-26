This package provides a React-specific reactivity integration,
components and hooks for *Warp***Drive**.

## The Basics

make requests, profit

## How It Works

Unlike reactive frameworks, React does not natively have the ability to support
fine-grained reactivity. However, we can approximate it to "good enough"
granularity by keeping track of signals used within a specific {@link ReactiveContext}.

React also does not have a built-in way to memoize arbitrary functions based on
what signals they consume the way that reactive frameworks do, but by building
overtop of other Signal libraries we can provide this.

Due to the above limitations, the React Signals integration is built
overtop the polyfill for [TC39 Proposal Signals](https://github.com/tc39/proposal-signals)

The TC39 Proposal's `Watcher` especially is valuable here, as it allows us to subscribe to changes
to the dependency graph of a memo and not just a signal.

Every {@link ReactiveContext | <ReactiveContext />} provides a `Watcher` and subscribes to it as
an [External Store](https://react.dev/reference/react/useSyncExternalStore). When reactive state is
accessed, if there is a current context then the signal is added to that context's Watcher.

The Watcher then intelligently batches updates to the signals it is observing and then notifies React
that the external store has changed. The triggers React to rerender the components in the context's
sub-tree.

## Optimizing Rerenders

The {@link Request | <Request />} component also functions as a `<ReactiveContext/>` (you do not need to wrap the component
in one yourself). For most applications, relying only on the `<Request />` component may be good enough. But when performance
counts you might find that wrapping additional sub-trees in their own `<ReactiveContext/>` is better.

For instance, imagine a request that loads a list of users. We might wrap each individual user in its own `<ReactiveContext/>`.

```tsx
function UserPreview({ user }) {
  return (
    <ReactiveContext>
      <h3>{user.name} | {user.jobTitle}</h3>
    </ReactiveContext>
  );
}

function UserList() {
  return (
    <Request
      query={getFirstPageOfUsers()}
      states={{
        loading: ({ state }) => <div>Loading user data...</div>,
        error: ({ error, features }) => (
          <div>
            <p>Error: {error.message}</p>
            <p><button onClick={features.retry}>Try Again?</button></p>
          </div>
        ),
        content: ({ result, features }) => (
          <ul>
          {result.data.map(user => <li><UserPreview user={user} /></li>)}
          </ul>
        </div>
      ),
      }}
    />
  );
}
```

## Using React Embedded In Another Reactive Framework

show signals composition by running both configs and combining them

## Tips & Tricks aka "The Rule of WarpDrive"

1. only things accessed during a render are subscribed to

Values accessed asynchronously inside of effects or callbacks will not become dependencies unless the reactive
property is explicitly a dependency of the effect or callback. Which brings us to rule #2.

2. useEffect/useMemo/useCallback etc will only re-run if the reactive property is one of their dependencies

This bit is easy enough. If you want the effect or callback to re-run anytime a rerender is due to reactive state
having changed, you can consume the context value itself as a dependency.

```ts
import { WatcherContext } from '@warp-drive/react';

function OnAnyReactiveUpdate() {
  useEffect(() => console.log('updated'), [WatcherContext]);
}
```

3. if signals are passed from an external source, their consumption by the app needs to occur within render.

This means that top-level consumption by the app must be done within a component, see below.

::: code-group

```ts [❌-BAD]
// the reactive state is created external to the React application
const blogPost = await store.request(getBlogPost());

// We wrapped the usage in a ReactiveContext, and yet 🤔... strangely
// it does not reactively update
const root = createRoot(element);
root.render(
   <ReactiveContext><div>{blogPost.content.title}</div></ReactiveContext>
)
```

```ts [✅-GOOD]
// the reactive state is created external to the React application
const blogPost = await store.request(getBlogPost());

// wrap the consumption in a component
function MyApp() {
  return (
    <div>{blogPost.content.title}</div>
  }
}

// render the react app wrapped in a <ReactiveContext />
const root = createRoot(element);
root.render(
  <ReactiveContext><MyApp /></ReactiveContext>
)
```

:::

The reason this is so is because when react compiles the jsx in the BAD example, it will treat `blogPost.content.title` as
an external dependency of the app, and thus the access of it will only occur once and cannot be subscribed to by React's render.

[Here is a babel repl](https://babeljs.io/repl#?config_lz=N4IgZglgNgpgdgQwLYxALhAJxgBygOgCsBnADxABoQdtiYAXY9AbWZHgDdLR6FMBzBkwxQExegAIAjBIDCAC0wB7FBI4xMxCErhMqSJQBMArrGFgEUOgF8AuhTbYEAY3rcsxuPQgp0IBMb0KgjeziB29iDESsaYzjAAKgCeOKgYBiaw4UA&code_lz=JYWwDg9gTgLgBAJQKYEMDG8BmUIjgcilQ3wG4AoUSWRYmAEQHkBZObXAo9GAWgBNcAejQAbYEgB2MMuXJoIEgM7wQATwDKMFDCRwAvAQAWSESIhwA7tBF8Z5ZNybMAdGi46EECDAAUAtACuIJIwzgDmSDAAoiJIwVIAQqoAknw-hF7SAJRZzkQSfEhQPuRwcAA8DhjOmlDAGMwQhQB8pWUVfMAAbs0A3mqa2kgAvuWCnT1tY1WhtfUwjS3kWRRAA&lineWrap=true&version=7.28.3) to see what this looks like in compiled output.

By moving the access inside of `MyApp`, our reactive state is now a dependency of the component's render, and will work as expected.

