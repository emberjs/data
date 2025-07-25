# Changelog

## v5.7.0-alpha.15

### Features

- **always-use-request-content**: Added new rule to lint against using `<Request>` component's `:content` block without consuming the actual request result
  
  This rule helps identify anti-patterns where the result is being indirectly consumed by accessing the resource in the store via other means.

### Initial Release

- Created ember-template-lint-plugin-warp-drive package
- Added TypeScript support
- Added comprehensive test suite
- Added recommended configuration