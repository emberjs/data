# eslint-plugin-warp-drive

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-invalid-relationships` | 🏆 | ✅ |

> [!TIP]
> A partial/complete autofix for this rule is possible but has not been implemented.
> An autofix PR would be a welcome addition.

> [!Note]
> Ensures relationship configuration is setup appropriately

This rule ensures that the `async` and `inverse` properties are specified in `@belongsTo` and `@hasMany` decorators in EmberData models.

## Rule Details

This rule disallows:

- Using `@belongsTo` without specifying the `async` and `inverse` properties.
- Using `@hasMany` without specifying the `async` and `inverse` properties.

### Notes

- `async` may be either `true` or `false`, the historical default when unspecified was `true`
- `inverse` may be either the name of the field on the model on the other side of the relationship or `null`
- See the [relationships guide](https://github.com/warp-drive-data/warp-drive/blob/main/guides/relationships/index.md) for more information on valid configurations

## Examples

Examples of **incorrect** code for this rule:

```js
import Model, { belongsTo, hasMany } from '@ember-data/model';

export default class FolderModel extends Model {
  @hasMany('folder', { inverse: 'parent' }) children;
  @belongsTo('folder', { inverse: 'children' }) parent;
}
```

Examples of **correct** code for this rule:

```js
import Model, { belongsTo, hasMany } from '@ember-data/model';

export default class FolderModel extends Model {
  @hasMany('folder', { async: true, inverse: 'parent' }) children;
  @belongsTo('folder', { async: true, inverse: 'children' }) parent;
}
```

## References

- [Deprecation Guide](https://deprecations.emberjs.com/id/ember-data-deprecate-non-strict-relationships)
- [Relationship Guide](https://github.com/warp-drive-data/warp-drive/blob/main/guides/relationships/index.md)
