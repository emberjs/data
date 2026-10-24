---
url: /pr-preview/pr-11087/rfcs/0003-warp-drive-aql.md
---

# AQL: An Abstract Query Language and Persisted-Query Extension for JSON:API&#x20;

## Summary

AQL is a terse `.aql` text syntax that compiles to the persisted-query envelope defined by the
(proposed) JSON:API [`QUERY` extension](https://jsonapi.org/format/1.2/#extension-rules) —
`q:id` / `q:type` / `q:search`, extended here with `q:defaults`, `q:headers`, and `q:entries`. It
gives WarpDrive apps (and, by design, any JSON:API-flavored backend) a client-authorable query
language covering field/relationship selection, a filter operator vocabulary aligned with the
`filter[field][operator]=value` convention already common across production JSON:API APIs, request
headers, persisted-query variables, and batching several unrelated root queries into one document.
This RFC specifies the language and its compiled output as a design proposal, ahead of any
implementation — see [Tooling](#tooling) for the parser, editor, and linting work this RFC's
acceptance would unblock.

## Motivation

### The problem

1. **Hand-authoring JSON:API query bodies is verbose and typo-prone.** Sparse fieldsets and
   `include` paths are easy to get subtly wrong (a misspelled field name, a forgotten nested
   include) with no compile-time feedback, and the JSON is noisy to write by hand for anything
   beyond a trivial query.
2. **Base JSON:API has no filter syntax, and every backend invents its own.** This is by design
   in the base spec (filtering is left to server implementations), but it means there's no
   portable way to *express* a filter that a client-side tool — a query language, a schema-aware
   editor, a codegen step — can reason about across backends, even though a large fraction of
   real JSON:API-flavored backends converge on some variant of
   `?filter[field][operator]=value`.
3. **Persisted queries need somewhere to put variables and request metadata that isn't query
   content.** A reusable, cacheable query needs a way to declare "this value is supplied per
   call" (variables) and "this header is required" — neither of which is JSON:API document
   content, so neither has anywhere to live in a plain `q:search` body.
4. **Screens routinely need several unrelated resources at once.** A dashboard's "current user +
   notifications + billing status" is three independent root queries, not a graph traversal from
   any one of them — the kind of batching GraphQL handles natively that JSON:API's
   one-collection-URL-per-request model has no answer for.
5. **Real backends rarely conform 100%.** Different filter param names, no `include` support, no
   batch endpoint, non-JSON:API response shapes — all common, all needing translation somewhere.
   Today that translation is ad hoc, scattered glue code with no name and no shared shape.

### Why a language, not just a JSON builder function

A terse text syntax with its own grammar — rather than, say, a fluent JS builder API — is what
makes AQL schema-aware and toolable the way a query needs to be to catch mistakes early: a `.aql`
file can be statically checked against a `Schemas` map (unknown field and relationship names are a
compile error, not a runtime 404 or a silently-empty response), it's diffable and reviewable in a
PR like any other source file, and it's the natural shape for the persisted-query story this RFC
also specifies (a stable, hashable unit of source text is what makes a `q:id` meaningful).

## Detailed design

This section is the complete design specification for review purposes — there is no accompanying
implementation or separate spec document yet; this RFC is that document. If accepted, the
reference implementation should ship a full, executable-grammar reference (EBNF-level detail per
section, kept in sync with the parser rather than with this RFC's prose) alongside the parser
itself — see [Tooling](#tooling).

### Pipeline

```txt
.aql text  →  parse  →  compiled envelope (canonical IR)  →  [adapter]  →  actual HTTP request
```

`.aql` text and the compiled envelope it produces are the two artifacts this RFC specifies. What
sits downstream of the envelope — a request builder, an adapter for a non-conforming backend — is
discussed as design guidance (see [Adapting non-conforming APIs](#adapting-non-conforming-apis)
below) but is explicitly out of scope for what this RFC asks WarpDrive to ship.

### Documents: single-entry and multi-entry

Every `.aql` document is exactly one `QUERY` block, in one of two mutually exclusive shapes,
distinguished by the first token after `QUERY`:

```aql
QUERY <type> { <sections> }              # single-entry: one primary type, one graph
```

```aql
QUERY {
  entry <name>: <type> { <sections> }    # multi-entry: several independent roots
  ...
}
```

A single-entry document's sections (`data`/`filter`/`page`/`headers`) are unambiguous because
there's exactly one primary type they apply to. The moment there's more than one root, every
section needs to know *which* root it belongs to, which is exactly what `entry <name>: <type> {}`
provides — multi-entry isn't a variation on single-entry's grammar, it's a distinct document
shape. `<name>` is the multi-entry equivalent of a GraphQL field alias: how the caller refers to
that entry's result in the response, with no meaning to the server beyond being a response key.

### `data` — field and relationship selection

```aql
data {
  name
  ceo { name; profileImage }   # a relationship followed by {} both selects and includes it
}
```

A bare field name selects an attribute (or a relationship's linkage, without its own fields, if
not followed by `{}`). A relationship followed by `{ <selection> }` recursively selects and
includes it — only fields whose schema `kind` is `resource` or `collection` may take a `{}`
selection; anything else is a compile error. If the same related type is reached through more than
one path, its requested fields merge into one entry and its `include` path is only added once.
Compiles onto `q:search.fields` (type name → field-name array) and `q:search.include` (a dotted
path, or an array of them).

### `filter` — predicates

The core new design in this RFC. A filter is a predicate — `(fieldPath, operator, value)` —
combined with every other filter predicate in the query via AND:

```aql
filter {
  status = "active"                    # bare `=` is shorthand for [eq]
  age[gte] = 18
  age[lt] = 65
  category[in] = ["books", "film"]
  ownerId[isSame] = $user.id
}
```

compiles to:

```json
{
  "filter": {
    "status": { "eq": "active" },
    "age": { "gte": 18, "lt": 65 },
    "category": { "in": ["books", "film"] },
    "ownerId": { "isSame": "$user.id" }
  }
}
```

This is a deliberate choice to make `q:search.filter` mirror the `?filter[field][operator]=value`
convention already common across production JSON:API-flavored backends, rather than invent a new
one — so a server that already parses that convention for `GET` requests can reuse the same logic
for a `QUERY` request's body with no translation layer. The full operator vocabulary — `eq`, `ne`,
`in`, `notIn`, `like`, `iLike`, `notLike`, `notILike`, `gt`, `gte`, `lt`, `lte`, `between`,
`notBetween`, `isNull`, `isNotNull`, `isSame` — along with each operator's arity and expected value
shape, is specified in full in the table below.

| Operator | Arity | Value shape | Meaning |
| --- | --- | --- | --- |
| `eq` | 1 | literal | Equal to (default when `[operator]` omitted) |
| `ne` | 1 | literal | Not equal to |
| `in` | ≥1 | array literal | Equal to one of |
| `notIn` | ≥1 | array literal | Equal to none of |
| `like` | 1 | literal (string) | SQL-style pattern match, case-sensitive |
| `iLike` | 1 | literal (string) | SQL-style pattern match, case-insensitive |
| `notLike` | 1 | literal (string) | Negated `like` |
| `notILike` | 1 | literal (string) | Negated `iLike` |
| `gt` | 1 | literal (number or date) | Greater than |
| `gte` | 1 | literal (number or date) | Greater than or equal to |
| `lt` | 1 | literal (number or date) | Less than |
| `lte` | 1 | literal (number or date) | Less than or equal to |
| `between` | 2 | array literal (2 elements) | Inclusive range |
| `notBetween` | 2 | array literal (2 elements) | Outside an inclusive range |
| `isNull` | 1 | literal (boolean) | `true`: field is null; `false`: is not null |
| `isNotNull` | 1 | literal (boolean) | Negation of `isNull` |
| `isSame` | 1 | reference | See below |

`like`/`iLike`/`notLike`/`notILike` use `%` (zero or more characters) and `_` (exactly one
character) as wildcards, escaped as `\%` / `\_` to match them literally. `between`/`notBetween`
take their two bounds as an array literal of exactly two elements, in order (`[low, high]`),
inclusive on both ends — AQL does not itself validate that the first element isn't greater than
the second; that's a server-side concern, like all other value validation. `isNull`/`isNotNull`
take a boolean, not the value being tested — the field being tested is the field path itself
(`jobId[isNull] = true`, not some encoding of "null" as a value for `eq`).

Two things stand out enough to call out here:

* **`isSame`** compares a field against another field on the same resource, or against a
  `$`-namespaced piece of server-resolved request context (`$user.id`, `$session.tenantId`) —
  AQL emits the reference as a plain string and does no comparison itself; resolution semantics
  are entirely the server's contract.
* **Deep paths** (`team.manager.lastName`) compile to dotted keys unchanged. Whether a server
  supports filtering through a relationship, and what it does about join cardinality or nulls
  along the way, is server-defined and outside AQL's scope.

Deliberately left out: OR/grouped boolean logic (there is no OR in AQL's filter grammar today —
see [Unresolved questions](#unresolved-questions)), filtering a related collection separately from
the primary result set, and a separate `search` parameter.

### `page` — pagination

```aql
page { size = 10 }
```

Flat `key = value`, compiled onto `q:search.page` with no operator — pagination keys (`size`,
`limit`, `offset`, `number`, `cursor`, ...) are opaque to AQL; a server's pagination profile (e.g.
the [cursor pagination profile](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/))
defines which ones are meaningful.

### `headers` — request headers

```aql
headers {
  "Idempotency-Key" = @arg requestId
}
```

compiles to a sibling `q:headers` key, not into `q:search`. HTTP headers describe *how a request is
made* (auth, idempotency, tenant scoping, content negotiation), not JSON:API query content a
server has any defined place for inside the document it parses — merging them into `q:search`
would ask a JSON:API server to reach into its own request object to find data the JSON:API
document format has nowhere to put. A request builder consuming the compiled envelope reads
`q:headers` to set outgoing HTTP headers and never forwards it as document content. Header names
are quoted strings (not bare identifiers) because header names routinely contain `-`; values are
a string or an `@arg` variable — no arrays (a list-like header is still one string) and no
`isSame`-style reference (there's no server-side resolution step for a literal client-sent header
to defer to). A `headers{}` section may only appear at a document's outermost level, never inside
an `entry {}` block — a `.aql` document always compiles to exactly one HTTP request, and one
request has exactly one header set no matter how many entries its body describes.

### `@arg` and `q:defaults` — persisted-query variables

```aql
filter { total[gt] = @arg(number) minTotal = 0 }
```

compiles the value to its `$`-prefixed variable form and records the default separately:

```json
{ "filter": { "total": { "$gt": "number" } } }
```

```json
{ "q:defaults": { "filter": { "total": { "gt": 0 } } } }
```

`@arg` declares a variable a caller supplies at invocation time via `q:args`; the optional
`= default` is recorded under a sibling `q:defaults` object (mirroring `q:search`'s own shape) so
an invocation that omits it still gets a sensible result. `q:defaults` is deliberately outside the
`q:search` object the base `QUERY` extension defines, so a server that doesn't recognize it can
ignore it safely rather than choke on an unrecognized member inside the query it does understand.

### Multi-entry graphs

```json
{
  "q:id": "<sha256>",
  "q:entries": {
    "me": { "q:type": "user", "q:search": { "...": "..." } },
    "notifications": { "q:type": "notification", "q:search": { "...": "..." } }
  },
  "q:headers": { "...": "..." }
}
```

`q:entries` replaces the top-level `q:type`/`q:search` a single-entry envelope has — an envelope
has one or the other, never both — with each entry carrying its own `q:type`/`q:search`/
`q:defaults`, exactly as if compiled standalone. `q:headers`, if present, stays at the very top
(see above for why headers can't be per-entry).

Two design points this RFC resolves and one it explicitly leaves open:

* **Transport.** The base `QUERY` extension defines requests as issued "against the same URL as if
  a `GET` had been made," which presupposes a URL for *a* resource collection — a multi-entry query
  has no such URL, so it needs a dedicated, resource-agnostic endpoint (conceptually closer to a
  single GraphQL endpoint than a REST collection URL). This RFC doesn't mandate a specific path,
  the same way base JSON:API doesn't mandate specific resource paths beyond convention.
* **Response shape.** A multi-entry response wraps one complete, ordinary JSON:API document per
  entry under an `entries` key (`{ "entries": { "<name>": { "data": ..., "included": ... } } }`).
  A server MAY additionally hoist resources shared across entries' `included` arrays into a
  top-level `included`, mirroring how a single document already deduplicates included resources —
  but that's an optimization, not a requirement.
* **Left open**: partial failure semantics (does one bad entry fail the whole request, or does it
  get an error object in its own slot?), cross-entry dependencies (there is no syntax for "fetch
  `notifications` filtered by `me`'s id" — a meaningfully harder feature than batching independent
  queries), and `q:args` name-conflict resolution across entries that happen to declare the same
  variable name. See [Unresolved questions](#unresolved-questions).

### Adapting non-conforming APIs

Most real backends won't implement the `QUERY` extension as specified above. The compiled
envelope is designed to be a stable contract an app-specific **adapter** (the same "builder"
concept WarpDrive's own request builders already use, applied here to AQL's compiled output)
translates into that backend's actual wire format — remapping `filter[field][operator]` into a
different param convention, fanning `include` out into N follow-up requests against a backend with
no compound-document support, or fanning a multi-entry document out into one request per entry
against a backend with no batch endpoint. This keeps one non-conforming backend's quirks contained
to its own adapter instead of leaking into the language or the compiled shape every backend has to
share. This RFC specifies the *pattern*, illustrated below; it does not ask WarpDrive to ship any
adapter implementation.

```ts
// illustrative, not a real API — nothing here exists yet
function remapFilters(filter: Record<string, Record<string, unknown>> | undefined) {
  if (!filter) return undefined;
  const where: Record<string, string> = {};
  for (const [fieldPath, ops] of Object.entries(filter)) {
    for (const [operator, value] of Object.entries(ops)) {
      where[fieldPath] = `${operator}:${Array.isArray(value) ? value.join(',') : value}`;
    }
  }
  return where;
}
```

A backend whose filter params look like `where[field]=operator:value` instead of
`filter[field][operator]=value` needs nothing more than a remap like this one in its adapter — the
compiled envelope itself never changes to accommodate it.

### Current implementation status

Nothing in this RFC is implemented anywhere in WarpDrive today.
[PR #9073](https://github.com/warp-drive-data/warp-drive/pull/9073) ("spec: JSON:API Graphs")
first proposed the `QUERY` extension and an early version of AQL as its authoring syntax, alongside
an unrelated "complex relationships" profile for linkage nested inside `attributes`. A later
exploration ([PR #11087](https://github.com/warp-drive-data/warp-drive/pull/11087)) prototyped a
parser covering `data`/`page`/`@arg` and a VS Code syntax highlighter; that prototype silently
dropped `filter`/`page` output in places, had no string-escape handling, and lost track of open
contexts on certain inputs. Working through those bugs is what surfaced the design gaps this RFC
resolves — the prototype's `filter` covered only flat equality (`q:search.filter.key = value`, no
operator), and it had no `headers` or multi-entry support at all. None of that prototype is
proposed for merge alongside this RFC. If this RFC is accepted, [Tooling](#tooling) below is the
implementation plan.

## How we teach this

If implemented, AQL should be documented at three levels, consistent with how WarpDrive documents
its other experimental packages:

* **Normative reference**: a `spec/` directory alongside the reference parser (e.g.
  `warp-drive-packages/experiments/src/aql/spec/*.md`), one document per grammar section
  (`filter`, `headers`, multi-entry, adapting non-conforming APIs), for contributors and anyone
  implementing a server or an adapter against the compiled envelope. This should be kept in sync
  with the parser, not with this RFC — once an implementation exists, this RFC is a historical
  design record, not the place future grammar changes get made.
* **Package README**: a quick-start for someone reaching for `@warp-drive/experiments/aql`
  directly.
* **The Manual**: reader-facing pages on the docs site's Experiments section, for app authors
  browsing WarpDrive's documentation rather than its source.

AQL extends concepts JSON:API users already have (sparse fieldsets, `include`, filtering) with a
terser syntax and an operator vocabulary modeled on a convention already common in production
JSON:API-flavored backends — someone who has used such a backend's `filter[field][operator]`
convention should find AQL's filter syntax familiar rather than a new mental model to learn. It
should be positioned, and taught, as an **Experiment** (the same "use at your own risk,
PRE-RFC-within-WarpDrive-core" framing every other page under `guides/the-manual/experiments/`
carries) until a request-builder integration exists — this RFC settles the design that
integration would be built against, not the integration itself.

## Tooling

A query language earns its keep on the strength of its tooling, not just its grammar. This section
inventories every tool AQL adoption would eventually want, states a plan or explicit non-plan for
each, and is honest about which ones this RFC does not expect WarpDrive to build well — or at all.
None of this is proposed for merge alongside this RFC; it's the roadmap accepting this RFC would
open up, roughly in the order it becomes buildable.

| Tool | Plan | Depends on |
| --- | --- | --- |
| Reference parser | Build in `@warp-drive/experiments/aql`; everything else below depends on it | This RFC |
| VS Code syntax highlighting | TextMate grammar for `.aql` files and embedded `` aql`...` `` template literals | Reference parser's grammar |
| Other TextMate-based editors (Sublime Text, JetBrains via bundle import) | Ship the same grammar as a standalone TextMate bundle | VS Code grammar |
| Neovim / tree-sitter | Stretch goal; not committed | A from-scratch tree-sitter grammar |
| Language server (diagnostics, completion, go-to-definition) | Planned follow-up, not initial rollout | Reference parser + stable grammar |
| Linting | Expose as diagnostics from the language server; thin CLI wrapper for CI | Language server |
| Formatting | Deferred | Persisted-query-id normalization (see [Unresolved questions](#unresolved-questions)) |
| Embedded template-literal tooling | Mirror the `graphql-tag`/lit-html/styled-components precedent | VS Code grammar, language server |
| Persisted-query build-time extraction | Necessary for production use; not initial rollout | Stable grammar + request-builder integration |
| Type generation / codegen | Aspirational, likely lowest priority | Language server or reference parser |
| Playground / REPL | Nice-to-have for docs and onboarding | Reference parser |
| CI validation CLI | Realistic near-term deliverable | Reference parser + stable grammar |

### Reference parser

The foundation everything else in this table depends on: a TypeScript lexer and recursive-descent
parser compiling `.aql` text to the envelope this RFC specifies, taking a `Schemas` map (WarpDrive's
existing schema representation) so unknown field/relationship names are a compile error. Ship it in
`@warp-drive/experiments/aql`, kept experimental until a request-builder integration exists to
consume its output; graduate it out of experiments once both this RFC's grammar and that
integration have stabilized.

### Syntax highlighting

VS Code is the flagship target: a TextMate grammar for standalone `.aql` files, plus an injection
grammar for `` aql`...` `` tagged template literals embedded in JS/TS/JSX/TSX/Svelte source, the
same pattern `graphql-tag`, lit-html, and styled-components tooling all use for embedding a foreign
language inside a template literal. Publishing that grammar as a standalone TextMate bundle gets
tokenization (not diagnostics) for free in any other TextMate-consuming editor — Sublime Text,
JetBrains IDEs via bundle import.

**Callout**: Neovim and other tree-sitter-based editors need a *separate* grammar — tree-sitter and
TextMate are different formalisms, so nothing here is reusable. That's real, standalone work this
RFC does not commit WarpDrive to; it's a reasonable target for community contribution once the
grammar itself has stopped changing, but not part of the initial rollout.

### Language server, linting, and completion

A schema-aware "unknown field," "duplicate filter assertion," "autocomplete a relationship name
from `Schemas`" experience needs semantic analysis, not just tokenization. The right way to build
that once, rather than N times, is a **Language Server Protocol (LSP)** implementation over the
reference parser and its `Schemas` input — one server, thin clients for VS Code, Neovim's built-in
LSP client, JetBrains via the LSP4IJ plugin, and so on. Linting (duplicate `(fieldPath, operator)`
assertions, empty array literals, reserved header names, `@arg` types that don't match a field's
schema type) should be diagnostics from that same analysis layer, with a thin CLI wrapper
(`aql-lint some/**/*.aql`) for CI, rather than a second, separately-maintained implementation of
the same schema-aware checks.

**Callout**: this is the single biggest lift in this entire table, and this RFC explicitly does not
commit to it as part of an initial rollout. Building rich editor tooling against a language half of
which is still `[spec-only]` (see [Detailed design](#detailed-design)) would mean building it
twice — once now, once after the grammar actually settles. It's follow-up work, gated on the
grammar stabilizing and a real implementation existing to analyze.

### Formatting

An opinionated formatter (prettier-style) for consistent `.aql` style is a reasonable long-term
want.

**Callout**: deliberately deferred, and not just for lack of time — a formatter that reformats
whitespace or comments would, under this RFC's `q:id = sha256(source text)` design, silently
change a persisted query's id. Building a formatter before resolving that normalization question
(see [Unresolved questions](#unresolved-questions)) would ship a tool whose entire job is to
introduce the exact footgun a formatter should prevent.

### Persisted-query build-time extraction

For the persisted-query story to be useful in production, an app needs a build step that walks its
source for `.aql` documents and `` aql`...` `` template literals, compiles each one, and emits a
manifest (`q:id` → compiled query) a server can pre-register — the same shape of tool as the Relay
compiler or `graphql-codegen`'s persisted-query extraction.

**Callout**: real and necessary for the feature to pay off in production, but explicitly out of
scope for an initial rollout — it depends on this RFC's grammar being stable and on a
request-builder integration existing to define what a "usage site" even is.

### Type generation / codegen

Generating TypeScript types for a `.aql` document's result shape from a `Schemas` map, analogous to
`graphql-codegen`, would close the loop between the query language and WarpDrive's typed records.

**Callout**: aspirational and, realistically, the last item on this list WarpDrive would build, if
ever — its schema-driven reactive records already provide much of this value at the record level
without per-query codegen, which lowers the payoff relative to everything else in this table.

### Playground / REPL and CI validation

A GraphiQL-style interactive tool — author `.aql`, see the compiled envelope and, optionally, a
live response — is a natural fit for documentation and onboarding once a reference implementation
exists, but doesn't gate or get gated by anything else here. A small CI-oriented CLI
(`aql check some/**/*.aql --schema ./schema.json`) that validates a repo's `.aql` files against a
schema and exits non-zero on the same errors `parseAQL` throws is a realistic near-term
deliverable — a thin wrapper over the reference parser, buildable as soon as the grammar and
`Schemas` format in this RFC stabilize.

## Drawbacks

* This adds a whole new DSL — grammar, parser, VS Code tooling — to maintain and teach, on top of
  plain JSON:API's own learning curve.
* The filter operator vocabulary is a specific, opinionated choice (closer to SQL/Sequelize's
  operator set than, say, OData's or a GraphQL resolver's own filter conventions). Backends with a
  fundamentally different filter philosophy gain nothing from the vocabulary matching theirs and
  still need a full adapter, same as any other non-conforming backend.
* This entire RFC is specified ahead of any implementation — `data`/`filter`/`page`/`@arg` were at
  least prototyped during design exploration (see [Current implementation
  status](#current-implementation-status)); `headers` and multi-entry never were. Shipping a spec
  this far ahead of code risks it drifting from whatever an eventual implementation actually needs,
  or the gap simply never getting closed.
* `@arg` living inline inside `filter`/`page`/`headers` values, rather than in one centralized
  declarations block, scatters a persisted query's variable declarations through the document —
  arguably harder to see "what does this query need at call time" at a glance than a Relay-style
  upfront variable list would be.
* A persisted query's `q:id` is a straight sha256 of its source text, so a whitespace- or
  comment-only edit changes the id with no normalization step defined to prevent that.

## Alternatives

* **GraphQL.** Solves multi-entry batching, field selection, and (via resolvers) arbitrary
  filtering natively — but abandons JSON:API's REST/URL-addressable-resource model entirely.
  Not a drop-in for an existing JSON:API backend, which is specifically the population AQL targets.
* **Status quo: hand-written JSON query bodies.** What building a `QUERY` request body looks like
  today, with no terse authoring syntax, no schema-checked field/relationship names, and no
  persisted-query story.
* **OData `$filter` expressions.** A mature, standardized alternative filter expression syntax.
  Considered and rejected specifically for AQL's filter shape, to stay JSON:API-native and match
  the URL-bracket convention already common among JSON:API-flavored backends rather than adopting
  an unrelated ecosystem's expression language wholesale.
* **A separate persisted-query registration step** (Relay-style, registering queries out of band
  rather than deriving `q:id` from source text inline). Rejected for now to keep a query and its
  variable declarations as one artifact; worth revisiting if the multi-entry `q:args` name-conflict
  problem turns out to need a registry regardless.

## Unresolved questions

* **OR / grouped boolean filter logic.** No syntax exists; any future design should be additive
  (a new, distinct block or key) rather than changing what a bare `filter{}` block means today.
* **Filtering a related collection separately from the primary result set.** There's no syntax for
  "filter the `comments` on this `post`, as opposed to filtering which `posts` come back" —
  disambiguating those two intents needs its own design.
* **A `search` (full-text/opaque) parameter**, as a sibling top-level statement rather than
  something inside `filter{}`, since it isn't a `(fieldPath, operator, value)` triple.
* **Multi-entry partial failure semantics** — whole-request failure vs. a per-entry error slot.
* **Multi-entry cross-entry dependencies** — out of scope as "a meaningfully harder feature than
  batching independent queries," but not permanently ruled out.
* **`q:args` name-conflict resolution across multi-entry entries** that declare the same variable
  name for logically different things — full-path disambiguation
  (`q:args[entries.<name>.filter.<field>.<operator>]`) is the obvious answer but isn't specified.
* **Persisted-query id normalization** — should whitespace/comment-only differences between two
  `.aql` files that are otherwise identical hash to the same `q:id`?
