---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/guides/the-manual/relational-data/spec.md
description: >-
  The normative rules for relationship payloads, what each relationship field
  kind requires of the API, how values and mutation behave, and how the rules
  are enforced.
---

# Relationship Specification

This page is the normative reference for how WarpDrive relationships behave: what a relationship
payload may contain, what each field kind requires of the API, and how those requirements are
enforced. The words **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

The rest of the [Relational Data guide](./index.md) explains these rules with examples; this page
only states them.

## 1. Terms

* **Relationship payload** — the value of a key inside a resource's `relationships` member:
  `{ data?, links?, meta? }`.
* **Linkage** — a `{ type, id }` resource identifier inside `data`.
* **Included** — a linkage is *included* in a document when a resource object with the same
  `type` and `id` appears in that document's `data` or `included` members.
* **Strict kinds** — the `resource` and `collection` field kinds.
* **Legacy kinds** — the `belongsTo` and `hasMany` field kinds.
* **Remote state** — the membership, `links` and `meta` last received from the API.
* **Local state** — the membership including unsaved mutations.

## 2. Payload Shape

| Rule | Statement |
| --- | --- |
| 2.1 | A relationship payload MUST be an object. It MAY contain any of `data`, `links` and `meta`. |
| 2.2 | For a `resource` or `belongsTo` field, `data` MUST be a single linkage or `null`. |
| 2.3 | For a `collection` or `hasMany` field, `data` MUST be an array of linkages (possibly empty). |
| 2.4 | `data: null` (resource) and `data: []` (collection) mean the relationship is **known to be empty**. An absent `data` member means the membership is **unknown**; it never means empty. |
| 2.5 | Each of `data`, `links` and `meta`, when present, replaces the previous value of that member in the cache. An absent member leaves the cached value untouched. |
| 2.6 | Pagination links (`first`, `last`, `prev`, `next`) MAY appear in `links` and are exposed on the document, but relationship membership is never paginated: `data` is always the complete membership. |

## 3. Rules For `resource` And `collection` Relationships

These rules apply to the strict kinds only. They are what make the kinds safe to materialize
eagerly and without autofetch.

### 3.1 Full inclusion

| Rule | Statement |
| --- | --- |
| 3.1.1 | Every linkage in a strict relationship's `data` MUST be included in the same document. |
| 3.1.2 | Materializing a strict relationship whose `data` references a resource with no data in the cache is an error. |

### 3.2 `async: true`

| Rule | Statement |
| --- | --- |
| 3.2.1 | Every payload for the relationship MUST provide a `links` object containing a `related` link. |
| 3.2.2 | `data` MAY be omitted. When present, rule 3.1 applies. |
| 3.2.3 | The related data is never fetched automatically. `doc.fetch()` requests the `related` link (or `self` when there is no `related` link), caches the response as a request document keyed by `doc.identifier`, writes the response's `data` into the relationship's remote state, and resolves with the relationship document itself. |

### 3.3 `async: false` (the default)

| Rule | Statement |
| --- | --- |
| 3.3.1 | Whenever the relationship is present in a payload, its `data` member MUST be present. Links-only and meta-only payloads are invalid. |
| 3.3.2 | Rule 3.1 applies: every linkage MUST be included. |
| 3.3.3 | The relationship SHOULD NOT provide `links`. Sync relationships are fully included, so links are never needed to load them. |

### 3.4 Enforcement

| Rule | JSON:API validator | Graph | Runtime |
| --- | --- | --- | --- |
| 3.1.1 | error | — | — |
| 3.1.2 | — | — | throws on access to `data` |
| 3.2.1 | error | assertion (dev builds) on every payload | — |
| 3.3.1 | error | — | — |
| 3.3.3 | warning by default; error when `strict.syncRelationshipLinks` is `true` | — | — |
| 2.2, 2.3 | error | assertion (dev builds) | — |

The validator runs in development builds when the `JSON_API_CACHE_VALIDATION_ERRORS` feature is
active (or `LOG_CACHE` is enabled) and reports on documents received through requests. Graph
assertions run in development builds for every payload, including `store.push`. Runtime errors are
thrown in every build.

## 4. Rules For `belongsTo` And `hasMany` Relationships

The legacy kinds exist for apps migrating from `@warp-drive/legacy/model` and keep that library's
behavior:

| Rule | Statement |
| --- | --- |
| 4.1 | `options.async` and `options.inverse` MUST be declared explicitly. |
| 4.2 | `async: true` relationships are wrapped in promise proxies and fetch on access through the configured adapter, or through the `related` link in [LinksMode](./features/links-mode.md). |
| 4.3 | `async: false` relationships MAY reference resources that are not included; WarpDrive materializes an empty record for them. In LinksMode the stricter LinksMode rules apply instead. |
| 4.4 | Payloads MAY carry `links` regardless of `async`. |
| 4.5 | A remote update resets local changes unless `options.resetOnRemoteUpdate` is `false` or the field is in LinksMode. |

Rules 2.x apply to the legacy kinds as well.

## 5. Values And Mutation

| Rule | Statement |
| --- | --- |
| 5.1 | The value of a strict relationship field is a `ReactiveRelationshipDocument` exposing `data`, `links`, `meta`, `identifier` and `fetch()`. `identifier` is the request key for the relationship's `related` (or `self`) link, or `null` when it has neither. Assigning the field itself is an error. |
| 5.2 | `data` MAY be assigned (resource: a record or `null`; collection: an array of records) and, for collections, mutated with the array mutation methods, only when the owning record is editable: any LegacyMode record, or a PolarisMode record returned by `checkout()`. On an immutable record every mutation is an error. |
| 5.3 | A record MUST appear at most once in a collection; adding a duplicate is an error. |
| 5.4 | `links` and `meta` are server-owned: they always reflect remote state and MUST NOT be affected by local mutation. |
| 5.5 | Whether a relationship has local changes not yet confirmed by the API is reported by the cache (`changedRelationships`), not by the document. |
| 5.6 | Immutable PolarisMode records render remote state; editable records render local state. Inverses follow the same rule. |
| 5.7 | Local state becomes remote state when a payload confirming it is received (typically the save response). A save response that omits the relationship leaves its local state unconfirmed. `commit()` promotes the local state of every changed relationship to remote state. |
| 5.8 | When serializing a relationship for a request, only the identifiers of `data` are sent. `links` and `meta` MUST NOT be echoed back to the API. |

## 6. Size Guard

| Rule | Statement |
| --- | --- |
| 6.1 | When `Store.maxCollectionRelationshipSize` is a number, any remote payload for a `collection` field whose `data` array is longer than that number causes an error to be thrown asynchronously after the payload has been applied. |
| 6.2 | The guard counts members in a single payload. It does not apply to legacy `hasMany` fields, to `resource` fields, or to local mutations. |
| 6.3 | Lists that need pagination, sorting or filtering SHOULD be loaded with [top-level requests](./advanced/pagination.md) rather than through a relationship. |
