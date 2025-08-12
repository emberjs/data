# always-use-request-content

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `always-use-request-content` | 🐞🏆 | ✅ |

Validates proper usage of `<Request>` component's content blocks to ensure the yielded request result is actually consumed, helping prevent anti-patterns where the result is accessed indirectly through the store.

## ❌ Examples of **incorrect** code for this rule

```hbs
<!-- Content block without yielded parameters -->
<Request @request={{@request}}>
  <:content>Hello World</:content>
</Request>
```

```hbs
<!-- Content block with unused yielded parameters -->
<Request @request={{@request}}>
  <:content as |result|>Hello World</:content>
</Request>
```

```hbs
<!-- Using default content instead of named blocks -->
<Request @request={{@request}}>
  Hello World
</Request>
```

```hbs
<!-- No blocks at all -->
<Request @request={{@request}} />
```

## ✅ Examples of **correct** code for this rule

```hbs
<!-- Content block that uses the yielded result -->
<Request @request={{@request}}>
  <:content as |result|>{{result.data.name}}</:content>
</Request>
```

```hbs
<!-- Content block using state parameter -->
<Request @request={{@request}}>
  <:content as |result state|>Online: {{state.isOnline}}</:content>
</Request>
```

```hbs
<!-- Using other named blocks without content -->
<Request @request={{@request}}>
  <:loading>Loading...</:loading>
  <:error as |error|>{{error.message}}</:error>
  <:idle>Waiting</:idle>
</Request>
```

## Configuration

This rule has no configuration options.

## References

- [WarpDrive Request Component Documentation](https://github.com/emberjs/data)
- [EmberData Store Documentation](https://github.com/emberjs/data)