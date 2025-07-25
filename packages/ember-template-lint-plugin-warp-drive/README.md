# ember-template-lint-plugin-warp-drive

[![npm version](https://badge.fury.io/js/ember-template-lint-plugin-warp-drive.svg)](https://badge.fury.io/js/ember-template-lint-plugin-warp-drive)

Ember template lint rules for Applications using WarpDrive or EmberData.

## Installation

```bash
npm install --save-dev ember-template-lint-plugin-warp-drive
```

Or with pnpm:

```bash
pnpm add -D ember-template-lint-plugin-warp-drive
```

## Usage

Add the plugin to your `.template-lintrc.js` configuration:

```javascript
module.exports = {
  plugins: ['ember-template-lint-plugin-warp-drive'],
  extends: ['ember-template-lint-plugin-warp-drive:recommended'],
};
```

Or configure individual rules:

```javascript
module.exports = {
  plugins: ['ember-template-lint-plugin-warp-drive'],
  rules: {
    'always-use-request-content': true,
  },
};
```

## Rules

### `always-use-request-content`

Lints against using `<Request>` component's `:content` block without consuming the actual request result.

Often this indicates an anti-pattern in which the result is being indirectly consumed by accessing the resource in the store via other means.

#### Rule Details

❌ **Bad** - Content block without yielded parameters:
```hbs
<Request @request={{@request}}>
  <:content>Hello World</:content>
</Request>
```

❌ **Bad** - Content block with yielded result but not using it:
```hbs
<Request @request={{@request}}>
  <:content as |result|>Hello World</:content>
</Request>
```

❌ **Bad** - Using default content instead of named blocks:
```hbs
<Request @request={{@request}}>
  Hello World
</Request>
```

❌ **Bad** - No blocks at all:
```hbs
<Request @request={{@request}} />
```

✅ **Good** - Content block that uses the yielded result:
```hbs
<Request @request={{@request}}>
  <:content as |result|>{{result.data.attributes.name}}</:content>
</Request>
```

✅ **Good** - Using other named blocks without content:
```hbs
<Request @request={{@request}}>
  <:loading>Loading...</:loading>
  <:error as |error|>{{error.message}}</:error>
  <:idle>Waiting</:idle>
</Request>
```

✅ **Good** - Content block using result in various contexts:
```hbs
<Request @request={{@request}}>
  <:content as |result state|>
    {{result.data.name}} - Online: {{state.isOnline}}
  </:content>
</Request>
```

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.

## License

This project is licensed under the [MIT License](LICENSE.md).