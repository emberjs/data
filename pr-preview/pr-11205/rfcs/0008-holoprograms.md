---
url: https://canary.warp-drive.io/pr-preview/pr-11205/rfcs/0008-holoprograms.md
description: >-
  A HoloProgram answers every request a holodeck test makes from a per-test
  WarpDrive store while recording, so a test starts from a seeded scene instead
  of declaring one mock per request.
---

# HoloPrograms&#x20;

## Summary

A HoloProgram is a reusable API scenario for `@warp-drive/holodeck` tests. It pairs a seed, the
starting server state, with a router of route handlers that every program shares, plus optional
per-route behaviors such as a delay or an error. A test opts in with `startProgram(this, program)`.
While the suite records, which is what a local run does, the program answers each request from a
per-test WarpDrive store built with the application's own schemas, and holodeck writes the answer
to `.mock-cache` as it writes any fixture. A replayed suite, which is what CI runs, never boots a
program. It reads the same fixtures it reads today.

Recording against a real API is out of scope. Safety protocols and the relay modes move to a
follow-up RFC, "Recording Holodeck Mocks Against a Real API" (#11286), called RFC B below. This RFC
reserves the names RFC B needs. The design carries forward the vision in #9616 and supersedes it as
the design of record.

## Motivation

Today a test states every response it needs, one mock at a time. Each mock restates data the test
already set up, and each mutation mock carries the exact request body string so the fixture key
matches.

The test `update hasMany with repeated patch` in
`tests/json-api/tests/integration/cache/mutation-request-test.ts` shows the cost. It pushes two
users and two pets into the client store. Its `patchUser1` helper builds a body string, declares a
`PATCH` mock for `/api/user/1` with that string, and writes the response by hand, including the
names and relationship links the push already holds. The test calls the helper twice, so it declares
two responses that a server would compute from its own state. That file and
`did-commit-notification-test.ts` declare seven such mocks for `user` resources.

With a program, the author writes the server once. A seed holds the users and pets. A shared
`PATCH /api/user/:id` handler applies the request body to the program's store and returns the
result. The test starts the program and makes its requests. It declares no mock and restates
neither the response nor the body string.

```ts
test('update hasMany with repeated patch', async function (assert) {
  startProgram(this, usersAndPets); // from '@warp-drive/holodeck/program'
  // push the same users and pets, then build and send each PATCH as before, with no PATCH mock
});
```

The program records the request text it received, so the body key cannot drift from the request.
The next test that needs "user 1 after a pet transfer" starts the same program.

### What stays the same

* The mode. Local runs record and CI replays, decided at build time as today.
* The fixtures. Programs write through the existing record endpoint, and replay reads the same
  directory layout and files. Every fixture a suite has committed reproduces byte for byte.
* Per-test scoping. Program state lives on the test's holodeck entry and goes away with
  `setTestId(this, null)`.
* The mock helpers in `@warp-drive/holodeck/mock`. Inside a program test they become overrides.

### Why WarpDrive can do this

A generic mock library does not know the application's data. Mirage keeps a second model layer that
exists only inside Mirage, and `@msw/data` asks for collection schemas written again in a
validation library. A program's store is a real WarpDrive `Store` with the application's own
schemas, so DEBUG builds validate every seed and every handler write against them, and the
application's request builders produce the URLs the router matches.

Issue #9627 asked what holodeck offers that MSW does not. Holodeck does not intercept `fetch`. It
serves real HTTP/2 responses from its own process and commits fixtures per test, so a replayed
suite does no setup work. HoloPrograms add scene-setting to the recording side only.
[Prior art](#prior-art) has the comparison.

## Detailed design

### Terminology

* **HoloProgram**, or **program**. The object `createProgram` returns. It names a seed, a router, a
  store factory, and optional behaviors. A test starts at most one.
* **Seed**. A program's starting server state, as an array of JSON:API resource objects.
* **Program store**. The `Store` that holds a program's state for one test while recording. It is
  never the store the application under test uses.
* **Router** and **route handler**. The router maps a method and URL pattern to a handler, which
  reads and writes the program store and returns a response.
* **Behavior**. A per-program, per-route adjustment, such as a delay or an error.
* **Override**. A mock declared with the existing helpers in a test that started a program. It
  answers one request in place of the program.
* **Phase 0**. The holodeck fixes in [Phased delivery](#phased-delivery) that programs depend on.
  Each one also helps suites that use no program.

"Program" already names the mock server process in holodeck. The server exports `launchProgram`
and `endProgram`, and its startup banner prints `program:`. Both function names stay, because
every `diagnostic.js` that launches holodeck calls them. Phase 1 changes the banner label to
`project:`. Documentation calls the process "the holodeck server" and keeps "program" for
HoloPrograms.

### Where things execute

Programs run in the browser test bundle, next to the test. Only the browser knows whether the suite
is recording, and only the application's build has its schemas and store. The holodeck server gains
no per-test state and no endpoint.

| Piece | Runs in | Runs when |
| --- | --- | --- |
| `createProgram`, `new Router(...)` | Browser | Module evaluation. Both store thunks only. |
| Router `define` callback | Browser | First program-served request in the bundle, while recording |
| Store factory, seed thunk, `behaviors` callback | Browser | First program-served request of each test, while recording |
| Route handlers, `after` | Browser | Each program-served request, while recording |
| `updateProgram` callback | Browser | The call, while recording. Never in replay. |
| Fixture write | Holodeck server | The record endpoint, as today |
| Serving a fixture from disk | Holodeck server | Every request, in both modes, as today |

While recording, the program answers a request before it leaves the browser. Holodeck posts the
answer to the record endpoint at that request's number, awaits the server's reply and fails the
request if the server refused the fixture, then lets the request continue. The server serves the
fixture it just wrote. The forwarded request takes the same server path in both modes. In this RFC,
"replay" names the mode CI runs in, not that server step.

```
record run                                   replay run
  startProgram(this, usersAndPets)             startProgram(this, usersAndPets)
    stores the program on the test entry         stores the program on the test entry

  store.request(PATCH /api/user/1)             store.request(PATCH /api/user/1)
    holodeck numbers it #0                       holodeck numbers it #0
    no override owns #0                          no override owns #0
    boots the program store (first time)         nothing runs
    router matches PATCH /api/user/:id
    handler updates the program store
    fixture #0 is written
    PATCH /api/user/1?__xTestId=…                PATCH /api/user/1?__xTestId=…
    server responds from disk                    server responds from disk
    after() runs, if a behavior sets one
```

### Entry point

The API ships as a new subpath, `@warp-drive/holodeck/program`, next to `./mock`. The root entry,
which resolves to the server under Node and to the client in the browser, does not change, so
suites without programs see no difference.

### `createProgram`

```ts
import type { Store } from '@warp-drive/core';
import type { ObjectValue } from '@warp-drive/core/types/json/raw';

export interface SeedIdentifier { type: string; id: string }

export interface SeedResource {
  type: string;
  id: string;
  attributes?: ObjectValue;
  relationships?: Record<string, { data?: SeedIdentifier | SeedIdentifier[] | null; links?: ObjectValue; meta?: ObjectValue }>;
  links?: ObjectValue;
  meta?: ObjectValue;
}

export type Seed = SeedResource[];

// Phase 2, for updateProgram
export interface SeedDocument { data: SeedResource | SeedResource[] | null; included?: SeedResource[] }

export interface ProgramDefinition {
  name?: string;
  store: () => Store;
  seed: () => Seed | Promise<Seed>;
  router: Router;
  behaviors?: (r: BehaviorMap) => void; // Phase 2
}

export interface Program { readonly name: string | null } // opaque, see below

export function createProgram(definition: ProgramDefinition): Program;
```

A seed is JSON:API resource objects with ids and no lids. `seed` is a thunk that runs only when a
test boots the program while recording, so a seed loaded with `import()` costs nothing in replay.
`store` returns a fresh `Store` with the application's schemas; `TestStore` in the examples stands
for the test app's store class. `name` is optional and appears only in errors and fixture metadata.
`createProgram` is synchronous and registers nothing. `Program` is opaque, so nothing in a test
file can reach the seed or the router through it.

```ts
// tests/json-api/programs/users-and-pets.ts
export const usersAndPets = createProgram({
  name: 'users and pets',
  store: () => new TestStore(),
  seed: async () => (await import('./seeds/users-and-pets.json')).default,
  router,
});
```

### `startProgram` and `updateProgram`

```ts
export function startProgram(context: object, program: Program): void;
export function updateProgram(context: object, update: () => Seed | SeedDocument): Promise<void>;
```

`startProgram` takes a program object, not a registered name, so a typo fails in the editor and
nothing has to be registered before tests run. It stores the program on the test's holodeck entry
and boots nothing, in either mode. It is synchronous, so a missing `await` cannot race the first
request. It throws when the context has no test id, when the test already started a program, and
when the test already issued a request.

`updateProgram` upserts resources into the program store for the current test. Like a mock's
response function, its callback runs only while recording. It boots the program store first if
needed, so seed and schema errors surface at the call rather than at the next request.

```ts
await updateProgram(this, () => ({ data: { type: 'pet', id: '3', attributes: { name: 'Muffin' } } }));
// every later request that returns pet:3 sees Muffin
```

### Program lifecycle

* The first program-served request of a recording test boots the program. Boot calls the store
  factory, awaits the seed, pushes it in one transaction, runs the router's `define` callback if
  no earlier test has, and then runs the `behaviors` callback, which validates its patterns against
  the routes. Concurrent first requests await one boot.
* `setTestId(this, null)` removes the entry, and the program store with it, and runs the
  unused-mock check that #11177 added. [Override precedence](#override-precedence) keeps that
  check correct.

### Router and route handlers

```ts
export type ProgramMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'QUERY';
export type LazyHandler = () => RouteHandler | Promise<RouteHandler>;
export type RouteMap = { [M in ProgramMethod]: (pattern: string, handler: LazyHandler) => void };

export declare class Router { constructor(define: (r: RouteMap) => void) }

export interface RouteHandler {
  request(ctx: ProgramContext, request: Request): HandlerResult | Promise<HandlerResult>;
  protocols?: never; // this member and the next two are reserved for RFC B
  requestProtocol?: never;
  responseProtocol?: never;
}

export interface ProgramContext {
  readonly store: Store;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly body: unknown;
  readonly route: string;
  readonly routeRequestNumber: number; // Phase 2
  find(type: string, id: string): SeedResource | null;
  findAll(type: string): SeedResource[];
  push(resources: SeedResource | Seed): void;
  remove(type: string, id: string): void;
  desiredId(): string | null; // Phase 2
  desiredPatch(): Seed | null; // Phase 2
  commitDesiredPatch(): void; // Phase 2
}

export interface HandlerResult {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body: ObjectValue | null;
}
```

```ts
export const router = new Router((r) => {
  r.PATCH('/api/user/:id', async () => (await import('./handlers/user')).PATCH);
});

// ./handlers/user.ts
export const PATCH: RouteHandler = {
  request(ctx) {
    const { data } = ctx.body as { data: SeedResource };
    ctx.push({ ...data, id: ctx.params.id });
    return { body: { data: ctx.find('user', ctx.params.id) } };
  },
};
```

Each handler is imported the first time a request matches it, so replay never loads a handler
module. `params` holds the pattern's named groups. `query` holds the search params without
holodeck's two test params. `body` is `JSON.parse` of the request text, or `null`. `route` is the
matched pattern and `routeRequestNumber` is the per-route counter behaviors use. `find`, `findAll`,
`push`, and `remove` work in seed shape, without lids. `push` upserts through the cache, so
attributes and relationships merge into an existing resource. `find` returns the cached resource
with its `lid` stripped. `remove` unloads the record and does not touch relationships that pointed
at it. Holodeck keeps its own index of what it pushed, because core has no public way to list every
resource in a cache (see [`serializeCache`](#serializecache)). A handler that writes through
`ctx.store` directly bypasses that index, and `findAll` does not see those records. `desiredId`,
`desiredPatch`, and `commitDesiredPatch` expose the `id` and `patch` behaviors.

A handler may be sync or async. It returns one explicit `HandlerResult` shape, not a `Response` or
a bare document, so holodeck never guesses which one it got. Bodies are JSON only, because the
server stores JSON.

### What a program records

Each handler result becomes an ordinary fixture, the shape a mock helper records:

* The method, and the request URL without origin and without holodeck's two test params. Phase 0
  makes the server key it the way replay looks it up.
* The exact request text as the body key, or `null`. A non-string request body fails while
  recording, because only a string can match on replay.
* `status` defaults the way the mock helpers default. `GET`, `HEAD`, and `QUERY` get `200`. `POST`
  gets `201` with a body and `204` without. `PUT`, `PATCH`, and `DELETE` get `200` with a body and
  `204` without. `statusText` defaults from the status code.
* `headers` pass through. The server adds `Content-Type: application/vnd.api+json` when absent, as
  it does for every mock.
* The response body is the result's `body`, or `{}` when it is `null`.

### URL matching

Route patterns are `URLPattern` pathname patterns, native in current browsers, matched against the
request's pathname. Origin is ignored, as fixtures ignore it. Queries do not take part in matching;
a handler reads `ctx.query` instead. Explicit mocks keep today's text matching, where parameter
order and encoding count. A program does not guess the encoded URL, because it records the URL the
request carried.

### Isolation and concurrency

Each test that boots a program gets its own program store, keyed by the test context object, which
is how holodeck already isolates concurrent tests. Program stores never meet.

Within one test, handlers run one at a time. Without behaviors they run in the order the test
issued the requests. Request numbers are assigned synchronously, so concurrent requests get
distinct fixture slots. An async handler holds the queue until it settles. A request with a
`requestDelay` joins the queue when its delay ends. The fixed order keeps store mutations, and
therefore fixtures, stable across recordings.

### Override precedence

A mock answers the next request with its method and URL that no earlier mock owns, and the program
answers every other request. Holodeck already numbers each test's requests and counts its declared
mocks, per method and URL. Four rules give a request the same owner in record and replay:

1. Both counts key on one normalized URL. Phase 0 does this.
2. Request *n* belongs to an override when at least *n* + 1 mocks are declared for its method and
   URL. The program skips it. The handler does not run, the store does not change, and the
   per-route counter does not advance.
3. Otherwise the program owns request *n* and raises the mock count to *n* + 1, so an override
   declared afterwards lands on the next request.
4. Rules 2 and 3 run synchronously when holodeck assigns the request number, before any
   `requestDelay` or queueing, and in both modes. A mock declared while a delayed or async request
   is in flight lands after it. In replay the program does not run, but holodeck still assigns
   owners and advances the count, so record and replay agree.

```ts
startProgram(this, usersAndPets);
await store.request(getUser('1'));                                  // GET #0, program
await PATCH(this, 'api/user/1', () => ({ data: null }), { body }); // override
await store.request(patchUser('1', body));                          // PATCH #0, override
await store.request(patchUser('1', body));                          // PATCH #1, program
```

The override leaves the program store alone, so the second `PATCH` sees the state before the first.
The unused-mock check keeps its meaning. An override no request reached still fails the test from
`afterEach`, and program-served requests raise the mock count only up to the request count, so they
never cause a false report. Without rule 3, a mock declared after a program-served request
overwrote that request's fixture in the prototype.

### Behaviors

```ts
export interface Behavior {
  requestDelay?: number;
  responseDelay?: number;
  error?: { status: number; statusText?: string; headers?: Record<string, string>; body?: ObjectValue };
  after?: (request: Request, store: Store) => void | Promise<void>;
  id?: string;
  patch?: Seed;
}

export type BehaviorMap = { [M in ProgramMethod]: (pattern: string, behavior: Behavior | Behavior[]) => void };
```

```ts
behaviors: (r) => {
  r.GET('/api/pet/:id', { responseDelay: 50 });               // every request
  r.PATCH('/api/user/:id', [{}, { error: { status: 409 } }]); // first succeeds, second conflicts
},
```

An object applies to every program-served request on the route. An array applies one entry per
program-served request, in order, and nothing after the last. The index is
`ctx.routeRequestNumber`, counted per method and pattern. It is not the fixture counter, which is
per URL, and only the fixture counter reaches disk. Boot throws if a behavior names a pattern the
router does not define for that method, or if an `error` status is below 400.

* `requestDelay` waits before the handler runs, while recording. A mutation from another request
  that lands during the wait is visible to the handler.
* `responseDelay` waits after the handler, before the response.
* The fixture stores `delay = requestDelay + responseDelay`, and replay waits that long before
  responding. The forwarded request of a recording run is served from disk too, so a recording run
  sleeps both delays in the browser and then waits for their sum again on the server.
* `error` replaces the response and skips the handler. The fixture is an ordinary fixture with that
  status. Phase 0 makes 5xx fixtures with a body replay.
* `after` runs once the forwarded request settles, inside the per-test queue. A request issued
  while this one is in flight sees the state before `after` runs. Replay never runs `after`.
* `id` is the primary key a handler should mint for a created record, read with `ctx.desiredId()`.
* `patch` is resources a mutation should also upsert, read with `ctx.desiredPatch()` and pushed by
  `ctx.commitDesiredPatch()`. A handler may ignore `id` and `patch`.

### `serializeCache`

```ts
export function serializeCache(store: Store, options?: { mintId?: (type: string, ordinal: number) => string }): Promise<Seed>;
```

```ts
export async function loadUsersAndPets(): Promise<Seed> {
  const store = new TestStore();
  const rey = store.createRecord('pet', { id: '1', name: 'Rey' });
  const pixel = store.createRecord('pet', { name: 'Pixel' }); // no id
  store.createRecord('user', { id: '1', firstName: 'Chris', pets: [rey, pixel] });
  return serializeCache(store);
}
```

It depends on a change in core. The `Cache` interface declares
`dump(): Promise<ReadableStream<unknown>>`, `JSONAPICache` does not implement it, and core has no
other public way to list every resource. This RFC asks core to implement `JSONAPICache.dump()` as a
stream of resource objects, which SSR can reuse. The fallback is a public iterator over resource
keys on `store.cacheKeyManager`. Phase 3 waits for one of them.

Holodeck then serializes in two passes. A `createRecord` seed points at id-less records by `lid`,
and minting ids alone leaves those references dangling. Pass one walks the dump in order and mints
an id for each resource without one. Pass two rewrites every relationship reference from lid to id
and drops all lids.

Minted ids are deterministic. The default `mintId` returns `` `${type}-${ordinal}` ``, where the
ordinal counts id-less resources of that type in dump order, so a deterministic seed function mints
the same ids every time and re-recording does not churn `.mock-cache`. An application that
validates id format passes its own `mintId`. Deleted records are skipped. New records serialize as
remote state, which is the intent of a `createRecord` seed.

### The fixture contract

The directory layout `.mock-cache/<testId>/<METHOD>::<url>::<n>/`, the body-hash file names, and
the compressed body file do not change. New `meta.json` fields are written only when set, so
re-recording a suite without programs still reproduces every committed file byte for byte. Two
fields are added:

* `delay`, in milliseconds, when nonzero (Phase 0). Replay waits before responding.
* `program`, the `name` of the program that recorded the fixture. Replay ignores it. It lets
  `git grep '"program":"users and pets"'` find every fixture a program produced.

A changed seed, handler, or behavior does not invalidate fixtures. Programs never run in replay,
and the cache key comes from the request. Local runs record everything, so a test run locally after
the change rewrites its fixtures. The risk is a test nobody ran. Its old fixtures still replay and
pass in CI. The recommended practice after changing a seed or a shared handler is to run the whole
suite locally with `pnpm test`, commit the `.mock-cache` diff with the change, and run
`CI=1 pnpm test` to confirm replay. The `program` field tells a reviewer which fixtures to expect
in the diff.

### Error messages

A test author sees these through the rejected request unless noted:

```
Holodeck: program "users and pets" has no route for GET api/user/1/pets (request #0).
Add the route to the program's Router, or declare an override for this request with
GET(this, 'api/user/1/pets', ...).

This test started program "users and pets". Programs do not run in replay, so every request
the program serves needs a committed fixture. Run the test locally to record it, then commit
.mock-cache.

Holodeck: the route handler for GET /api/user/:id declares "protocols". The members protocols,
requestProtocol, and responseProtocol are reserved for safety protocols, which this version of
holodeck does not run. Remove them.
```

The first is thrown while recording when no route matches, and nothing is recorded. The second is
appended in replay to the missing-fixture error holodeck already raises. The third is thrown while
recording, when the handler is first imported. In addition:

* A handler that throws fails its request with the handler's message, prefixed by
  `Holodeck: the route handler for <pattern> in program <name> threw while recording request #n`.
* A non-string request body, a misused `startProgram`, a bad behavior at boot, and a mock declared
  for an already-served slot (Phase 0) each throw a message naming the cause.

### Reserved extension points for RFC B

This RFC reserves the following and defines nothing else about them:

* The optional `protocols`, `requestProtocol`, and `responseProtocol` members of `RouteHandler`.
  They are typed `never`, so TypeScript rejects them, and a handler that declares one throws while
  recording. Replay never imports a handler, so the type error is the only guard CI has. A
  validation step that silently does nothing is worse than none, because the author believes the
  fixture was checked.
* The name `SafetyProtocols.sanitize`, for the relay-only sanitizing function.
* The server route `/__relay`. Relay will return upstream responses to the browser, which records
  them through the record endpoint, so that endpoint stays the only writer of fixtures.

RFC B is expected to type validation on Standard Schema v1, with Valibot as the documented example
and no runtime dependency. RFC B decides it.

### Changes from the vision

Where this RFC departs from #9616:

* `startProgram` takes an object, and `createProgram` is synchronous and registers nothing. The
  vision started programs by name.
* A program has a `store` factory. The vision did not say which store a program uses.
* Seeds are JSON:API resource objects, and `serializeCache` mints deterministic ids instead of
  UUID v4.
* Handlers return one `HandlerResult` shape, and `RouteHandler` compiles.
* Behaviors have named `requestDelay` and `responseDelay` fields and no `delay` shorthand.
  `error.body` is JSON.
* Safety protocols and relay move to RFC B, with Standard Schema rather than a Valibot dependency
  as the direction.
* Local runs record by default, since #11177. The vision replayed by default.

### Phased delivery

Each phase ships on its own and ends in a named gate, as in RFC 0001.

**Phase 0. Holodeck prerequisites.** Each fixes a defect that suites without programs hit today.

* (a) Recording keys the fixture URL the way replay looks it up. Today a query with an unencoded
  comma or brackets records under one key and replays under another, so the replay misses.
* (b) 5xx fixtures with a body replay. Today replay drops the body but keeps the recorded length
  header, and the browser sees a stream error.
* (c) `delay`, an optional field on every mock helper and on program fixtures, which replay waits
  for.
* (d) The request count and the mock count use one normalized URL key. This reaches suites without
  programs in one case: a test that requests one path from two origins gets one counter instead of
  two. Its fixtures already share a directory, so the change renumbers what already collided.
* (e) A mock declared after a request to its method and URL was served throws
  `MockError: request #n for <METHOD> <url> was already served` instead of recording over that
  slot. Such a test already fails today, because the request ran with no fixture and the late
  fixture lands in a slot no later request reads, so no passing test is expected to change.

Gate: record, then replay under `CI=1`, a `GET` with an unencoded comma and brackets in its query,
a `503` with a JSON:API errors body, and a `GET` with `delay: 50` that takes at least 50 ms in
replay. A mock declared after its request fails with the new error. Re-recording every suite leaves
`.mock-cache` unchanged, apart from any directory (d) renumbers.

**Phase 1. Programs from a JSON seed.** `createProgram`, `startProgram`, `Router`, `RouteHandler`,
`ProgramContext`, fixture conversion, the per-test store and queue, the reserved members, the
error messages, the `program` field, and the banner label. A test that started a program may not
declare mocks yet. `mock()` throws and names Phase 2. The type blocks above ship whole in Phase 1,
with the members marked `Phase 2` present but inert.

Gate: a program-served request records and replays under `CI=1` without importing the handler
module. Two tests recording concurrently with different programs see only their own state. An
unmatched route fails with its message.

**Phase 2. Behaviors, `updateProgram`, and overrides.** All six behavior fields, the per-route
counter, queue order for `requestDelay`, `after`, `updateProgram`, and override rules 2 to 4 in
place of the Phase 1 ban.

Gate: a test with a program and an override has the same counters and the same unused-mock result
in record and replay. An array behavior applies per program-served request on its route. `error`
skips the handler. A request issued while another is in flight sees the state before its `after`.

The demo milestone closes Phase 2. It converts the seven `user` mocks in
`tests/json-api/tests/integration/cache/mutation-request-test.ts` and
`did-commit-notification-test.ts` to one `users and pets` program. The bulk create needs `id` and
`patch` for its server-assigned ids. Tests that exercise one server quirk, such as a sparse or
normalized response, keep an override. Gate: the converted tests record locally and replay under
`CI=1` from committed fixtures, and every hand-written `user` response body the program now
computes is gone. The repository has 27 mock declarations under `tests/`, so this proves the
design. It is not a migration.

**Phase 3. `serializeCache`.** `JSONAPICache.dump()` in core with its own tests, then the two-pass
serializer and `mintId` in holodeck.

Gate: a `createRecord` seed with id-less records and relationships to them boots a program store.
Running the seed function twice gives identical seeds, and re-recording a test that uses it leaves
`.mock-cache` unchanged.

Phase 0 precedes Phase 1, because program fixtures need (a) and overrides need (d) and (e). Phase 2
needs Phase 0 (b) and (c). Phase 3 needs Phase 1 and the core change, and it can run alongside
Phase 2.

### Ecosystem implications

* No lint rule is required, because the types reject reserved members. No deprecations.
* The context argument is any object, as for `setTestId` today, so any test framework works.
* Addons, SSR, Engines, the Inspector, IDE support, and blueprints do not change.

## How we teach this

"HoloProgram" and "program" stay. The guide introduces a program once as "a Mirage-style scenario
with a real WarpDrive store behind it", then says "program". "Behavior" names per-route
adjustments, "override" names a mock inside a program test, and "fixture" names what lands in
`.mock-cache`. The guide does not borrow other tools' words, such as "cassette" or "scenario", as
holodeck terms. The server setup page adds one sentence saying `launchProgram` and `endProgram`
start and stop the holodeck server and are unrelated to HoloPrograms.

The HoloPrograms page in the testing guide (#11169) becomes the reference when Phase 2 ships. Its
"Proposed, not implemented" banner goes, and its safety-protocol and VCR sections move to RFC B's
page. The page teaches five things:

* When to use one. A mock answers one request. A program answers every request a test makes, from a
  store that behaves like the API. Use one when a test needs a world rather than a payload.
* Programs run only while recording. Holodeck writes the answers to `.mock-cache` like any fixture,
  and replay serves them. Commit fixtures as for a mock.
* Write the router once and share it. Import each handler lazily. Give each program a seed, a JSON
  file of resource objects with ids. Add behaviors for what a handler should not know, such as a
  slow endpoint.
* Override one request with the mock helpers. A `PATCH(this, ...)` in a program test answers the
  next matching request, and that request leaves the program's store untouched.
* Re-record after changing a program. Run the suite locally with `pnpm test`, commit the
  `.mock-cache` diff, and run `CI=1 pnpm test`.

These pages exist only on #11169 today, so this section assumes it merges first:

* The testing index gains the program step in its record and replay diagram, and its HoloPrograms
  entry stops calling the page a design.
* Writing mocks gains "Override a program for one request".
* Recording and replaying gains "Fixtures a program wrote", with the `program` field and the
  re-record practice.
* Troubleshooting gains the three program errors, indexed by their text.
* Each export of `@warp-drive/holodeck/program` gets TSDoc with an example, and the package README
  links the guide page.
* Phase 3 adds a "Build a seed with `createRecord`" section to the HoloPrograms page, covering
  `serializeCache` and `mintId`.

An agent skill, `warp-drive-packages/memory-alpha/skills/holodeck/use-holoprograms-in-tests.md`,
gets a row in the skills index. It covers starting a program, writing a handler, overriding a
request, and re-recording after a change.

## Drawbacks

* Invalidation is manual. After a seed or handler change, fixtures of tests nobody ran locally
  stay stale and CI replays them. The `program` field reduces this but does not remove it.
* Program code never runs in CI. Handlers, seeds, behaviors, `after`, and the reserved-member
  check run only while recording, so a handler that throws or a seed that fails DEBUG validation
  passes CI for as long as its stale fixtures exist. Only a local run catches it.
* Recorded delays add to CI time. Replay waits for every fixture's `delay`, so a suite's replay
  grows by the sum of the delays its behaviors recorded.
* Phase 0 (d) and (e) reach suites without programs. (d) renumbers fixtures a test recorded from
  two origins, and (e) turns a late mock into an error.
* Bundle cost in record mode. Program objects and the router module are in the test bundle.
  Handlers and JSON seeds load through `import()`, so replay never fetches them, but the build
  still compiles them.
* One extra round trip per program-served request while recording. Replay has none.
* Two counters to reason about. Fixtures count per method and URL, while array behaviors count per
  method and pattern. An author of an array behavior has to know which one applies.
* Overrides keep today's object-body defect. A program records the request text, but an override
  in a program test still has to pass its body as the exact string.
* Windows paths. A query string puts `?` in a fixture directory name, which Windows cannot check
  out. JSON:API URLs often carry `include`, so programs produce more of them.
* Dead fixtures. Nothing prunes or reports orphaned fixture directories (issue #11170). A program
  that changes which requests a screen makes leaves more behind.
* Drift from the real API. Shared handlers imitate a server, and until RFC B nothing checks them
  against the real API. DEBUG cache validation checks resource shape, not endpoint behavior.

## Alternatives

### One RFC instead of two

The vision bundles programs, safety protocols, and relay. Programs work with hand-written seeds and
no real API, and static relay needs no program. Relay brings credentials, network egress, sanitized
production data in git, and a dependency decision, each contestable on its own, and the vision
left safety protocols unspecified. One RFC would hold programs until that design exists. RFC B
depends on this one only for dynamic relay.

### Server-side programs

Programs could live in the server process, with state per test id, start and update endpoints, and
modules loaded by path. Rejected. A `Store` does not load in plain Node without the application's
build and macro configuration, and an Ember app's store service imports `@ember/*`, which does not
load in Node at all. The server worker receives its options by structured clone, so `updateProgram`
callbacks and `after` closures could not reach it. Isolation would rest on test id hygiene in one
shared process instead of object identity. Its one advantage, fetching real APIs from Node, matters
only for relay, and RFC B can add `/__relay` without moving programs.

### A registered-name API

`startProgram(this, 'the-big-goodbye_chapter-13')`, as in the vision. It needs a registry, a module
that fills it before tests run, a slug rule, and lazy loading by name, and a typo fails at run time
instead of in the editor. The `name` field keeps a readable label without the registry.

### Per-test mocks only, or fixture factories

Both keep one mock per request. Factories cut typing, but the test still restates every response
and body string, and mock order still has to match request order.

### Prior art

Mirage's route handlers and ember-cli-mirage scenarios are the closest ancestor
([route handlers](https://miragejs.com/docs/main-concepts/route-handlers/),
[seeding](https://www.ember-cli-mirage.com/versions/v0.4.x/seeding-your-database/)). This RFC
borrows the split between shared handlers and per-situation data, but it uses the real store
instead of Mirage's second model layer ([models](https://miragejs.com/docs/main-concepts/models/))
and never patches the page's `fetch`, whose Pretender polyfill corrupts binary responses
([ember-cli-mirage#1915](https://github.com/miragejs/ember-cli-mirage/issues/1915)). Mirage's last
npm release is 0.1.48, from 2023-10-30.

MSW's initial handlers plus runtime overrides map onto shared handlers plus in-test overrides
([network behavior overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides/)),
`once` maps onto array behaviors, and its unhandled-request policy
([listen](https://mswjs.io/docs/api/setup-server/listen/)) is why an unmatched route fails loudly
here. `@msw/data` typing collections on Standard Schema is precedent for RFC B. MSW keeps recording
out of its core, and its author warns that "a recording of your traffic is not a specification for
your API" ([Introducing Source](https://mswjs.io/blog/introducing-source/)). Holodeck is record and
replay first, and that is the answer to #9627. Holodeck does not intercept `fetch`, it commits
fixtures per test so tests replay concurrently with no setup cost, and programs build responses
from the application's own schemas. A WarpDrive-aware MSW plugin would give up committed per-test
fixtures.

Polly.js is the closest analogue to record and replay with fixtures. Its `order` matcher is
holodeck's per-URL counter, `.times(n)` and `intercept` map onto behaviors and overrides
([configuration](https://raw.githubusercontent.com/Netflix/pollyjs/master/docs/configuration.md)),
and its `beforePersist` hook is where RFC B's sanitizing will sit. This RFC avoids its HAR files and
default header matching, which make recordings sensitive to noise. A local holodeck run is the
Rails VCR gem's `:all` mode and a CI run is `:none`
([record modes](https://raw.githubusercontent.com/vcr/vcr/master/features/record_modes/all.feature)).
`re_record_interval` is not borrowed, because time-based re-recording churns committed fixtures.
WireMock models state as named scenario states
([stateful behaviour](https://wiremock.org/docs/stateful-behaviour/)); this RFC models state as data
in a store, because named states multiply with every combination a test needs. Playwright's
`routeFromHAR` serves the first match for every identical request, and recording state-changing
POSTs was declined ([#32272](https://github.com/microsoft/playwright/issues/32272),
[#28167](https://github.com/microsoft/playwright/issues/28167)). Holodeck's per-URL counter avoids
the first problem, and programs address the second by computing mutation responses from a store.

## Unresolved questions

Open items, to settle during the Exploring stage with the Data team. The last item lists what this
RFC defers to RFC B.

1. Fixture invalidation. This RFC relies on the manual practice in
   [The fixture contract](#the-fixture-contract). Automatic detection, such as a program hash in
   `meta.json` checked in replay, stays open. Hashing handler source in the browser is not reliable.
2. Deterministic ids. Whether the default `mintId` should look like a UUID.
3. `QUERY`. The router accepts it, but the server's CORS list omits it and no mock helper exists.
4. Other cache formats, and the cache layouts in #11154. Seeds and `updateProgram` are defined for
   JSON:API resource objects only.
5. Delays while recording. A recording run spends every delay twice. The options are in the
   decision note under [Behaviors](#behaviors).
6. Keying the request count by normalized URL (Phase 0 d). Picked here. Tests with two origins and
   one path renumber on re-record.
7. Batching program fixtures to save the extra round trip per request. Likely not worth an endpoint.
8. For core: whether `JSONAPICache.dump()` also emits documents, which seeds do not need.
9. Matching on origin, which this RFC ignores because fixtures ignore it.
10. Streaming or non-JSON handler bodies, which the server cannot store today.
11. A per-program or per-test `RECORD`. Programs follow the suite's mode only.
12. A mode that records only missing fixtures, like VCR's `:once`, so local runs stop rewriting
    fixtures they did not need. Independent of programs.
13. `launchServer` and `endServer` aliases for the server functions.
14. Querying the program store with AQL (#11087).
15. A Node-runnable core, which relay or a seed CLI would need. RFC 0002's build plugin does not
    cover it, and core reads `window` without a guard in two places.
16. Deferred to RFC B: the design of safety protocols, suppressing transforms outside relay, where a
    static-relay protocol comes from, Valibot versus Standard Schema, relay configuration and
    credentials, dynamic relay scope, mutation handling, and generated program output.
