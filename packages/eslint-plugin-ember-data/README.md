# eslint-plugin-warp-drive

> [!TIP]
> This Package is also available as eslint-plugin-ember-data

## Rules

- 🛠️ has Autofix
- 〽️ has Partial Autofix
- ✅ Recommended
- 💜 TypeScript Aware

| Rule | Description | Category | ✨ |
| ---- | ----------- | -------- | -- |
| [no-create-record-rerender](./docs/no-create-record-rerender.md) | Helps avoid patterns that often lead to excess or broken renders | 🐞⚡️ | ✅ |
| no-methods-in-models      | restricts adding methods to model classes | usage | ✅ |
| no-computeds-in-models    | restricts adding computed properties to model classes | usage | ✅ |
| no-getters-in-models      | restricts adding getters/setters to model classes | usage | ✅ |
| no-complex-derivations    | Helps avoid patterns that often lead to buggy or brittle code | 🐞 | ✅ |
| no-legacy-transforms             | Restricts usage of attr transforms on models that often lead to buggy or brittle code | 🐞 | ✅ |
| no-peek-all               | Restricts peekAll usage to reduce bugs and improve perf | 🐞⚡️ | ✅ |
| no-peek-record            | Restricts peekRecord usage to reduce bugs | 🐞 | ✅ |
| no-direct-imports         | Assists in usage of a whitelabel/repackaged app/company configured experience | usage | 🛠️ |
| no-string-includes        | Avoids a pattern that doesn't typecheck as nicely | usage | ✅ 🛠️ |
| no-invalid-relationships  | Ensures relationship configuration is setup appropriately | usage | ✅ 〽️ |
| no-legacy-methods         | Restricts usage of deprecated methods | usage | ✅ 〽️ |
| no-loose-resource-types   | Prevents usage of incorrect resource-types | usage | ✅ 〽️ |
| no-loose-ids              | Prevents usage of non-string IDs | usage | ✅ 🛠️ |
