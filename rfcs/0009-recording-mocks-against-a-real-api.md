---
title: Recording Holodeck Mocks Against a Real API
description: Holodeck tests can record fixtures from a real API through a relay route that keeps credentials on the server, with safety protocols that validate and sanitize every response before it is committed.
warp-drive-rfc: 9
emberjs-rfc:
emberjs-pr:
emberjs-branch:
sync-hash:
stage: proposed
start-date: 2026-09-26T00:00:00.000Z
release-date:
release-versions:
teams:
  - data
prs:
  accepted:
project-link:
suite:
---

<!--
The number 9 is provisional. 0001 to 0007 are merged, #11205 (HoloPrograms) holds 0008, and
open PRs #11087 and #11154 still claim 0003. Re-check rfcs/ at merge time and take the next unused
number.
-->

# Recording Holodeck Mocks Against a Real API

## Summary

A holodeck test can record its fixtures from a real API instead of from a hand-written mock or a
HoloProgram. A test opts in with `startRelay(this, { router })`. While the suite records, a request
that no mock or program owns goes to a new route on the holodeck server, `/__relay`, which forwards
it to a configured upstream with credentials that never leave the server and returns the raw
response to the browser. Before holodeck records that response as an ordinary fixture, the safety
protocol on the matching route validates it and a sanitizer strips what must not be committed.
Safety protocols also validate the requests and responses a program serves. Dynamic relay adds a
capture store, so a scene recorded once against the real API becomes a program seed with
behaviors. Replay, which is what CI runs, never contacts the upstream.

This RFC completes the design that the HoloPrograms RFC (#11205, called RFC A below) reserved
names for: the `protocols`, `requestProtocol`, and `responseProtocol` members of `RouteHandler`,
`SafetyProtocols.sanitize`, and the `/__relay` route. It depends on RFC A's Phase 1 and, for
dynamic relay, on its Phase 3.

## Motivation

A mock or a program imitates the API from memory, and nothing checks that imitation against the
real service. Recording against the real API captures the real shape, but a raw recording is not
safe to commit. It can carry tokens, cookies, and personal data into git, a recording session can
reach a write endpoint by mistake, and a response nobody validated is a fixture nobody can trust.

The vision in #9616 named the three pieces that make recording safe: safety protocols, static relay,
and dynamic relay. It left "Adding a Safety Protocol" as an empty code block and did not say where
credentials live, what counts as a mutation, or which process sanitizes. RFC A moved those questions
here so programs could ship without them.

### What stays the same

- Fixtures, per-test scoping, and replay. A relayed fixture is an ordinary fixture, and the record
  endpoint stays the only writer of fixtures.
- Mock helpers and programs. Relay answers only the requests they do not.
- CI. A replayed suite makes no outbound request and needs no credentials.

## Detailed design

### Terminology

- **Upstream**. The real API a relay forwards to, named by origin in the server's launch options.
- **Relay**. Answering a request by forwarding it to the upstream while recording. **Static relay**
  records the sanitized answer and nothing else. **Dynamic relay** also captures answers into a
  store and emits a program from them.
- **Safety protocol**. A request schema, a response schema, or both, declared on a route handler.
  Schemas implement Standard Schema v1.
- **Sanitizer**. The `sanitize` function of a safety protocol. It rewrites a relayed response body
  before recording and runs in no other situation.
- **Guarded route**. A route whose handler declares a safety protocol. Relay refuses an unguarded
  route by default.
- **Mutation**. A `POST`, `PUT`, `PATCH`, or `DELETE` request, except a `POST` that carries a
  method-override header naming `QUERY`.

### Where things execute

| Piece | Runs in | Runs when |
| --- | --- | --- |
| `/__relay`: forward to the upstream with the configured headers | Holodeck server | A relayed request, while recording |
| Route match, safety protocol, sanitizer | Browser | Each relayed or program-served request, while recording |
| Capture store, seed and behavior generation | Browser | Dynamic relay, while recording |
| Fixture write | Holodeck server | The record endpoint, as today |
| Serving a fixture from disk | Holodeck server | Every request, in both modes, as today |

Credentials stay in the server process. The browser sends `/__relay` the request's method, path,
query, headers, and body. The server rewrites the origin to the upstream, adds the configured
headers, forwards, and returns the upstream's status, headers, and body unchanged. The browser
validates and sanitizes, posts the result to the record endpoint at the request's number, awaits
that reply, and lets the original request continue, where the server serves the fixture it just
wrote. Ownership follows RFC A's override rules: a relayed request counts as a program-served one.

```
record run                                        replay run
  startRelay(this, { router })                      startRelay(this, { router })
  store.request(GET /api/user/1)                    store.request(GET /api/user/1)
    no override owns #0                               no override owns #0
    router matches GET /api/user/:id                  nothing runs
    request protocol validates the body
    POST /__relay → upstream GET /api/user/1
    response protocol validates the reply
    sanitize() rewrites it
    fixture #0 is written
    GET /api/user/1?__xTestId=…                       GET /api/user/1?__xTestId=…
    server responds from disk                         server responds from disk
```

### Safety protocols

```ts
import type { ObjectValue } from '@warp-drive/core/types/json/raw';

// Copied from the Standard Schema v1 spec, as the spec invites. Holodeck adds no dependency.
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    validate(value: unknown): StandardResult<Output> | Promise<StandardResult<Output>>;
  };
}
export type StandardResult<T> = { value: T; issues?: undefined } | { issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey | { key: PropertyKey }> }> };

export interface SafetyProtocols {
  request?: StandardSchemaV1;
  response?: StandardSchemaV1;
  sanitize?: (body: ObjectValue, request: Request) => ObjectValue | Promise<ObjectValue>;
}

export interface RouteHandler {
  request(ctx: ProgramContext, request: Request): HandlerResult | Promise<HandlerResult>;
  protocols?: SafetyProtocols | Record<string, SafetyProtocols>;
  requestProtocol?: (request: Request) => string;
  responseProtocol?: (request: Request, response: { status: number; headers: Headers; body: unknown }) => string;
}
```

```ts
// ./handlers/user.ts
import * as v from 'valibot';

const user = v.object({
  data: v.object({
    type: v.literal('user'),
    id: v.string(),
    attributes: v.object({ firstName: v.string(), lastName: v.string(), email: v.string() }),
  }),
});

export const GET: RouteHandler = {
  request(ctx) {
    return { body: { data: ctx.find('user', ctx.params.id) } };
  },
  protocols: {
    response: user,
    sanitize: (body) => {
      const doc = body as v.InferOutput<typeof user>;
      doc.data.attributes.email = `user-${doc.data.id}@example.com`;
      return doc;
    },
  },
};
```

`protocols` is one `SafetyProtocols`, or a record of named ones when an endpoint's shape depends
on the request. With a record, `requestProtocol` and `responseProtocol` pick a name per request,
and boot throws for a handler that declares a record without both selectors.

When a protocol runs:

| Request | `request` schema | `response` schema | `sanitize` |
| --- | --- | --- | --- |
| Program-served, while recording | On the parsed body, before the handler | On the handler's body, before recording | Never |
| Relayed, while recording | On the parsed body, before forwarding | On the upstream body, before `sanitize` | After validation, before recording |
| Answered by a mock helper | Never | Never | Never |
| Any request, in replay | Never | Never | Never |

A schema failure fails the request with the schema's issues, and nothing is recorded, so a bad
request never reaches the upstream and a bad response never reaches disk. Validation may be async.
The schema's output `value` is what proceeds, so a schema that transforms changes what a program
records too. `sanitize` is the place for changes that apply only to real-API responses.

<!--
DECISION: using the schema's output value in every mode is the simpler rule, but the vision wanted
transforms to apply only to real-API responses. The alternative is to validate only, discard the
output value, and make `sanitize` the sole way to change a body. Pick one.
-->

Replay never runs a protocol, so CI cannot catch a fixture that would fail one today. The recording
run is where the check happens, and the fixture on disk is the checked result.

### Static relay

The server learns the upstream from its launch options. Options cross to the server worker as
data, so they hold values, not functions, and the credentials come from the environment of the
process that launches holodeck.

```js
// diagnostic.js
launchProgram({
  projectRoot,
  relay: {
    target: 'https://api.example.com',
    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
    allowMutations: false,
  },
});
```

```ts
export interface RelayOptions {
  router: Router;
  allowUnguarded?: boolean;
  capture?: CaptureOptions; // dynamic relay, below
}

export function startRelay(context: object, options: RelayOptions): void;
```

`startRelay` marks the test and boots nothing, in either mode. It throws when the context has no
test id, when the test already started a program or a relay, when the test already issued a
request, and, while recording, when the server was launched without `relay`. A test starts a
program or a relay, not both.

While recording, a request that no override owns is matched against the router. A match imports
the handler for its protocols only; the handler's `request` function does not run. An unmatched
route, or a matched handler with no `protocols`, fails the request unless the test passed
`allowUnguarded: true`, because an unguarded relay commits whatever the upstream returned.

<!--
DECISION: failing unguarded routes by default trades convenience for safety. The alternative is to
relay unguarded and record, and to rely on review of the `.mock-cache` diff. Pick one.
-->

The server forwards to the configured `target` only. It refuses a mutation with a 405 unless
launched with `allowMutations: true`, and the browser surfaces that refusal as the request's error.
The response holodeck records keeps the upstream's status and `Content-Type` and drops every other
upstream header, so a `Set-Cookie` or a rate-limit header never reaches a fixture.

A live API is not a fixed dataset. A test that asserts on values a real API returns is brittle
unless the API serves a dataset the team controls, and a sanitizer that pins a volatile field, such
as a timestamp, should pin primitives only, never relationships or identity. After the upstream
changes, re-record the way RFC A prescribes for programs: run the suite locally, commit the
`.mock-cache` diff, and confirm with `CI=1 pnpm test`.

### Dynamic relay

```ts
export interface CaptureOptions {
  name: string;
  store: () => Store;
}
```

With `capture`, every relayed response also goes, after validation and sanitizing, into a capture
store that belongs to the test. The first mutation the test issues, or the end of the test if it
issues none, closes the seed: holodeck serializes the capture store with RFC A's `serializeCache`.
Each mutation forwarded after that produces behaviors on its route. The difference in the capture
store after the upstream answered becomes a `patch` behavior, and a single new record's id becomes
an `id` behavior. The outcome is a program definition a test author can commit and start with
`startProgram` from then on, so the real API is needed once.

Holodeck emits the seed and the behavior list through a new server route, `/__generate`, which
writes them under `<projectRoot>/holodeck/generated/<name>/`. The record endpoint stays the only
writer of fixtures; generated programs are source, not fixtures.

<!--
DECISION: the generated files, their format, and the helper that turns a behavior list into RFC A's
`behaviors` callback are not designed here. Options: (a) `seed.json` plus `behaviors.json` and a
`behaviorsFromJSON(r, list)` helper; (b) a generated `.ts` module that calls `createProgram`; (c)
print the definition to the console and leave the file to the author. Pick one before Phase 3.
-->

### The fixture contract

A relayed fixture has the layout, file names, and body encoding every fixture has. Its `meta.json`
gains `source: "relay"`, written only for relayed fixtures, so `git grep '"source":"relay"'` finds
every fixture that came from a real API. Its recorded headers are the status and `Content-Type`
only. The request text is stored as today; the request schema validates it but does not change it.

<!--
DECISION: a token or a password in a request body is committed with the fixture, because nothing
sanitizes request text. Options: add `sanitizeRequest`, which changes the fixture key and therefore
what replay matches; or document that relayed tests must not send secrets in bodies. Pick one.
-->

### Error messages

```
Holodeck: GET /api/user/1 has no safety protocol in this relay. Add `protocols` to the route
handler for GET /api/user/:id, or pass `allowUnguarded: true` to startRelay.

Holodeck: the response to GET /api/user/1 failed its safety protocol and was not recorded.
  data.attributes.email: Invalid type: Expected string but received undefined

Holodeck: the server refused to relay PATCH /api/user/1 because it is a mutation. Launch the
server with `relay.allowMutations: true` to record mutations against the upstream.

Holodeck: this test started a relay, but the server was launched without `relay`. Add
`relay: { target, headers }` to launchProgram in diagnostic.js.
```

### Phased delivery

Each phase ships on its own and ends in a named gate.

**Phase 1. Safety protocols.** The copied Standard Schema interface, `SafetyProtocols`, the three
`RouteHandler` members, the selection rule for named protocols, and validation of program-served
requests and responses. Needs RFC A Phase 1.

Gate: a program-served request with a body its `request` schema rejects fails and records nothing.
A handler body its `response` schema rejects fails and records nothing. `sanitize` does not run for
a program-served request. A handler that declares a record of protocols without selectors fails at
boot. The same tests replay under `CI=1` with no schema running.

**Phase 2. Static relay.** The `relay` launch option, `/__relay`, `startRelay`, the mutation
refusal, the header restriction, the unguarded-route refusal, and the `source` field. Needs Phase 1.

Gate: against an upstream the test harness runs locally, a relayed `GET` records a sanitized fixture
and replays under `CI=1` with the upstream stopped. The configured header value appears in no file
under `.mock-cache`. A `PATCH` is refused without `allowMutations` and recorded with it. An
unguarded route fails with its message and records with `allowUnguarded`.

**Phase 3. Dynamic relay.** `CaptureOptions`, the capture store, seed closing at the first mutation,
`patch` and `id` behaviors from mutations, and `/__generate`. Needs RFC A Phase 3.

Gate: a test that relays two reads and one create against the local upstream emits a seed holding
both read resources and one `id` behavior. Starting the emitted program in a second test, with the
upstream stopped, records the same three fixtures byte for byte.

### Ecosystem implications

- No lint rule and no deprecation. The types reject a malformed protocol.
- The holodeck server makes outbound requests only to the configured `target`, and only while a
  test that started a relay is recording.
- Any test framework works, as for programs.

## How we teach this

The vision's "VCR Style" page becomes a guide page, "Recording against a real API", under the
testing section that #11169 adds. It teaches, in order: put the upstream and its credentials in
`launchProgram` from environment variables and never commit them; guard every route you relay with
a protocol and a sanitizer; start with `startRelay(this, { router })` and read the `.mock-cache`
diff before committing; leave `allowMutations` off unless the upstream is disposable; and turn a
recorded scene into a program with `capture`. The server setup page gains the `relay` option.
Troubleshooting gains the four errors above, indexed by their text. The holodeck skills index gets a
row for a skill that covers guarding a route, relaying a test, and reviewing the fixture diff.

## Drawbacks

- Secrets are one mistake away from git. The sanitizer is the author's code, the request text is
  not sanitized, and the `.mock-cache` diff is the last line of defense.
- A live API makes brittle tests. Values change between recordings, and re-recording churns
  fixtures unless the upstream serves a controlled dataset.
- Replay cannot validate. Protocols run only while recording, so a fixture recorded before a
  protocol tightened still passes CI.
- The server gains an outbound route. It forwards only to the configured target, but a recording
  session now needs network access and can hit rate limits.
- Two ways to get a fixture per route, program or relay, and a test author has to choose.
- Dynamic relay's output is source that nobody wrote, and it needs review like any generated code.

## Alternatives

### Valibot as the schema library

The vision wrote protocols in Valibot and shipped it as a dependency. Standard Schema v1 is a
tiny interface Valibot, Zod, ArkType, and others implement, and copying it costs holodeck nothing.
Valibot stays the documented example.

### Sanitizing on the server

The server holds the credentials, so it could also strip the response. Rejected for the reason RFC
A gave for programs: the server runs in a worker that receives options as data, so a sanitizer
written in the test app could not reach it, and a server-side sanitizer could only be
configuration, not code.

### Relaying from the application's own `fetch`

A test could call the real API directly and hand the response to a mock helper. Rejected: the
credentials would be in the browser bundle, and the fixture would be whatever the test wrote,
unvalidated.

### No mutation gate

Forwarding every method and trusting the author. Rejected: one recording session against a
production API with a `DELETE` in it is a bad day.

### Prior art

The Rails VCR gem's `filter_sensitive_data` and `before_record` hooks are the sanitizer, and its
`:new_episodes` mode, which records only unmatched requests, is RFC A's open question about
recording missing fixtures. Polly.js's `passthrough` and `beforePersist` map onto relay and
`sanitize`, and its `recordIfMissing` is the same open question. MSW's `bypass` and `passthrough`
send a request to the real network without recording, which is the half of relay that needs no
protocol. Playwright's `routeFromHAR` with `update: true` re-records from the live server and has
the same brittleness this RFC warns about. WireMock's record-and-playback proxies to a target and
saves stub mappings, the closest analogue to dynamic relay, and its stubs are generated source in
the same sense as a generated program.

## Unresolved questions

1. Whether the schema's output value proceeds in every mode, or only `sanitize` may change a body.
   See the decision note under [Safety protocols](#safety-protocols).
2. Whether an unguarded route relays or fails by default. See the note under
   [Static relay](#static-relay).
3. The generated program's file format and loader. See the note under
   [Dynamic relay](#dynamic-relay).
4. Sanitizing request text, which changes the fixture key. See the note under
   [The fixture contract](#the-fixture-contract).
5. Where the mutation rule lives. This RFC fixes it on the server as data. The vision's
   `isMutationRequest` hook would let a client inspect headers, but a function cannot reach the
   server worker.
6. Whether a program-served request should be able to relay one route, such as a handler calling
   `ctx.relay(request)`, so a program can mix real and simulated endpoints.
7. Whether protocols should also validate responses from the mock helpers, which have no route.
8. Non-JSON and streaming upstream bodies, which the server cannot store today.
9. Upstream authentication that expires mid-run, such as a token refresh.
