# eslint-plugin-warp-drive

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `require-singular-dasherized-resource-name` | 🏆 | ✅ |

> [!TIP]
> A partial/complete autofix for this rule is possible but has not been implemented.
> An autofix PR would be a welcome addition.

> [!Note]
> Ensures resource name is singular and dasherized.

This rule ensures that resource name in request builders.

## Rule Details

This rule enforces that resource identifiers follow two conventions:

- Resource name must be in singular form
- Resource name must be dasherized (kebab-case)

This promotes consistent naming across resources and aligns with EmberData conventions.

### Notes

- resource name must be in singular dasherized form to match model name convention in EmberData.
- See the [naming conventions guide](https://github.com/emberjs/data/blob/main/guides/cookbook/naming-conventions.md) for more information

## Examples

Examples of **incorrect** code for this rule:

```js
import Model, { belongsTo, hasMany } from '@ember-data/model';

export default class User extends Model {
  @hasMany('userSettings', { inverse: 'user' }) userSettings;
}
```

Examples of **correct** code for this rule:

```js
import Model, { belongsTo, hasMany } from '@ember-data/model';

export default class User extends Model {
  @hasMany('user-setting', { async: true, inverse: 'user' }) userSettings;
}
```

## Configuration

```json
{
  "rules": {
    "warp-drive/require-singular-dasherized-resource-name": ["error"]
  }
}
```

## References

- [Naming conventions Guide](https://github.com/emberjs/data/blob/main/guides/cookbook/naming-conventions.md)
