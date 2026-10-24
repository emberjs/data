---
url: https://canary.warp-drive.io/skills/schemas/define-a-resource-schema.md
---
# Define a Resource Schema

Use this skill when you need to teach a WarpDrive `Store` the shape of a resource type (e.g.
`'user'`) — its fields, its relationships, and how they should be cached and reactively exposed.

## Steps

1. Pick a `ResourceType` string for the resource (e.g. `'user'`).
2. Call `store.schema.registerResource` with a `ResourceSchema` describing:
   * `identity` — how the resource's primary key is represented, typically `{ kind: '@id', name: 'id' }`.
   * `legacy: true` — use `LegacyMode`, the current recommendation for both new and existing apps
     (`PolarisMode` is still a preview and not yet recommended).
   * `fields` — an array describing each attribute and relationship.

```ts
store.schema.registerResource({
  type: 'user',
  identity: { kind: '@id', name: 'id' },
  legacy: true,
  fields: [
    { kind: 'field', name: 'firstName', sourceKey: 'first-name' },
    { kind: 'field', name: 'lastName', sourceKey: 'last-name' },
    { kind: 'field', name: 'lastSeen', sourceKey: 'last-seen', type: 'date-time' },
    {
      kind: 'resource',
      name: 'bestFriend',
      sourceKey: 'best-friend',
      options: { async: false, inverse: null },
    },
    {
      kind: 'collection',
      name: 'pets',
      options: { async: false, inverse: null, polymorphic: true },
    },
  ],
});
```

## Field kinds

* `field` — a plain attribute. Add `type` (e.g. `'date-time'`) to run the value through a
  registered transform on read/write.
* `resource` — a to-one relationship to another resource type.
* `collection` — a to-many relationship to another resource type.
* `sourceKey` lets the schema's field `name` (camelCase, used in app code) differ from the key
  the field actually lives at in cached data (e.g. dasherized keys from a JSON:API response).

## Notes

* Schemas are plain JSON — they can be authored by hand, generated, or loaded from a remote
  source at runtime.
* Register schemas once, early, before any request that touches the resource type.

## Related

* Full guide: [Schemas](/guides/the-manual/schemas/index.md)
* Related skill: [Fetch and Cache Data](/skills/requests/fetch-and-cache-data)
