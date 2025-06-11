# eslint-plugin-warp-drive

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-invalid-resource-ids` | 🏆 | ✅🛠️ |

## Rule Details

Enforces using only string values as resource IDs.

### Notes

IDs in WarpDrive are always stored and exposed as strings.

## Configuration

The rule accepts a single configuration object, all properties optional

- `options.imports` a dictionary of specific module imports that should be linted

```ts
{
  'no-invalid-resource-ids': ['error', {
    imports: {
      'my-app/builders': ['findEntity']
    }
  }]
}
```

- `options.serviceNames` an array of service names to treat as store instances

```ts
{
  'no-invalid-resource-ids': ['error', {
    serviceNames: ['store', 'db']
  }]
}
```

- `options.argNames` an array of variable names to treat as store instances

```ts
{
  'no-invalid-resource-ids': ['error', {
    argNames: ['store', 'db']
  }]
}
```

## Examples

Examples of **incorrect** code for this rule:

```ts
store.findRecord('user');
store.findRecord('user', 1);
store.findRecord('user', null);
store.findRecord('user', '');
store.findRecord('user', undefined);
```

Examples of **correct** code for this rule:

```ts
store.findRecord('user', '1');
```
