# ember-template-lint-plugin-warp-drive

Ember template lint rules for Applications using WarpDrive or EmberData.

## Rules

- ✅ Recommended
- 🐞 Helps prevent buggy code
- 🏆 Enforces a best practice

| Rule | Description | 🏷️ | ✨ |
| ---- | ----------- | -- | -- |
| [always-use-request-content](./docs/always-use-request-content.md) | Validates proper usage of `<Request>` component's content blocks | 🐞🏆 | ✅ |

## Usage

Add the plugin to your `.template-lintrc.js`:

```javascript
module.exports = {
  plugins: ['ember-template-lint-plugin-warp-drive'],
  extends: ['ember-template-lint-plugin-warp-drive:recommended'],
};
```

Or configure rules individually:

```javascript
module.exports = {
  plugins: ['ember-template-lint-plugin-warp-drive'],
  rules: {
    'always-use-request-content': true,
  },
};
```