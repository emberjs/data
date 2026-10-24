---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/skills/relationships/migrate-relationship-fields.md
---
# Migrate belongsTo and hasMany Fields to resource and collection

Use this skill whenever you are changing a schema's `belongsTo` or `hasMany` field to the
`resource` or `collection` kind, or a user asks to move relationships to "the new kinds",
"PolarisMode relationships", or "relationship documents". The human guide
[Migrating Relationships to `resource` and `collection`](/upgrading/v5/relationships.md) owns the
rules; this skill is the order to apply them in and the checks that catch a field that must not
be migrated yet.

## Steps

1. Confirm the field lives on a `ReactiveResource` schema (`store.schema.registerResource` or a
   schema file), not on a `Model` decorated with `@belongsTo`/`@hasMany`. The new kinds have no
   decorator form. If the app is still on `Model`, stop and point the user at
   [LegacyMode → Migration](/guides/the-manual/schemas/resources/legacy-mode.md#migration) first.
2. For each field, establish what the API sends for it by reading the payloads the app actually
   receives (test fixtures, mock handlers, recorded responses), and if none are available, ask the
   user. Classify the field with the table in
   [Step 1: Classify Each Relationship](/upgrading/v5/relationships.md#step-1-classify-each-relationship):
   members always delivered with the parent means `async: false`; a `links.related` link means
   `async: true`. The field's current `async` value is not the answer, because the option's
   meaning changes.
3. Before converting, check for the two patterns that have
   [no migration path](/upgrading/v5/relationships.md#patterns-without-a-migration-path):
   * payloads whose relationship `data` references resources that are not in the same payload's
     `data` or `included`;
   * code calling `.belongsTo('<name>').id()` or `.hasMany('<name>').ids()` on that field, or
     passing ids taken from it to `findRecord`.
     If either is present in any endpoint that delivers the field, leave the field on
     `belongsTo`/`hasMany` untouched, tell the user why, and mention that the `reference` and
     `pointer` field kinds proposed in an upcoming RFC are the intended upgrade path. Legacy and
     migrated fields coexist, including as each other's inverse.
4. If the field is `async: true` today and is consumed implicitly (an `#each` over `record.<name>`,
   `.content`, getters reading through it), migrate that usage first with
   [Migrate Async Relationship Usage](./migrate-async-relationship-usage.md); the field change
   alone breaks those sites. Step 6 below then covers the remaining, explicit reads.
5. Convert the field as shown in
   [Step 2: Convert the Field](/upgrading/v5/relationships.md#step-2-convert-the-field): change
   `kind`, set `async` from step 2, keep `inverse`, `polymorphic`, `as` and `sourceKey`, drop
   `linksMode` and `resetOnRemoteUpdate` (the new kinds always load through requests, so nothing
   replaces `linksMode`). Update the TypeScript interface so the property is a
   `ReactiveRelationshipDocument<T>` from `@warp-drive/core/reactive`.
6. Update every read and write of the field using the tables in
   [Step 3: Update Reads](/upgrading/v5/relationships.md#step-3-update-reads) and
   [Step 4: Update Writes](/upgrading/v5/relationships.md#step-4-update-writes). Search for the
   field name followed by `.content`, for `await` of the field, and for `.belongsTo(`/`.hasMany(`
   reference calls on it; none of these has a meaning on a relationship document.
7. For every `async: true` field, make sure something loads it, following
   [Step 5: Load Async Relationships](/upgrading/v5/relationships.md#step-5-load-async-relationships).
   Prefer adding the relationship to the `include` of the request that loads the parent; use
   `doc.fetch()` or a `<Request />` on `doc.links.related` only for relationships loaded on demand.
   `doc.fetch()` fills in `doc.data`; a `<Request />` does not, so render its response.
8. Run the app's tests with the JSON:API validator active and fix what it reports in the payloads
   (fixtures, mocks, or the API) rather than by weakening the schema. The
   [Relationship Specification](/guides/the-manual/relational-data/spec.md#_3-4-enforcement)
   lists the rules and says how the validator is enabled.

## Related

* Full guide: [Migrating Relationships to `resource` and `collection`](/upgrading/v5/relationships.md)
* Field reference: [Relational Fields](/guides/the-manual/schemas/relational-fields.md)
* Related skill: [Define a Resource Schema](../schemas/define-a-resource-schema.md)
