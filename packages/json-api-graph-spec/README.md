# JSON:API Graphs

A grouping of [profile](https://jsonapi.org/format/1.2/#profile-rules), [extension](https://jsonapi.org/format/1.2/#extension-rules) and parser specifications which together allow APIs to take full advantage of EmberData capabilities with better DX.

> **Note**
> Users of this specification should also utilize the [Atomic Operations Extension](https://jsonapi.org/ext/atomic/) and [Cursor Pagination Profile](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/)

The `JSON:API Graphs` Specification provides three things

1. A [profile](./src/profile/complex-relationships.md) which adds support for both deeply nested relationships and linkage via `*` members
2. An [extension](./src/ext/query.md) which adds support for `QUERY` via `POST` and the `X-HTTP-Method-Override` header
3. A [spec](./src/spec-query-parser.md) for a query syntax and parser 
