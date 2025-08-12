# ember-template-lint-plugin-warp-drive

Ember template lint rules for Applications using WarpDrive or EmberData.

## Rules

- 🛠️ has Autofix
- 〽️ has Partial Autofix
- ✅ Recommended

**🏷️ Categories**

- 🐞 Helps prevent buggy code
- ⚡️ Helps prevent performance issues
- 🏆 Enforces a best practice

| Rule | Description | 🏷️ | ✨ |
| ---- | ----------- | -- | -- |
| [always-use-request-content](./docs/always-use-request-content.md) | Validates proper usage of `<Request>` component's content blocks | 🐞🏆 | ✅ |

## Usage

Add the plugin to your `.template-lintrc.js`:

```javascript
module.exports = {
  plugins: ['ember-template-lint-plugin-warp-drive'],
  extends: ['warp-drive:recommended'],
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