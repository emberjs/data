# VCR Style

VCR refers to a style of request mocking named for a common [20th century technology](https://en.wikipedia.org/wiki/Videocassette_recorder) that was popularized by the [Rails VCR gem](https://github.com/vcr/vcr) and later by [Polly.js](
https://netflix.github.io/pollyjs/#/README) and [Postman](https://learning.postman.com/docs/designing-and-developing-your-api/mocking-data/setting-up-mock/).

The basic premise of VCR tests is that during development real network requests made against an API are recorded, then replayed later whenever the test suite is run.

Holodeck supports dynamically creating and updating [HoloPrograms](./holo-programs.md) from requests made against your real API in two modes:

- [Static Relay](#static-relay) in which requests are recorded and replayed exactly as initially seen (*caveat* see [Safety Protocols](./holo-programs.md#safety-protocols))
- [Dynamic Relay](#dynamic-relay) in which some-or-all requests made during a test or app session are intercepted by a temporary HoloProgram and used to update its associated Store and generate a new HoloProgram.

## Static Relay

In Static relay, Holodeck re-issues the requests it receives against your real API. Responses are passed through a [Safety Protocol](./holo-programs.md#safety-protocols) before being cached for replay.

No HoloProgram is generated and no other response alteration is possible. When a test needs its mock requests updated, the requests should be recorded against the real-api again.

Tests written using the static relay are potentially brittle if care is not taken to write the test in a way that does not expect specific values to be returned from the API.

If testing specific values is a requirement, a consistent dataset should be used for the API being recorded against. In limited simple scenarios a [Safety Protocol](./holo-programs.md#safety-protocols) may be used to ensure specific values remain consistent across recordings, but this should only be utilized for primitive values and not to adjust data such as relationships or resource identity.

## Dynamic Relay

In Dynamic relay, Holodeck re-issues the requests it receives against your real API. Responses are passed through a [Safety Protocol](./holo-programs.md#safety-protocols) before being delivered to an associated Store instance scoped to the current context.

This store is what will be serialized as the seed for a new HoloProgram. Responses are generated from this store using the configured route handlers.

Mutations (requests which update state) can also be recorded, though you may find it more pragmatic to stop recording at the first mutation.

By default, requests using the HTTP methods PUT, PATCH, DELETE and POST (when no `Http-Method-Override=QUERY` header is present) are treated as mutations. This is configurable via the `isMutationRequest` hook in your holodeck config.

The first mutation encountered results in the store being serialized as the seed right away at that point before the mutation is applied.

Holodeck then issues the request against the real API. Any delta to the store after the real API responds is then serialized and added to the program as a [patch behavior](./holo-programs.md#available-behaviors).

If the result is the creation of a single new record in the store, its id will be added to the program as an [id behavior](./holo-programs.md#available-behaviors). If the result is multiple new records, only the patch behavior is added.
