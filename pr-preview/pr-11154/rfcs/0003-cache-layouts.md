---
url: /pr-preview/pr-11154/rfcs/0003-cache-layouts.md
---

# Cache Layouts and Named Document Entries&#x20;

## Summary

Introduce **Layouts**: a registered, named concept that tells the cache where, inside an
arbitrary response payload, to find the primary data, side-loaded resources, meta, links and
errors, and inside each resource where to find its type, id, attributes and relationships
(including embedded resources and id-reference relationships).

Layouts are *ingestion only*. They run inside `Cache.put` and `Cache.didCommit` before the
existing JSON:API pipeline and produce the canonical document the cache already understands.
Read-back (`peek`, `getAttr`, `getRelationship`, `ReactiveResource`) is unchanged.

Alongside layouts, extend the canonical cached document with **named entries**: additional
top-level resource sets beyond `data` and `included`, exposed reactively as
`document.entries.<name>`. Together these let a single response such as
`{ users: [...], posts: [...], meta: {...} }` become one cached, reactive, invalidatable document
whose graph has several roots.

This RFC covers the core mechanism only: concept types, registration on the `SchemaService`,
per-request selection, the changes to `@warp-drive/json-api`'s cache, and the named-entries
extension. A declarative layout helper and built-in REST / ActiveRecord layouts are explicitly
follow-ups.

## Motivation

`JSONAPICache` hardcodes the JSON:API shape at four seams:

| Seam | Location | What is assumed |
| --- | --- | --- |
| Document dispatch | `warp-drive-packages/json-api/src/-private/cache.ts` `put` (`:213-318`) | `content` is `{ data, included, meta, links }` or an `Error`, classified by `isErrorDocument` / `isMetaDocument` |
| Resource identity | `putOne` (`:2084-2107`) | `resource.type`, non-empty `resource.id` |
| Resource contents | `cacheUpsert` (`:2234-2328`) | `data.attributes` merged into `remoteAttrs`; `data.relationships[name]` is a JSON:API relationship object pushed to the Graph |
| Document storage | `_putDocument` (`:320-397`) | only `links` and `meta` copied; `data` / `included` become `ResourceKey`s |

`didCommit` (`:877-940`, helper `:2499-2629`) makes the same assumptions for mutation responses.

Today the documented way to use any other API shape is a request `Handler` that rewrites
`content` into JSON:API before the `CacheHandler` sees it (`guides/the-manual/requests/handlers.md`,
"Handlers are also the primary tool to use for massaging response data into a better format").
That approach has real costs:

* **It is not schema-aware.** The handler has no cheap way to know which keys are relationships,
  which relationship is polymorphic, or what the identity key for a type is. Every app re-derives
  this from its own conventions.
* **It cannot be reused across requests or selected per response.** A handler sees a request; a
  layout can be selected by builder, by request option, or by content negotiation.
* **It duplicates work the cache already does.** Embedded resources need hoisting, deduping, and
  identifier replacement. The legacy `EmbeddedRecordsMixin` and `RESTSerializer` exist because
  this is fiddly; the cache is the natural owner since it already walks `included` before `data`.
* **Mutation responses are easy to miss.** `didCommit` runs on save responses; a handler that
  only reshapes `GET`s leaves saves broken. Layouts apply to both.
* **Multi-entry responses cannot be expressed at all.** The canonical document has one `data`.
  A dashboard endpoint returning several collections must be split into several requests or
  crammed into `data` plus `included`, losing the per-collection membership and order the
  document is supposed to preserve.

Because the cache's internal state is already format-independent (flat attribute maps plus the
Graph; `peek` re-synthesizes a JSON:API resource object at `cache.ts:494-551`), the normalization
boundary can move into the cache without touching how records read.

## Detailed design

### Terminology

* **Layout** — a registered concept object, branded with `[Type]: string` exactly like
  `Transformation`, `Derivation` and `HashFn` (`warp-drive-packages/core/src/types/schema/concepts.ts`),
  that normalizes one response into the canonical document.
* **Canonical document** — the raw JSON:API document shape the cache consumes today
  (`warp-drive-packages/core/src/types/spec/json-api-raw.ts`: `ExistingResourceObject` `:271`,
  `SingleResourceDocument` `:372`, `CollectionResourceDocument` `:389`), extended by this RFC with
  an optional `entries` member.
* **Entry** — a named top-level resource set on a document besides `data`, e.g. `entries.users`.
* **Embedded resource** — a nested resource inside a relationship value. The cache hoists it into
  `included`, upserts it, and replaces it with an identifier.

### Part 1: the `Layout` concept

New file `warp-drive-packages/core/src/types/schema/layout.ts`; the `Layout` type is also
re-exported from `concepts.ts` so all registered concepts are discoverable together.

```ts
import type { Type } from '../symbols.ts';

/**
 * A Layout normalizes a response payload into the canonical document
 * shape consumed by the Cache. Layouts are ingestion-only: they never
 * affect how data is read back out of the cache.
 *
 * Layouts must be registered with the SchemaService via
 * `schema.registerLayout(layout)` before use, keyed by the name assigned
 * to their {@link Type} property.
 *
 * @public
 */
export type Layout = {
  /** The unique name this layout is registered under, e.g. `'rest'`. */
  [Type]: string;

  /**
   * When `true`, DEBUG builds run the JSON:API 1.1 document validator
   * against this layout's normalized output. Defaults to `false` for
   * custom layouts; the built-in `json:api` layout always validates.
   */
  validate?: boolean;

  /**
   * Content negotiation. Consulted, in registration order, only when the
   * request did not name a layout via `cacheOptions.layout`. Must be
   * cheap and side-effect free.
   */
  match?(doc: StructuredDocument<unknown>): boolean;

  /**
   * Document-level extraction: locate primary data, named entries,
   * side-loaded resources, meta, links and errors. Required; there is no
   * sensible default across APIs.
   */
  document(doc: StructuredDocument<unknown>, ctx: LayoutContext): NormalizedDocument;

  /**
   * Resource-level extraction: type, id, attributes, relationships.
   * Optional. The default implementation is described below.
   */
  resource?(raw: unknown, ctx: LayoutResourceContext): NormalizedResource;

  /**
   * Relationship-level extraction for one field. Optional. Called by the
   * default `resource` hook and by `ctx.relationship()`. Return
   * `undefined` to signal "not present in this payload".
   */
  relationship?(
    field: RelationshipFieldSchema,
    raw: ObjectValue,
    ctx: LayoutResourceContext
  ): NormalizedRelationship | undefined;
};
```

#### The normalized intermediate

The layout's output is the canonical JSON:API document, with two additions: an `entries` member
(Part 4) and an `Embedded` marker permitted inside relationship `data`.

```ts
/** Universal brand for embedded resources returned inside relationship data. */
export const Embedded: '___(unique) Symbol(Embedded)' = getOrSetUniversal(
  'Embedded',
  Symbol.for('wd:embedded')
);

export type NormalizedDocument =
  | {
      data: NormalizedResource | NormalizedResource[] | null;
      included?: NormalizedResource[];
      entries?: Record<string, NormalizedResource | NormalizedResource[] | null>;
      meta?: Meta;
      links?: Links | PaginationLinks;
    }
  | { meta: Meta; links?: Links | PaginationLinks } // meta-only document
  | { errors: ApiError[]; meta?: Meta; links?: Links | PaginationLinks }; // error document

/**
 * Structurally identical to ExistingResourceObject except that
 * relationship data may contain EmbeddedResource markers.
 */
export interface NormalizedResource {
  type: string;
  id: string;
  lid?: string;
  /** keyed by the API's key for the field (`sourceKey ?? name`) */
  attributes?: ObjectValue;
  relationships?: Record<string, NormalizedRelationship>;
  links?: Links;
  meta?: Meta;
}

export interface EmbeddedResource extends NormalizedResource {
  [Embedded]: true;
}

export type NormalizedRef = ExistingResourceIdentifierObject | EmbeddedResource;

export interface NormalizedRelationship {
  data?: NormalizedRef | NormalizedRef[] | null;
  links?: Links | PaginationLinks;
  meta?: Meta;
}
```

`Embedded` uses `getOrSetUniversal` with a `Symbol.for('wd:…')` key, the convention for
user-facing flags (`SkipCache`, `EnableHydration` in `warp-drive-packages/core/src/types/request.ts:27-33`),
because layout code may live in a different bundle than the cache.

#### The context objects

```ts
export interface LayoutContext {
  /** Deep-frozen in DEBUG. Absent for request-less `cache.put({ content })`. */
  readonly request: ImmutableRequestInfo | undefined;
  readonly response: Response | ResponseInfo | null;
  /** The RequestKey when the request is cacheable, else null. */
  readonly requestKey: RequestKey | null;
  readonly schema: SchemaService;
  /** true when normalizing a StructuredErrorDocument. */
  readonly isError: boolean;
  /** Set only during didCommit: the key(s) being committed. */
  readonly committing: ResourceKey[] | null;

  /**
   * Normalize a raw resource of `type` via `layout.resource ?? default`.
   * `type` may be null to trigger inference (see below).
   */
  resource(type: string | null, raw: unknown, owner?: OwnerInfo): NormalizedResource;
  /** As `resource`, but returns an EmbeddedResource for use inside relationship data. */
  embed(type: string | null, raw: unknown, owner?: OwnerInfo): EmbeddedResource;
  /** Applies the type inference chain and asserts `schema.hasResource`. */
  inferType(hints: TypeHints): string;
  /** `ref('user', 3)` -> `{ type: 'user', id: '3' }` */
  ref(type: string, id: string | number): ExistingResourceIdentifierObject;
}

export interface LayoutResourceContext extends LayoutContext {
  readonly type: string;
  readonly identity: IdentityField;
  /** `schema.cacheFields(type) ?? schema.fields(type)`, keyed by `sourceKey ?? name`. */
  readonly fields: Map<string, CacheableFieldSchema>;
  readonly owner: OwnerInfo | null;
  /** The default relationship hook, exposed so custom hooks can compose with it. */
  relationship(field: RelationshipFieldSchema, raw: ObjectValue): NormalizedRelationship | undefined;
}

export interface OwnerInfo {
  owner: { type: string; id: string | null };
  field: RelationshipFieldSchema;
}

export interface TypeHints {
  type?: string | null;
  raw?: unknown;
  /** key holding a discriminator on `raw`, defaults to `'type'` */
  typeKey?: string;
  /** the top-level key the resource(s) were found under, e.g. `'users'` */
  payloadKey?: string | null;
  owner?: OwnerInfo | null;
}
```

The hooks compose through the context: a layout that writes only `document()` gets embedded
resources, id references and type inference for free by calling `ctx.resource` / `ctx.embed`.

#### Default `resource` hook

When a layout omits `resource`, the cache applies this behaviour to `raw` (asserted to be a
plain object):

1. `id = String(raw[identity.sourceKey ?? identity.name])`. This is the first consumer of
   `IdentityField.sourceKey` (`warp-drive-packages/core/src/types/schema/fields.ts:334`), which the
   cache currently ignores. For the built-in `json:api` layout `id` is always top-level and
   `sourceKey` is not consulted; this is documented so nobody expects a JSON:API `id` to move.
2. For each relationship field in `ctx.fields` (kinds `belongsTo`, `hasMany`, `resource`,
   `collection`, the same set `isRelationship` gates on at `cache.ts:2040-2043`): call
   `layout.relationship ?? defaultRelationship(field, raw, ctx)` with the value at
   `raw[field.sourceKey ?? field.name]`, and record which raw keys were consumed.
3. `attributes` = `raw` minus the id key, the type key, and consumed relationship keys. Attribute
   keys pass through as-is. No renaming is needed because `getCacheFields` already re-keys the
   cache field map by `sourceKey || name`
   (`warp-drive-packages/core/src/reactive/-private/schema.ts:1223`,
   `core/src/reactive/-private/fields/get-field-key.ts:18`), so `first_name` lands correctly for
   `{ name: 'firstName', sourceKey: 'first_name' }`. Unknown keys are merged exactly as today
   (`cache.ts:2291`).

Relationship keys are emitted under `sourceKey ?? name`. That is how the Graph keys edges
(`warp-drive-packages/core/src/graph/-private/-edge-definition.ts:216`,
`niceMeta.key = meta.sourceKey ?? meta.name`), and how `setupRelationships` looks fields up
(`cache.ts:2024-2036`).

#### Default `relationship` hook

Shape-directed on `v = raw[field.sourceKey ?? field.name]`:

| `v` is | Interpreted as |
| --- | --- |
| `string \| number` | id reference → `{ data: ctx.ref(targetType, v) }` |
| `Array<string \| number>` | id references |
| `{ id, type }` / `Array<{ id, type }>` with no other keys | identifiers as-is |
| object with any of `data`, `links`, `meta` | JSON:API relationship object as-is |
| any other object / array of objects | embedded → `ctx.embed(targetType, obj, { owner, field })` |
| `null` | `{ data: null }` for to-one, `{ data: [] }` for to-many |
| `undefined` | not present → relationship omitted (JSON:API semantics: untouched) |

`targetType` is `field.type` when the field is not polymorphic; otherwise
`ctx.inferType({ raw: v, owner, typeKey })` where `typeKey` defaults to `` `${key}_type` `` for
scalar references (`commentable_id` + `commentable_type`) and `'type'` for embedded objects.

Polymorphism needs no layout involvement beyond producing a *concrete* type: the Graph already
resolves a concrete resource against an abstract `field.type` via the implementer's `options.as`
(`fields.ts:1103,1113`). In DEBUG the cache asserts the inferred type `hasResource` and, when the
field is polymorphic, that it satisfies the abstract type via a trait or `as`.

#### Type inference chain (`ctx.inferType`)

First hit wins:

1. `hints.type` when a string.
2. `raw[hints.typeKey ?? 'type']` when a string and `schema.hasResource` after normalization.
3. `owner.field.type` when the owner field is not polymorphic.
4. `hints.payloadKey` when `schema.hasResource(payloadKey)`.
5. Primary data only: `request.records[0].type` (set by every `findRecord` and save builder,
   `request.ts:145,261,310,354`), then `cacheOptions.types` when it has exactly one entry.
6. Assert, listing the hints tried.

`@warp-drive/core` has no `singularize` / `dasherize` (those live in `@warp-drive/utilities`), so
the core chain does not munge strings. A layout that needs `users` → `user` does that itself in
`document()` before calling `ctx.resource('user', …)`, or supplies `type` explicitly. The
follow-up REST layout in utilities will do this munging.

#### Non-goals of the concept

* No serialization direction. Request bodies are built by builders and handlers today; a later
  RFC may add `Layout.serializeResource?` symmetric to `resource`. The type is left open for it.
* No id-less resources. `putOne` keeps asserting a non-empty `id` (`cache.ts:2089-2092`). Layouts
  may synthesize ids, the cache does not grow an id-less mode.
* Hooks are synchronous and see the full `content`.

### Part 2: registration on the `SchemaService`

Add three **optional** methods to the `SchemaService` interface
(`warp-drive-packages/core/src/types/schema/schema-service.ts:92`), following the precedent of
`cacheFields?` whose consumer falls back when the method is absent (`cache.ts:2460-2476`):

```ts
/**
 * Register a Layout for use by the cache when normalizing responses.
 * Asserts that no layout with the same name is already registered.
 * @public
 */
registerLayout?(layout: Layout): void;

/**
 * Retrieve a registered Layout by name.
 * @public
 */
layout?(name: string): Layout | undefined;

/**
 * All registered Layouts in registration order. Used for content
 * negotiation via `Layout.match`.
 * @public
 */
layouts?(): ReadonlyArray<Layout>;
```

Implementation:

* `warp-drive-packages/core/src/reactive/-private/schema.ts` (`class SchemaService`, `:698`):
  `_layouts: Map<string, Layout>` and a memoized `_layoutList`, initialized in the constructor,
  with `registerLayout` mirroring `registerTransformation` (`:1014`).
* `DelegatingSchemaService` (`warp-drive-packages/legacy/src/model/migration-support.ts:577`)
  forwards all three to `_preferred`, returning `undefined` / `[]` when absent, the same shape as
  its `CAUTION_MEGA_DANGER_ZONE_hasExtension` forwarding.
* `tests/json-api/tests/utils/schema.ts` `TestSchema` gains the same three methods so cache tests
  can register layouts.
* The legacy `Model`-backed schema provider does not implement them; legacy apps use serializers.

Core does **not** pre-register a `json:api` layout object. The name `'json:api'` is reserved and
handled by name in resolution (Part 3), so `@warp-drive/core` takes no dependency on
`@warp-drive/json-api`. `@warp-drive/json-api` exports a `JSONAPILayout` object (identity
`document`, `validate: true`) from a new `@warp-drive/json-api/layouts` subpath for tests and for
apps that want a value to hand around.

Why the `SchemaService` and not a cache constructor option:

* Every layout needs the schema (identity field, cache fields, `hasResource` for inference). The
  cache already reaches it through `capabilities.schema` (`cache.ts:2095`, `:2464`), so no new
  plumbing is needed.
* It is the existing registry pattern for concepts (`transformation`, `derivation`, `hashFn`),
  so users learn nothing new and it sits next to `registerResources`.
* Any `Cache` implementation can honour layouts, not only `JSONAPICache`.
* Optional methods keep third-party `SchemaService` implementations valid: the cache takes its
  fast path when they are absent.

### Part 3: selecting a layout for a response

`CacheOptions` (`warp-drive-packages/core/src/types/request.ts:68`) gains one member:

```ts
/**
 * The name of a Layout registered on the SchemaService to use when the
 * cache ingests this request's response. `'json:api'` forces the built-in
 * behavior and disables content negotiation. When omitted, registered
 * layouts are consulted via `Layout.match`, then `'json:api'` is used.
 */
layout?: string;
```

Resolution is performed **inside** `Cache.put` and `Cache.didCommit` (so the `Cache` interface
stays pluggable and `CacheHandler` is untouched) by `resolveLayout(capabilities, doc)`:

1. If `schema.layout` or `schema.layouts` is absent → `null` (fast path; identical to today).
2. If `doc.request?.cacheOptions?.layout` is `'json:api'` → `null`. If it is any other string →
   `schema.layout(name)`, asserting it is registered. An explicit name always wins; `match` is
   not consulted.
3. If `doc.request` is absent → `null`. A bare `store.push` / `cache.put({ content })`
   (`store-service.ts:2317`) is by definition the caller handing the cache canonical data, and
   content negotiation is a property of a request/response pair.
4. Otherwise the first registered layout whose `match(doc)` returns `true`; else `null`.

`null` means "run today's code path"; no allocation, no extra calls.

How the pieces of the request pipeline participate:

* **Builders** set `cacheOptions.layout` at request time. `extractCacheOptions`
  (`warp-drive-packages/utilities/src/-private/builder-utils.ts:17`) already forwards user-supplied
  `cacheOptions`, so `findRecord('post', '1', { layout: 'blog-rest' })` works with no builder change.
  Defaulting the REST / ActiveRecord builders to a layout is a follow-up.
* **Handlers** cannot change `cacheOptions` after the `CacheHandler` has the request: it runs
  first and the request is deep-frozen in DEBUG. Handlers participate two ways: keep rewriting
  `content` into JSON:API as today (the identity path consumes it), or influence `match` through
  the response, e.g. `context.setResponse(new Response(body, { headers: { 'content-type': … } }))`.
* **Error documents**: `put(error)` (`cache-handler/handler.ts:340-343`) also resolves a layout;
  `layout.document(errorDoc, ctx)` receives `ctx.isError = true` and returns the `{ errors }`
  form. `fromStructuredError`'s fallbacks (`cache.ts:2215-2218`) still apply when the layout returns
  no `errors`.
* **Replay from persisted storage** (`@warp-drive/experiments`): persisted documents are already
  canonical because `putDocument` stores `peekRequest(identifier)` whose `content` was replaced at
  `cache.ts:371`. The data-worker cache handler
  (`warp-drive-packages/experiments/src/data-worker/cache-handler.ts:47`) must force
  `cacheOptions.layout = 'json:api'` on the replayed request. Today `safeDocumentHydrate`
  (`experiments/src/document-storage/index.ts:364`) rebuilds a native `Request`, silently dropping
  `cacheOptions` (including `key`); fixing that latent bug makes the forced layout mandatory, so
  both ship together.

In DEBUG the cache warns when more than one registered layout matches the same document.

### Part 4: named document entries

The canonical document gains an optional `entries` member.

```ts
// warp-drive-packages/core/src/types/spec/document.ts
export interface SingleResourceDataDocument<T = PersistedResourceKey, R = PersistedResourceKey> {
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: T | null;
  included?: R[];
  /**
   * Additional named resource sets carried by the document besides `data`.
   * Membership and order are preserved per entry, exactly as for `data`.
   */
  entries?: Record<string, T | T[] | null>;
}
// CollectionResourceDataDocument gains the same member.
```

The raw `Document` base in `json-api-raw.ts:336` gains the same optional `entries` with
`ExistingResourceObject` values so that `cache.put` accepts it. A document with no natural primary
uses `data: null` plus `entries` (see Unresolved questions for the alternative of a fourth union
member).

#### Cache changes for entries

* `put`: after the `included` loop and before `data`, iterate `entries`, pushing each resource
  through `putOne` and producing `Record<string, PersistedResourceKey | PersistedResourceKey[] | null>`.
  `_putDocument` gains an `entries` parameter and copies it onto the stored `ResourceDocument`.
* `isMetaDocument` (`warp-drive-packages/json-api/src/-private/validator/utils.ts:580-590`) must
  also require `!('entries' in content)`; otherwise an entries-only document with `meta` is
  classified as a meta document and its entries are silently dropped at `cache.ts:220`.
* `AddToDocumentOperation` and `RemoveFromDocumentOperation`
  (`warp-drive-packages/core/src/types/cache/operations.ts:163`, `:231`) widen `field` from
  `'data' | 'included'` to `'data' | 'included' | (string & {})`. `addResourceToDocument`
  (`cache.ts:1598`) and `removeResourceFromDocument` (`:1672`) operate on
  `content.entries[field]` for any other name and notify `'updated'` as the `data` path does.
* `validateDocumentFields` (`json-api/src/-private/validate-document-fields.ts:15`) and the
  full-linkage validator (`validator/1.1/7.4_full-linkage.ts`) walk `entries` as well as `data`
  and `included`. The top-level-members validator (`7.1_top-level-document-members.ts:5`) accepts
  `entries` only when validating a layout's normalized output (`validate: true`); raw JSON:API
  input never contains it and continues to be rejected for unknown members.
* Type-based invalidation: the default `CachePolicy` learns types only from `cacheOptions.types`
  and `request.records` (`core/src/store/-private/default-cache-policy.ts:658-692`), never from
  the document. Guidance: list every entry's type in `cacheOptions.types`. Automatic derivation
  is an unresolved question.

#### Reactive exposure

`ReactiveDocument` gates are defined once on a shared prototype with `configurable: false`
(`warp-drive-packages/core/src/reactive/-private/document.ts:389-457`,
`core/src/signals/reactivity/signal.ts:245-248`), and the document instance is created before any
cache content is consulted (`instance-cache.ts:218-225`). Per-entry gates such as
`document.users` are therefore not viable: names are unknown at construction and could change on
refetch. Instead:

* One new static gate, `entries`, returning a lazily built frozen object. For each entry:
  `Key[]` → `recordArrayManager.getCollection({ source, requestKey, entry: name })`;
  `Key` → `store.peekRecord(key)`; `null` → `null`. Uncached documents (no `RequestKey`) use the
  anonymous `getCollection({ source })` path exactly as `data` does at `document.ts:422-424`.
* The `'updated'` subscription (`:479-495`) also notifies the `entries` signal; `toJSON` (`:341`)
  includes `entries`.
* Typing: a fifth generic on `ReactiveDataDocument` / `ReactiveDocument` / `ReactiveDocumentBase`,
  `EN extends Record<string, unknown> = Record<string, never>`, applied through a
  `DocumentEntries<EN>` conditional modelled on `DocumentMeta<M>` (`document.ts:124-150`) so that
  `entries` is optional at the default and required once narrowed. The new parameter goes last,
  is threaded through `fetch` / `next` / `prev` / `first` / `last`, and gets a
  `withReactiveResponse` overload in `warp-drive-packages/core/src/request.ts:74`.

```ts
type Dashboard = { users: User[]; posts: Post[] };
const { content } = await store.request(
  withReactiveResponse<null, DashboardMeta, object, DashboardMeta, Dashboard>({
    url: '/dashboard',
    cacheOptions: { layout: 'dashboard', types: ['user', 'post'] },
  })
);
content.entries.users; // reactive collection of User, resyncs on refetch
content.entries.posts; // reactive collection of Post
content.meta;
```

#### `RecordArrayManager` changes

`_keyedArrays` is a `Map<lid, ReactiveResourceArray>` — one collection per request document
(`warp-drive-packages/core/src/store/-private/managers/record-array-manager.ts:147`, `:287-336`).

* The key becomes `lid` for `data` and `` `${lid}\0${entry}` `` for entries;
  `RequestCollectionInit` and `createRequestCollection`'s `options` gain `entry?: string`.
* `_syncArray` (`:216-248`) reads `doc.entries[entry]` when `entry` is set instead of `doc.data`.
* The `'document'` subscription (`:174-182`) dirties every array registered for that `lid`
  (add `_arraysByLid: Map<lid, Set<array>>`), not just one.
* Pre-existing gap, called out because entries multiply it: nothing deletes from `_keyedArrays`
  in `clear()` / `destroy()` (`:502-525`, `destroy` at `:518`), so destroyed request collections are still returned for
  the same `lid` after `unloadAll`. Fixing that is in scope for the implementation PR.

#### Persistence and worker

`@warp-drive/experiments` `document-storage/index.ts`: `docHasData` (`:383`), `_getResources`
(`:220-243`) and `getDocument` (`:146-195`) walk `entries` alongside `data` and `included`;
`data-worker/cache-handler.ts` `maybeUpdateObjects` (`:87-101`) inlines entries. No storage
version bump is needed: the change is additive and old files simply lack `entries`.

### Part 5: cache ingestion changes in `@warp-drive/json-api`

New internal modules `warp-drive-packages/json-api/src/-private/layouts/{json-api.ts, resolve.ts, normalize.ts}`
and a public subpath `warp-drive-packages/json-api/src/layouts.ts` re-exporting `JSONAPILayout`,
`JSON_API_LAYOUT`, and `embedded(raw, type?)` / `isEmbedded(value)` helpers.

The implementation strategy is **normalize-then-feed**: produce a canonical document and let the
existing `put` body run unchanged, rather than rewriting `put` to consume normalized entries
directly.

```ts
put(doc: StructuredDocument<ResourceDocument>): ResourceDocument {
  const layout = resolveLayout(this._capabilities, doc);
  if (layout) {
    // in-place replacement, matching the existing practice at _putDocument (:371)
    doc.content = normalizeDocument(layout, doc, this._capabilities) as ResourceDocument;
  }
  if (DEBUG) {
    if (!layout || layout.validate) validateDocument(this._capabilities, doc);
  }
  if (isErrorDocument(doc)) { /* unchanged */ }
  else if (isMetaDocument(doc)) { /* unchanged */ }
  // … existing body from :224 onward, plus the entries loop from Part 4 …
}
```

Why normalize-then-feed: `put` already relies on canonical content at several points (the
`LOG_CACHE` type-count walk `:233-282`, `validateDocumentFields` `:230`, the in-place
`included[i] = putOne(…)` replacement `:284-288`, `fromBaseDocument` reading `content.links` and
`content.meta` `:2198-2205`). Each would need forking otherwise. The fast path is trivially
zero-cost: when `resolveLayout` returns `null`, not one line of the existing path changes. The
cost is one canonical-document allocation per custom-layout `put`, paid only by opt-in users.

A generic `put<T>(doc: StructuredDocument<T>): ResourceDocument` overload is added to the class
(the `Cache` interface already declares it, `warp-drive-packages/core/src/types/cache.ts:116`).

#### `normalizeDocument(layout, doc, capabilities)`

1. Build the `LayoutContext`; call `layout.document(doc, ctx)`. In DEBUG assert the result is a
   plain object.
2. Copy `meta`, `links`, `errors` only when present (`'meta' in nd`). Never assign `undefined`:
   `isMetaDocument` tests key presence, so this rule is what keeps meta-only documents classified
   correctly.
3. Normalize `data` first (single / array / null), then `entries`, then `included`. Primary
   resources are seeded into the dedupe map before any hoisting.
4. Hoisting: walking each resource's `relationships[*].data`, every `EmbeddedResource` marker is
   normalized (via `ctx.embed` → `layout.resource ?? default`), appended to `included`
   **post-order** (children before parents, matching today's "included before data" ordering),
   and replaced in the parent with `{ type, id, lid? }`. The Graph upgrades those identifiers as
   it does today (`core/src/graph/-private/operations/update-relationship.ts:54,65`).
5. Dedupe key is `lid` when present, else `` `${type}\0${id}` ``. A duplicate shallow-merges
   `attributes` and `relationships` into the first occurrence and is not appended again, so
   `included` stays duplicate-free (required by the no-duplicates validator and by
   `addResourceToDocument`'s assertion at `cache.ts:1657-1664`).
6. Cycle guard: `ctx.embed` keeps an in-flight set of raw objects and asserts on re-entry. JSON
   payloads are trees; cycles arise only if a layout returns shared object references.
7. Normalization is pure with respect to identity: it never touches `CacheKeyManager`. Identity
   is assigned by `putOne` exactly as today; a layout may pass through an explicit `lid`.

#### `didCommit`

At the top of `didCommit` (`cache.ts:877`), resolve and normalize `result` into a local
`payload` with `ctx.committing = keys`, then continue with the existing code reading
`payload.data` (`:883`) and `payload.included` (`:923-928`). `result.content` is **not** mutated:
nothing stores it, and `maybeUpdateUiObjects` consumes the returned `ResourceDataDocument`.
Empty bodies (`204`) skip normalization via a `typeof result.content === 'object'` guard.
Embedded resources in a save response are hoisted and upserted by the existing `included` loop.

Limitation: `commitWasRejected` error extraction happens in the `CacheHandler`, not the cache,
so layouts do not reshape mutation *error* bodies.

#### DEBUG assertions on layout output

All messages name the layout. Asserted: `document()` returned a plain object; every resource has
a non-empty string `type` and `id`; `schema.hasResource(type)`; `attributes` / `relationships`,
when present, are plain objects; every relationship key exists in the type's cache fields and is
a relationship kind (today `setupRelationships` silently ignores unknown keys, `:2027-2029`; for
layout output this becomes an assertion since the layout has `ctx.fields`; the fallback if it
proves too strict for generic layouts is a warning gated on `JSON_API_CACHE_VALIDATION_ERRORS`);
no `Embedded` markers remain after hoisting. Relationship cardinality is already asserted by
`assertValidRelationshipPayload` (`core/src/graph/-private/-utils.ts:44-89`) and is not duplicated.

#### Unchanged surfaces

* `upsert`, resource-level `patch` operations, and `mutate` remain canonical-only entry points.
* The `op === 'findHasMany'` special case (`cache.ts:378-394`) runs on the canonical document.
* Read-back (`peek`, `peekRemoteState`, `getAttr`, `getRelationship`, `ReactiveResource`) is
  untouched.

### Worked examples

#### REST with side-loading and id references

Response to `GET /posts/1`:

```json
{
  "post": { "id": 1, "title": "Hi", "author_id": 7, "comment_ids": [10, 11] },
  "users": [{ "id": 7, "name": "Krystan" }],
  "comments": [
    { "id": 10, "body": "…", "post_id": 1 },
    { "id": 11, "body": "…", "post_id": 1 }
  ]
}
```

Schema — the relationship `sourceKey`s are the whole declaration:

```ts
store.schema.registerResources([
  {
    type: 'post',
    identity: { kind: '@id', name: 'id' },
    fields: [
      { kind: 'field', name: 'title' },
      { kind: 'resource', name: 'author', type: 'user', sourceKey: 'author_id', options: { inverse: null } },
      { kind: 'collection', name: 'comments', type: 'comment', sourceKey: 'comment_ids', options: { inverse: 'post' } },
    ],
  },
  { type: 'user', identity: { kind: '@id', name: 'id' }, fields: [{ kind: 'field', name: 'name' }] },
  {
    type: 'comment',
    identity: { kind: '@id', name: 'id' },
    fields: [
      { kind: 'field', name: 'body' },
      { kind: 'resource', name: 'post', type: 'post', sourceKey: 'post_id', options: { inverse: 'comments' } },
    ],
  },
]);
```

Layout — only `document()` is written; resources and relationships use the defaults:

```ts
import { Type } from '@warp-drive/core/types/symbols';
import type { Layout } from '@warp-drive/core/types/schema/concepts';

const BlogLayout: Layout = {
  [Type]: 'blog-rest',
  match: (doc) =>
    typeof doc.request.url === 'string' &&
    doc.request.url.startsWith('/api/blog') &&
    doc.response?.headers.get('content-type')?.includes('application/json') === true,
  document(doc, ctx) {
    const { post, users = [], comments = [], meta } = doc.content as BlogPayload;
    return {
      data: ctx.resource('post', post),
      included: [
        ...users.map((u) => ctx.resource('user', u)),
        ...comments.map((c) => ctx.resource('comment', c)),
      ],
      meta,
    };
  },
};
store.schema.registerLayout(BlogLayout);
```

Request:

```ts
import { findRecord } from '@warp-drive/utilities/rest';

const { content } = await store.request(findRecord<Post>('post', '1', { layout: 'blog-rest' }));
content.data.title; // 'Hi'
content.data.author.name; // 'Krystan' — resolved through the Graph from the id reference
content.data.comments.length; // 2
```

What the cache consumed after normalization:

```json
{
  "data": {
    "type": "post", "id": "1",
    "attributes": { "title": "Hi" },
    "relationships": {
      "author_id": { "data": { "type": "user", "id": "7" } },
      "comment_ids": { "data": [{ "type": "comment", "id": "10" }, { "type": "comment", "id": "11" }] }
    }
  },
  "included": [
    { "type": "user", "id": "7", "attributes": { "name": "Krystan" } },
    { "type": "comment", "id": "10", "attributes": { "body": "…" }, "relationships": { "post_id": { "data": { "type": "post", "id": "1" } } } },
    { "type": "comment", "id": "11", "attributes": { "body": "…" }, "relationships": { "post_id": { "data": { "type": "post", "id": "1" } } } }
  ]
}
```

Relationship keys are the source keys, consistent with the source-key-keyed cache field map;
`id`, `author_id` and `comment_ids` were stripped from `attributes`.

#### Embedded resources

Response to `GET /orders/9`:

```json
{ "id": 9, "total": 42, "customer": { "id": 3, "name": "Ada" }, "lines": [{ "id": 1, "qty": 2 }, { "id": 2, "qty": 1 }] }
```

With `customer` and `lines` declared as relationship fields (no `sourceKey` needed since the API
keys match the field names), the default hooks see objects rather than scalars and embed them.
The normalized output is `data: order(9)` with `included: [customer(3), line(1), line(2)]` and
relationship data replaced by identifiers. A layout with a custom `relationship` hook can call
`ctx.embed('customer', raw.customer, { owner, field })` directly when it needs to override the
inferred type.

#### Multi-entry document

Response to `GET /dashboard`:

```json
{ "users": [ …user objects… ], "posts": [ …post objects… ], "meta": { "generatedAt": "…" } }
```

```ts
const DashboardLayout: Layout = {
  [Type]: 'dashboard',
  document(doc, ctx) {
    const { users, posts, meta } = doc.content as DashboardPayload;
    return {
      data: null,
      entries: {
        users: users.map((u) => ctx.resource('user', u)),
        posts: posts.map((p) => ctx.resource('post', p)),
      },
      meta,
    };
  },
};
```

The cached document is `{ lid, data: null, entries: { users: Key[], posts: Key[] }, meta }`.
`content.entries.users` is a request collection keyed by `lid + 'users'`; refetching the same
URL upserts the resources and resyncs both collections in place. Patching the document with
`{ op: 'add', record: requestKey, field: 'users', value: key }` appends to the entry.

## How we teach this

* New guide page `guides/the-manual/caching/layouts.md`: what a layout is, when to reach for one
  versus a handler, the three hooks, the default resource / relationship behaviour and how it
  leans on `sourceKey`, selection order, named entries. Registered in
  `guides/the-manual/caching/_meta.json`.
* `guides/the-manual/requests/handlers.md` is updated so that response reshaping points at
  layouts first and shows a handler only for cases layouts cannot express (streaming, mutating
  the request).
* `guides/the-manual/caching/index.md:106` ("The Cache expects that the data within `content` …
  is in a format that it understands") gains a sentence about layouts.
* Every new type and method carries `@public` TSDoc per
  `guides/contributing/writing-documentation/writing-api-docs.md`; `Layout` appears alongside
  `Transformation`, `Derivation` and `HashFn` in the concepts docs.
* `@warp-drive/memory-alpha` gains a consumer skill row for "ingest a non-JSON:API response" once
  the feature ships.

## Drawbacks

* One extra canonical-document allocation per custom-layout `put` / `didCommit`, plus an
  `O(layouts with match)` scan per put when negotiation is in play. Zero cost when no layouts are
  registered or the request names `'json:api'`.
* `entries` widens the canonical document, the `Cache` interface's document types, the reactive
  document surface, the record-array manager and the persisted storage format. It is additive
  everywhere but it is a permanent widening.
* The JSON:API 1.1 validator, when enabled for a layout, reports positions in the *normalized*
  content rather than the wire payload.
* The DEBUG assertion on unknown relationship keys is stricter than today's silent ignore for
  layout output; generic layouts may need the gated-warning fallback.
* Duplicate-merge semantics for a resource embedded more than once are shallow.

## Alternatives

* **Status quo: whole-document handler transforms.** Works, but is not schema-aware, is
  per-request, misses `didCommit` easily, and cannot express multi-entry documents.
* **Register layouts on the `JSONAPICache` constructor.** Keeps core untouched but ties layouts to
  one cache implementation, needs new store wiring to pass options to `createCache`, and
  separates layouts from the schema they depend on.
* **Synthesized document resource instead of `entries`.** A layout could emit a primary resource
  (e.g. type `dashboard`, id = request `lid`) whose relationship fields point at each entry
  collection. It has zero blast radius (no `ResourceDocument` change, `document.data.users`
  works through the Graph) but pollutes the schema with artificial resource types and couples
  document membership to relationship semantics. It remains expressible on top of this RFC for
  apps that prefer it.
* **A `[Canonical]` brand on `doc.content` for replay idempotency.** Dropped by `structuredClone`
  and JSON persistence, so it cannot survive the very path it protects. Explicit
  `layout: 'json:api'` forcing was chosen instead.
* **Structural detection of already-canonical content.** Heuristic and wrong for REST APIs that
  happen to use a `data` envelope.
* **Per-entry reactive gates (`document.users`).** Rejected because gates are prototype-level and
  non-configurable and entry names are unknown at document construction; a single `entries` gate
  avoids the "names changed on refetch" problem.

## Unresolved questions

1. **Per-`ResourceSchema.layout` override.** Should `PolarisResourceSchema` / `LegacyResourceSchema`
   gain `layout?: string` so `ctx.resource(type, raw)` dispatches to a type-specific `resource`
   hook? Cheap to add later since `ctx.resource` is the single dispatch point.
2. **`store.push(content, { layout })`.** `push` has no request and is therefore always canonical.
   Do we want an options bag that synthesizes `{ request: { cacheOptions: { layout } } }`?
3. **Default layout.** Resolution is explicit → `match` → `'json:api'`. An app wanting "everything
   is REST" registers a layout with `match: () => true`. Is an explicit `schema.setDefaultLayout`
   warranted, or is that one method too many?
4. **Entries-only documents.** `data: null` plus `entries` versus a fourth `ResourceDocument` union
   member (`EntriesResourceDataDocument`) with no `data` at all. The former keeps `ReactiveDataDocument`
   generics simpler; the latter is more honest.
5. **Notification granularity.** Document `'updated'` is document-wide, so a patch to one entry
   dirties every entry collection for that `lid`. Should `notifyChange`'s third argument carry the
   entry name so `RecordArrayManager` can dirty only the affected array?
6. **Automatic `cacheOptions.types`.** Should the `CacheHandler` or default `CachePolicy` derive
   invalidation types from the keys in `data` and `entries`, or remain purely declarative?
7. **`match` ordering.** Registration order plus a DEBUG warning on multiple matches, or an
   explicit `priority?: number`?
8. **Relationship keys under `sourceKey`.** The Graph keys edges by `sourceKey ?? name` and
   `ManyArrayManager` carries `FIXME field needs to use sourceKey` notes
   (`core/src/reactive/-private/fields/many-array-manager.ts:36,62`). Confirm end-to-end before
   locking the "relationships keyed by source key" contract.
9. **Follow-ups explicitly out of scope here:** a declarative `defineLayout({ … })` helper;
   built-in `RESTLayout` / `ActiveRecordLayout` in `@warp-drive/utilities` (including
   `singularize` / `dasherize` type munging and `{ errors: { field: [msg] } }` → `ApiError[]`);
   REST / ActiveRecord builders defaulting `cacheOptions.layout`; `Layout.serializeResource` for
   the request-body direction; id-less resources.

## Implementation sequencing (informative)

1. Core: `Layout` and normalized types, `Embedded` symbol, `CacheOptions.layout`, `entries` on
   the document types, `SchemaService` interface methods.
2. Core: reactive `SchemaService` implementation; legacy `DelegatingSchemaService` forwarding;
   `TestSchema` in the json-api test app.
3. json-api: `layouts/` modules (resolve, normalize, default hooks, identity layout), `put` and
   `didCommit` wiring, validator classification update, DEBUG assertions.
4. Named entries: cache `put` / `_putDocument` / document patch operations; `ReactiveDocument`
   `entries` gate and generics; `RecordArrayManager` entry keying, fan-out and the `_keyedArrays`
   cleanup gap.
5. Experiments: persistence and worker walk `entries`; replay forces `'json:api'`;
   `safeDocumentHydrate` preserves `cacheOptions`.
6. Tests in `tests/json-api/tests/integration/cache/` as `layout-*-test.ts`: fast-path regression
   (no hooks invoked when unregistered or forced to `'json:api'`), side-loading, embedded ordering
   / dedupe / cycle assertion, id references, polymorphic embedded, entries with patch operations
   and reactive resync, error and meta documents, `didCommit` with a REST-shaped save response,
   replay idempotency, validation assertions. Registry tests in `tests/warp-drive__schema`;
   storage tests in `tests/experiments`.
7. Guides and API docs.
