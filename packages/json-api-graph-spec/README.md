# :electron: JSON:API Graphs

> **Note**
> Users of this specification must also utilize the [Atomic Operations Extension](https://jsonapi.org/ext/atomic/) and [Cursor Pagination Profile](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/)

The `JSON:API Graphs` Specification provides three things

- A [profile](https://jsonapi.org/format/1.2/#profile-rules) which adds support for linkage via `*` members
  - [Profile URI](./src/profile-references.md)
- An [extension](https://jsonapi.org/format/1.2/#extension-rules) which adds support for `QUERY` via `POST` and the `X-HTTP-Method-Override` header
  - [Ext URI](./src/ext-query.md)
- A query syntax and a parser spec for it.
  - [Spec URI](./src/spec-query-parser.md)
