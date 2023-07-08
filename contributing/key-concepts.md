# Key Concepts

- [Identity](#-identity)

-------------

## 🔸 Identity

### Working with Identifiers and TypeScript

Identifying information can be encountered in several different manners depending on which APIs are being worked with and whether the code is "internal" or "public facing".

* The "ResourceIdentifier" type is used when the identifying information is end-user-supplied and not guaranteed to have "lid".

Example: `findRecord({ type: 'user', id: '1' })`

Most commonly this is the case when a record has not been encountered yet or when processing a payload received from the API.

* The "RecordIdentifier" type is used when identifying information MUST have "lid" but may not be the "stable" identifier object instance.

Example: `saveRecord({ type: 'user', id: null, lid: 'user:1' })`

Most commonly this is the case when the user might manually construct an identifier. Often this is the result of having previously serialized record state and later attempting to restore it.

* The "StableRecordIdentifier" type is used when identifying information MUST have "lid" AND MUST be the "stable" identifier object
instance produced and managed by the `IdentifierCache` associated to a
specific `Store` instance.

Example:

```ts
const identifier = recordIdentifierFor(record);
unloadRecord(identifier);
```

Any identifier supplied by an EmberData API will always be the stable variant. APIs which are operating based on identity and which can reasonably presume that the data exists expect stable identifiers and should error if an unknown identifier is encountered to prevent potential system-correctness errors.
