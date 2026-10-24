---
url: >-
  /pr-preview/pr-11087/api/eslint-plugin-warp-drive/rules/no-invalid-resource-types.md
---

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-invalid-resource-types` | 🏆 | ✅🛠️ |

## Rule Details

Enforces resource type naming consistency.

### Notes

Defaults to singular dasherized as a convention. File paths for models should
always follow this same convention.

## Configuration

The rule accepts a single configuration object, all properties optional

* `options.normalize` an object specifying a module from which to import a method(s) to use for normalizing resource types.

```ts
{
  'no-invalid-resource-ids': ['error', {
    normalize: {
      moduleName: require.resolve('inflection'),
      methodNames: ['classify']
    }
  }]
}
```

* `options.imports` a dictionary of specific module imports that should be linted

```ts
{
  'no-invalid-resource-ids': ['error', {
    imports: {
      'my-app/builders': ['findEntity']
    }
  }]
}
```

* `options.serviceNames` an array of service names to treat as store instances

```ts
{
  'no-invalid-resource-ids': ['error', {
    serviceNames: ['store', 'db']
  }]
}
```

* `options.argNames` an array of variable names to treat as store instances

```ts
{
  'no-invalid-resource-ids': ['error', {
    argNames: ['store', 'db']
  }]
}
```

## Examples

Assuming the default configuration of the rule.

Examples of **incorrect** code for this rule:

```ts
store.findRecord('user_settings', '1');
store.findRecord('userSetting', '1');
store.findRecord('UserSettings', '1');
store.findRecord('user-settings', '1');
```

Examples of **correct** code for this rule:

```ts
store.findRecord('user-setting', '1');
```

## Variables

* [export=](variables/export=.md)
