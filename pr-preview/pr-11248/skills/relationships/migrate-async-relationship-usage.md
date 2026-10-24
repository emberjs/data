---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/skills/relationships/migrate-async-relationship-usage.md
---
# Migrate Async Relationship Usage

Use this skill whenever code consumes an `async: true` `belongsTo` or `hasMany` relationship
implicitly and needs to move toward requests and the `resource`/`collection` kinds: a
an `#each` over `record.<name>`, reads of `record.<name>.content`, getters or
computed properties that reach through a relationship (often several levels deep), or
`await record.<name>`. The human guide
[Migrating Async Relationship Usage](/upgrading/v5/relationship-usage.md) explains each phase;
this skill is the order of operations and the rules for choosing between them.

## Steps

1. Inventory the sites before changing anything. Search templates for `#each` blocks over a
   relationship property and for relationship properties rendered directly; search JavaScript for
   `.content` on a relationship, `await record.<name>`, `@computed` dependent keys that cross a
   relationship (`'post.author.company.name'`), and `.belongsTo(`/`.hasMany(` reference calls. For
   each site note how many relationship levels the chain crosses; each level is a separate async
   boundary that will need an owner.
2. Do not change the field's `async` option or its kind in this pass. Phase 1 works on the legacy
   field, whose fetch-on-access still runs; only the handling of the resulting promise changes.
3. Phase 1, per site, in this order of preference:
   * a template site becomes an `<Await />` from `@warp-drive/ember` with `:pending`, `:error` and
     `:success` blocks, as in
     [In templates, use `<Await />`](/upgrading/v5/relationship-usage.md#in-templates-use-await);
     for a nested level, pass the inner relationship to a child component and await it there;
   * a getter or computed property becomes one `getPromiseState` call per level, as in
     [In getters and computed properties, use `getPromiseState`](/upgrading/v5/relationship-usage.md#in-getters-and-computed-properties-use-getpromisestate),
     replacing `@computed` dependent keys with plain getters: feed one level's `value` into the
     next level's `getPromiseState`, and return `null` while any outer level is still pending;
   * only when neither is a clean refactor (a synchronous utility, a chain with many consumers),
     read `record.hasMany('<name>').value()` or `record.belongsTo('<name>').value()` and add an
     explicit `.load()` where the screen begins, as in
     [Last resort: read the reference's `value()`](/upgrading/v5/relationship-usage.md#last-resort-read-the-reference-s-value).
     Ask the user before choosing this option; it is the shape Phase 3 removes.
     Never replace a load with `.belongsTo('<name>').id()` or `.hasMany('<name>').ids()`; that
     pattern has [no migration path](/upgrading/v5/relationships.md#patterns-without-a-migration-path).
4. Phase 2: find the request that loads the screen's parent record and add the relationship (and
   the chain below it) to its `include`, rendering inside a `<Request />` so the loading state
   lives at the request. For a relationship that must stay on demand, request its link with a
   `<Request />` instead of letting access fetch it. Follow
   [Phase 2: Load Through Requests](/upgrading/v5/relationship-usage.md#phase-2-load-through-requests).
   A field can change to `async: false` once every request that loads records of *its* type
   includes it (`post.comments` when every post request includes `comments`; `comment.author`
   when every request that loads comments includes `author`, including via `comments.author` on
   the post request). At that point delete its Phase 1 shims.
5. Phase 3: convert the fields with
   [Migrate belongsTo and hasMany Fields to resource and collection](./migrate-relationship-fields.md),
   then replace the remaining shims: for an included relationship, delete the `<Await />` (and
   any child component that only existed to await it) and read `.data` directly; for an
   on-demand one, fetch `doc.links.related` through a `<Request />` or `getPromiseState(doc.fetch())`, per
   [Phase 3](/upgrading/v5/relationship-usage.md#phase-3-move-the-fields-to-resource-and-collection).
6. Verify after each of steps 3, 4 and 5: the app renders every migrated screen with an empty cache and with a
   warm cache; no `.content` reads or `await record.<name>` remain for migrated fields; and, in
   Phase 3, the JSON:API validator reports nothing for the converted fields.

## Related

* Full guide: [Migrating Async Relationship Usage](/upgrading/v5/relationship-usage.md)
* Background: [Async as Reactive State](/guides/the-manual/reactivity/derivation.md)
* Related skill: [Fetch and Cache Data](../requests/fetch-and-cache-data.md)
