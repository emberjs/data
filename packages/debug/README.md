# @ember-data/debug

Provides ember-inspector support for Ember apps built with EmberData
## Installation

> **Note**
> If using `ember-data`, this library comes pre-installed.

```
pnpm install @ember-data/debug
```

## Usage

### removing inspector support in production

If you do not want to ship inspector support in your production application, you can specify
that all support for it should be stripped from the build.

```ts
let app = new EmberApp(defaults, {
  emberData: {
    includeDataAdapterInProduction: false,
  },
});
```

## License

This project is licensed under the [MIT License](LICENSE.md).
