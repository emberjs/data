---
title: Edge Router
description: Proposes a lazily loaded client router whose routes keep their data fetching apart from their rendering, so that a URL can be turned into its list of requests without any rendering, those requests can be optimized with request muxing and multi-entry documents, and they can run early in a SharedWorker or edge function (EdgePipes).
warp-drive-rfc: 8
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
  - framework
prs:
  accepted:
project-link:
suite:
---

<!--
Numbering note: 0007 is claimed by the open "virtualized resources" RFC PR, so this RFC uses 0008.
Check rfcs/ again at merge time and renumber to the next unused number if needed.
-->

# Edge Router

## Summary

This RFC adds the **Edge Router**, a client router built for WarpDrive. Routes live in a single
route map. Every route handler in the map is a pair of lazy `import()`s:

- a **fetch module**, which is pure and knows nothing about rendering. It turns a route's params
  into named request descriptors.
- a **render module**, which receives the results of those requests.

Because the two are separate, the fetch half of an app can be lifted out and run headless with
nothing rendered: `url => FetchPlan`, which is a dependency graph of requests. The router runs
the plan through the `RequestManager`. It runs requests in parallel by default, dedupes them,
multiplexes them into fewer transport requests, and delivers them to the cache in one
transaction. The same plan can run ahead of the client, in a SharedWorker or an edge function
(an **EdgePipe**). An EdgePipe streams back replayable responses that the client's handler
chain uses in place of the network.

For Ember, the Edge Router plugs into the [Route Manager API](https://github.com/emberjs/rfcs/pull/1169)
(`setRouteManager`, `routeCapabilities('1.0')`). The route map generates Ember's `Router.map`,
and each route runs through an Edge Router route manager. Other frameworks and headless
environments use the router's own recognizer and history integration.

## Motivation

Data loading in a typical SPA works like this:

1. Assets download.
2. The app boots.
3. The router recognizes the URL.
4. Each nested route's model hook runs, one after another.
5. Each hook's requests go out from the device over the slowest network link involved.

Every step waits on the one before it. By the time the page first renders it has waited through
two waterfalls: assets and then requests. SSR removes the asset waterfall for the first page load
only. It costs a server render per request, it introduces a double-fetch and rehydration problem,
and it does nothing for later navigations.

[EdgePipes](https://runspired.com/2024/12/01/edge-pipes.html) proposes a different approach.
Only the router and the fetch hooks are lifted out of the app. They run in an edge function or
SharedWorker, and the output is not a page. It is "a streamable payload containing a fully
replayable response for each request made by the fetch hooks". The idea rests on these premises:

- Edge-to-datacenter links are faster and more reliable than device-to-datacenter links.
- A minimal router plus fetch hooks boots far faster than the full app.
- The client can manage its requests well enough to use the responses that come back.
- N responses sent through one pipe arrive faster, in aggregate, than N separate requests.

The same machinery also covers prefetching routes the user is likely to visit next.

The [roadmap](/guides/contributing/ROADMAP.md) lists this idea as "An EdgeRouter and SSD (Server
Side Data) Tooling". Three prerequisites from the post decide the design:

1. The router and fetch hooks must be fully separable from rendering.
2. Fetch hooks must not block by design. Waterfalls are allowed only as explicitly chained hooks,
   and blocking that the data actually needs must be told apart from blocking for UX reasons.
3. The fetch process must be managed on the client.

No current router meets all three:

- Ember's classic `model()` hooks run in a waterfall.
- `model()` hooks can reach anything through the owner.
- `model()` hooks are coupled to controllers and templates.
- Returning a `Future` from `model()` makes the route wait, so apps wrap it in an object, as the
  [pagination guide](/guides/the-manual/experiments/pagination.md#route-driven-navigation) shows.

In the WarpDrive issue tracker:

- [#8855](https://github.com/warp-drive-data/warp-drive/issues/8855) (Multiplex Requests) says
  that "a smarter router could also multiplex across routes", with per-request multiplexing
  offered only as a stopgap.
- [#9518](https://github.com/warp-drive-data/warp-drive/issues/9518) names multi-entry graphs
  and multiplexed responses as problems that need "a single solution".

Several pieces are already in progress but have nothing driving them from the level of a whole
page:

- IMUX handler: [#10103](https://github.com/warp-drive-data/warp-drive/pull/10103)
- named document entries: [#11154](https://github.com/warp-drive-data/warp-drive/pull/11154)
- AQL `q:entries`: [#11087](https://github.com/warp-drive-data/warp-drive/pull/11087)
- transactional notifications: [RFC 1](/rfcs/0001-warp-drive-transactional-notifications.md)
- request dedupe and the DataWorker

Ember's Route Manager API, now implemented, finally makes it possible to plug a non-classic,
parallel-loading route implementation into Ember apps without forking the router.

## Detailed design

### Terminology

- **Route map**: one tree of route definitions. It holds path patterns, names, and a
  `fetch`/`render` pair of lazy imports for each route.
- **Fetch module**: a route's data half. It declares params and query-param schemas and a
  synchronous, pure `requests()` function that returns named **entries**.
- **Entry**: a named request descriptor (`RequestInfo`) or a dependent descriptor produced from
  earlier results. Entries are descriptions, never in-flight `Future`s.
- **Render module**: a route's rendering half, meaning its component. It receives the route's
  entries as `@route`.
- **FetchPlan**: the result of matching a URL against the route map and calling every matched
  fetch module. It is a DAG of entries across all matched routes, from root to leaf.
- **Wave**: a set of plan nodes whose dependencies are all satisfied, so they can be issued
  together.
- **Mux**: sending the N logical requests of a wave as fewer transport requests, then splitting
  the transport responses back into N ordinary responses (**demux**).
- **Multi-entry document**: one cached document with several named roots
  ([#11154](https://github.com/warp-drive-data/warp-drive/pull/11154)). The router can optionally
  merge a wave into one of these.
- **EdgePipe**: an environment that runs a FetchPlan away from the UI thread (an edge function
  or a SharedWorker) and streams replayable responses back.

### Packages

The work ships first as `@warp-drive/experiments/router` and graduates to `@warp-drive/router`.
The table uses the graduated names.

| Entry point | Contents |
| --- | --- |
| `@warp-drive/router` | `defineRoutes`, `defineFetch`, `after`, `block`, `createRouter`, recognizer, types |
| `@warp-drive/router/headless` | `plan(routes, url, options)` and `execute(plan, requestManager, options)` |
| `@warp-drive/router/edge` | `createEdgePipe()`, a standard `(Request) => Promise<Response>` handler |
| `@warp-drive/utilities/handlers` | `MuxHandler`, `EdgePipeHandler` |
| `@warp-drive/ember/router` | `mapRoutes`, `registerRoutes`, and the Edge route manager and wrapper |

Nothing in `@warp-drive/router`, `/headless` or `/edge` may depend on a framework, the DOM, or the
`Store`. They depend only on `@warp-drive/core/types` and on the `RequestManager` contract.

### The route map

```ts
// app/routes.ts
import { defineRoutes } from '@warp-drive/router';

export default defineRoutes({
  application: {
    path: '/',
    fetch: () => import('./routes/application.fetch'),
    render: () => import('./routes/application.gts'),
    children: {
      org: {
        path: 'orgs/:orgId',
        fetch: () => import('./routes/org.fetch'),
        render: () => import('./routes/org.gts'),
        children: {
          project: {
            path: 'projects/:projectId',
            fetch: () => import('./routes/org/project.fetch'),
            render: () => import('./routes/org/project.gts'),
          },
        },
      },
    },
  },
});
```

- A route's full name is its key path joined with `.` (`application.org.project`), following
  Ember's convention.
- Siblings are recognized in declaration order.
- Paths support static segments, `:dynamic` segments, and `*wildcard` segments. The recognizer's
  results must match Ember's for this syntax, and a shared test suite checks that they do.
- `fetch` and `render` are both optional. A route with no `fetch` contributes nothing to the
  plan. A route with no `render` renders its outlet.
- The `path`, `fetch` and `render` values must be static literals. That lets the build plugin
  (see [Build output](#build-output)) produce the edge entry without running the app.

### Fetch modules

```ts
// app/routes/org.fetch.ts
import { defineFetch, after, block } from '@warp-drive/router';
import { findRecord, query } from '@warp-drive/utilities/json-api';
import type { Organization, Project, User } from '../schemas';

export default defineFetch({
  params: { orgId: 'string' },
  query: { page: { type: 'number', default: 1 } },

  requests: ({ params, query }) => ({
    // UX-blocking: the route does not render until this settles
    org: block(findRecord<Organization>('organization', params.orgId)),

    // Non-blocking: rendered with loading state via <Request />
    projects: query<Project>('project', {
      filter: { org: params.orgId },
      page: { number: query.page },
    }),

    // Needs-blocking: this depends on the org's response, so it runs in a later wave
    owners: after(['org'], ({ org }) =>
      query<User>('user', { filter: { id: org.data.relationships.owners.data.map((r) => r.id) } })
    ),
  }),
});
```

#### Contract

- `requests()` is synchronous and deterministic. It depends only on these inputs:
  - `params`: the dynamic segments, parsed and typed by the `params` schema;
  - `query`: the query params, parsed and typed with defaults by the `query` schema;
  - `env`: see [Environment](#environment).
- It returns a record of entries. Each entry is one of:
  - a `RequestInfo`, usually from a builder;
  - `block(entry)`: the route's render waits for this entry. This is blocking for UX reasons.
  - `after(deps, fn)`: a dependent entry. `fn` receives the *raw response content* of each
    dependency and returns a `RequestInfo`, or `null` to skip. This is blocking because the data
    needs it.
- A dependency may name an entry of the same route (`'org'`) or of an ancestor
  (`'application.session'`). It may never name a descendant or sibling route. This mirrors the
  Route Manager's `getAncestorPromise`, which searches only ancestors so that it cannot deadlock.
- Dependent entries receive raw content, not reactive resources. That keeps the plan runnable
  where no `Store` exists, and it gives the same result on the client and at the edge.
- `params`/`query` schemas also decide which inputs make a plan node distinct. Two navigations
  whose schema-parsed inputs are equal produce identical descriptors, so the client can skip a
  route whose entries it already has.

#### Allowed imports

A fetch module may import only these:

- `@warp-drive/router`;
- the request builders in `@warp-drive/utilities/*`;
- type-only imports;
- other modules that follow the same rule.

It cannot see the owner, services, the `Store`, `window`, or `document`. A new
`eslint-plugin-warp-drive` rule, `fetch-module-imports`, enforces this, and the build plugin
fails the build on a violation. This restriction is what makes the edge entry small, and what
would let it be compiled ahead of time (for example with Bun or Static Hermes).

#### Environment

Some request inputs are not in the URL, such as the locale, an API version, or the current
account id. These are declared once, when the router is created:

```ts
createRouter({ routes, env: () => ({ locale: navigator.language }) });
createEdgePipe({ routes, env: (request) => ({ locale: request.headers.get('accept-language') }) });
```

The `env` value must be serializable. It must never carry credentials. Credentials stay with the
handler chain: cookies and `Authorization` headers are forwarded, and never appear in
descriptors.

### Render modules

A render module's default export is a component that receives `@route`. `@route` holds one value
per entry: a `Future` for that request, or `null` for a skipped dependent entry.

```gts
// app/routes/org.gts
import { Request } from '@warp-drive/ember';

<template>
  <h1>{{@route.org.content.data.name}}</h1>  {{! org is block()ed, so it has already resolved }}
  <Request @request={{@route.projects}}>
    <:loading>…</:loading>
    <:content as |result|>{{#each result.data as |p|}}<ProjectRow @project={{p}} />{{/each}}</:content>
  </Request>
  {{outlet}}
</template>
```

Loading states and error states are handled in the render module, usually with `<Request />`.
The Edge Router has no loading or error *routes*. The route wrapper also provides `@route`
through context, as sketched in item 6 of the roadmap. It uses Ember's Context API
([emberjs/rfcs#1200](https://github.com/emberjs/rfcs/pull/1200)) when that is available.

### The FetchPlan

```ts
import { plan, execute } from '@warp-drive/router/headless';

const fetchPlan = await plan(routes, 'https://app.example.com/orgs/1?page=2', { env });
// loads only fetch modules; no render module is ever imported

interface FetchPlan {
  url: string;
  routes: string[];          // matched route names, root → leaf
  nodes: PlanNode[];
}
interface PlanNode {
  id: string;                // `${routeName}:${entryName}`, e.g. 'application.org:owners'
  request: RequestInfo | null; // null for dependent nodes until their deps settle
  key: string | null;        // the RequestKey the cache will use, when one can be derived
  dependsOn: string[];       // node ids
  block: boolean;
}

const result = await execute(fetchPlan, requestManager, { signal, have: knownKeys });
```

Execution works like this:

- Nodes with no pending dependencies form the first wave. Each time a node settles, the next wave
  is computed from the nodes it unblocked. Nodes from every matched route level run in parallel.
  Nesting never causes a waterfall on its own.
- If a dependency fails, its dependent node fails with that error, and the route renders it
  through `<Request />` like any other failure. The failure spreads only along declared
  dependencies.
- `have` is a set of RequestKeys the caller already holds as fresh. Matching nodes are skipped.
  This is the post's skip hint for nested routes.
- Every request goes through the given `RequestManager`, so the normal handler chain applies:
  cache policy, dedupe by RequestKey, and any mux or pipe handlers.
- `execute` resolves once every node has settled. On the client the router does not wait for
  that. It hands each route its `Future`s as soon as they are issued.

On the client, all responses in one wave are committed to the cache in a single transaction
([RFC 1](/rfcs/0001-warp-drive-transactional-notifications.md)), and a route's `block` entries
resolve together. That provides the "resolve together, notify once" behaviour asked for in
[#8855](https://github.com/warp-drive-data/warp-drive/issues/8855), scoped to one navigation
instead of flagged on each request.

### Muxing and multi-entry documents

A wave is exactly the set of requests that is safe to send together. `execute` marks every
request in a wave with the same `options.wave` id and the wave's size. `MuxHandler` uses those
marks:

```ts
import { MuxHandler } from '@warp-drive/utilities/handlers';

manager.use([
  MuxHandler({
    transports: [
      jsonApiEntries({ endpoint: '/api/query' }),   // AQL / JSON:API QUERY `q:entries`
      httpBatch({ endpoint: '/api/batch' }),         // generic [{ method, url, headers, body }]
    ],
  }),
  Fetch,
]);
```

- `MuxHandler` collects the requests of a wave until the wave is complete or a microtask
  passes. Each **transport** reports which requests it accepts. The handler groups the accepted
  requests, sends one transport request per group, and passes the rest to `next()` unchanged.
- **Demux**: the transport splits its response into one `StructuredDocument` per logical request,
  with that request's own `request` and a synthesized `ResponseInfo`. From the `CacheHandler`
  up, nothing can tell a muxed request from an unmuxed one. The cache stores each under its own
  RequestKey, so no cache changes are needed.
- If a transport request fails, every logical request it carried fails with that error. If the
  transport reports a failure for one logical request, only that request fails.
- **Multi-entry merging** is opt-in (`MuxHandler({ merge: 'entries' })`) and depends on
  [#11154](https://github.com/warp-drive-data/warp-drive/pull/11154). Instead of N documents, the
  wave becomes one document whose named entries map back to plan node ids. Each node's `Future`
  resolves to its entry. This trades N cache documents for one document with several roots, which
  can be invalidated together.
- Requests that did not come from a plan never carry a wave id, so `MuxHandler` passes them
  through. The IMUX handler ([#10103](https://github.com/warp-drive-data/warp-drive/pull/10103))
  goes the other way (one request becomes N) and can be combined with `MuxHandler`.

### EdgePipes

```ts
// edge/index.ts — deployable to any runtime with fetch-standard handlers, or a SharedWorker
import { createEdgePipe } from '@warp-drive/router/edge';
import routes from 'virtual:warp-drive/edge-routes';   // emitted by the build plugin

export default {
  fetch: createEdgePipe({
    routes,
    handlers: [MuxHandler({ transports: [...] }), Fetch],
    env: (request) => ({ locale: request.headers.get('accept-language') }),
    forward: ['cookie', 'authorization'],
  }),
};
```

`createEdgePipe` accepts `POST <pipe endpoint>` with a body of `{ url, have?: string[] }`. It
plans, runs the plan with the forwarded credentials, and streams the response back as
newline-delimited JSON records. The format is versioned:

```
{"v":1,"type":"plan","url":"…","nodes":[{"id":"application.org:org","key":"…"}, …]}
{"type":"response","id":"application.org:org","key":"…","request":{…},"response":{"status":200,"headers":[…]},"body":{…}}
{"type":"error","id":"application.org:owners","response":{"status":404,…},"body":{…}}
{"type":"skip","id":"application:session","reason":"have"}
{"type":"end"}
```

On the client, `EdgePipeHandler` sits near the front of the handler chain, right after the
`CacheHandler`:

- On navigation, the router opens a pipe for the target URL and sends its fresh keys as `have`.
  The handler records the pipe's announced keys. When a request with an announced key arrives,
  it waits for the piped record instead of calling `next()`.
- A piped record is **replayed**: it becomes the same `StructuredDocument` that `Fetch` would
  have produced, and it flows up through the normal chain and the cache. There is no rendered
  state and no cache snapshot, so there is nothing to rehydrate and no double request.
  `Cache.dump`/`hydrate` are not required.
- If the pipe fails, is aborted, or ends without a record for an announced key, those requests
  fall back to `next()`. EdgePipes are strictly an enhancement.
- **Initial load**: an edge function that serves the HTML document can start the plan for the
  requested URL straight away. It embeds a pipe id in the document, and `EdgePipeHandler` joins
  the plan already running at the edge instead of starting a new one. Alternatively, the edge
  function can inline the records in the document stream.
- **Prefetch**: `router.prefetch(url, { target: 'cache' | 'edge' })`.
  - `cache` runs the pipe and replays the records into the local cache.
  - `edge` asks the pipe only to warm an edge cache. The device pays for the data only if the
    user navigates to the page. The pipe's edge cache is keyed by RequestKey plus the forwarded
    credentials' identity, and it follows the response's cache headers.
- A SharedWorker pipe (built on the DataWorker experiment) uses the same record format over
  `postMessage`. It gives cross-tab dedupe and off-thread prefetch without any server.

The pipe does not change the app's security model. It is a pass-through that holds the user's
credentials only for the length of one plan. It can reach only the origins in its handler
configuration. It sends back raw API responses, so it creates no new data surface.

### Build output

A Vite and Babel plugin, shipped with `@warp-drive/build-config`, emits
`virtual:warp-drive/edge-routes`. This is the route map with every `render` property removed.
Following the `fetch` imports from it gives the complete data half of the app. The plugin
rejects a route map that is not static, and it rejects any fetch module that breaks the import
rule. The client bundle is unchanged: the router `import()`s a route's fetch module and render
module in parallel on navigation, and it can import the fetch modules of prefetch targets without
importing their render modules.

### Standalone client router

Outside Ember, `createRouter({ routes, requestManager, env, history })` is a complete client
router:

- `recognize(url)`, `urlFor(name, params, query)`
- `transitionTo(url | name, …)` / `replaceWith(…)`
- `currentRoute`, as reactive state
- `prefetch(url, options)`

A navigation plays out as follows:

1. The route map recognizes the URL.
2. The router aborts the previous navigation's `AbortSignal`. That cancels only the requests no
   other active route shares.
3. The router imports the fetch and render modules of every matched level in parallel.
4. It plans and executes the fetch plan.
5. It renders each level once that level's render module has loaded and its `block` entries have
   settled.

Rendering each level is the job of a framework adapter, such as `@warp-drive/react/router`
(`<RouterProvider>`, `<Outlet>`, `<Link>`). This RFC specifies the adapter contract, which is
`(level, Component, route, outlet) => rendered`. Individual adapters are follow-ups.

### Ember integration

Ember's router keeps URL recognition, history, `LinkTo` and the `RouterService`. The route map is
the single source of truth for both:

```ts
// app/router.ts
import EmberRouter from '@embroider/router';
import { mapRoutes } from '@warp-drive/ember/router';
import routes from './routes';

export default class Router extends EmberRouter { /* location, rootURL */ }
Router.map(function () { mapRoutes(this, routes); });

// app/app.ts (or an instance initializer)
import { registerRoutes } from '@warp-drive/ember/router';
registerRoutes(owner, routes, { store: 'service:store' });   // registers route:<name> factories
```

`registerRoutes` registers each route as a `route:<name>` factory whose class uses
`setRouteManager` with the Edge route manager. It declares
`capabilities = routeCapabilities('1.0')`, without `classicInterop`. The lifecycle maps onto the
manager hooks like this:

| Route Manager hook | Edge Router behavior |
| --- | --- |
| `createRoute(factory, { name })` | Returns a bucket `{ name, definition }`. Nothing is instantiated. |
| `willEnter` | Sync. On the first call in a navigation (keyed by its `signal`), starts importing the fetch module of every level in `state.to` and starts one shared plan for the whole navigation. |
| `enter` | Waits for this level's nodes in the shared plan and returns its `@route` object. The promise resolves once the level's `block` entries settle. It calls `getAncestorPromise` only when an entry has an `after()` dependency on an ancestor. |
| `getInvokable` | `await definition.render()`. Ember runs this in parallel with `enter`. |
| `getRouteWrapper` | A stable `EdgeOutlet`. It provides `@route` through context and renders `<@Component @route={{@context}} @outlet={{@outlet}} />`. |
| `signal` / `cancel` | Aborting stops nodes that only this navigation needs. Dedupe keeps shared in-flight requests alive. |
| `exit` / `didExit` | Releases the level's `@route` object. |
| `willExit`, `didEnter` | No-ops. |

This gives Ember apps parallel loading across every nested level and a single commit per wave.
Mux and EdgePipe support apply as soon as the handlers are installed.

Edge routes and classic routes can be mixed in the same tree ("zebra-striping"). A classic child
of an edge route sees the edge route's `@route` object as its parent model. An edge child of a
classic route cannot declare an `after()` dependency on it. This constraint is also what lets
apps migrate one route at a time.

Query params are read from `RouteInfo.queryParams` and parsed with the fetch module's `query`
schema. Controllers and QP config for edge routes do not exist. The existing `param()` decorator
in `@warp-drive/experiments/storage` ("operates as a normal `@field` until a router integration
consumes it") becomes one consumer: a render module can write query state that the router
serializes into the URL.

Redirects are not a fetch-module concern. Fetch modules describe data and nothing else. An edge
route that has to redirect based on data does it from its render module or through the
`RouterService`.

### Out of scope

- Server-side *rendering*. The Edge Router never renders at the edge.
- Mutations. Fetch modules produce only read requests (`GET`, `QUERY`, or `POST` with an explicit
  `cacheOptions.key`).
- Replacing Ember's router. If Ember later exposes a pluggable recognizer or history layer, the
  Ember integration can move to it without changing the route map or the fetch modules.

## How we teach this

The name for the router's data half is the **fetch module**. "Loader" is deliberately avoided,
because React Router and Remix loaders may be async, may have side effects, and may reach
anything. The mental model to teach is: *a route's fetch module is a pure function from a URL to
a list of requests; its render module is what shows them*. Everything else, including
parallelism, muxing, pipes and prefetch, is an optimization the app enables through handlers, not
code it writes in its routes.

The docs would add these:

- a new guide section, "Routing", under the manual. It covers the route map, fetch modules and
  render modules, `block`/`after`, and the headless `plan`.
- a "Going to the Edge" guide covering EdgePipes, deployment targets, and prefetch.
- an Ember migration guide: turning one classic route into an edge route, and mixing the two.
- API docs for every new export, plus the `fetch-module-imports` lint rule.
- updated pagination and `<Request />` guides that show `@route` in place of wrapping a `Future`
  in `model()`.

The existing request and handler guides stay accurate. Muxing and pipes are taught as handlers,
which continues the Chain of Responsibility model.

## Drawbacks

- **Another router.** Ember apps get a second way to define route data, and non-Ember users get a
  router that competes with their framework's default. The Ember integration is deliberately thin
  so that it can follow Ember's own router work instead of racing it.
- **The rules are strict.** Pure, synchronous fetch modules with limited imports are the whole
  point, but some existing `model()` hooks cannot be expressed this way, for example hooks that
  read services or branch on in-memory state. Those routes stay classic.
- **Two recognizers.** In Ember apps, Ember recognizes URLs on the client, while the edge and
  headless paths use WarpDrive's recognizer. The two could disagree. A parity test suite and a
  limited path syntax reduce that risk without removing it.
- **Operations.** EdgePipes add a deployment target, and edge-cache prefetch adds a cache that
  must honor per-user identity. Both are opt-in.
- **Muxing needs server support.** To get the full benefit, backends need a batch or `q:entries`
  endpoint. Without one, the router still gives parallel, deduped, transactional loading.

## Alternatives

- **Futures returned from `fetch(params)`**, as sketched in item 6 of the roadmap. It is simpler,
  but a `Future` is a request that has already started. It cannot be planned, skipped, muxed, or
  run elsewhere. Descriptors keep every one of those choices open, and the router still hands
  render modules `Future`s.
- **Per-request `cacheOptions.multiplex`**
  ([#8855](https://github.com/warp-drive-data/warp-drive/issues/8855)) and **coalesced responses**
  ([#8856](https://github.com/warp-drive-data/warp-drive/issues/8856)) work without a router, but
  they have to guess at timing. A plan knows exactly which requests belong together.
- **SSR in data-only mode** (the FastBoot approach used at LinkedIn) runs the whole app to get
  its data. It is expensive, it cannot help later navigations, and it was soft-deprecated in
  [#8475](https://github.com/warp-drive-data/warp-drive/issues/8475).
- **React Server Components / Next.js** tie data fetching to server rendering and to server
  placement.
- **Remix / React Router loaders and TanStack Router loaders** run in parallel, but they are
  arbitrary async functions, so they cannot be planned without running them.
- **Relay EntryPoints and preloaded queries** are the closest prior art: they separate a route's
  queries from its components so that the queries can start before the code loads. This RFC takes
  that separation further, into plans that can be muxed and run at the edge, and applies it to any
  API format instead of only GraphQL.
- **Doing nothing** leaves each app to hand-build its own parallel loading. Multi-entry and mux
  work would then have nothing to drive it.

## Unresolved questions

- Is `fetch` the right property name? It shadows the global in people's heads, if not in scope.
  Candidates are `data` and `requests`.
- Error semantics for `block` entries: should a failed `block` entry fail the route level, or be
  handed to the render module as a rejected `Future` like other entries?
- Should `after()` dependency functions also accept a reactive document on the client, at the
  cost of different behaviour at the edge?
- The exact identity rules for edge-cache prefetch, and how invalidation signals reach the edge.
- Whether `MuxHandler`'s transports belong in `@warp-drive/utilities` or with each format
  (`@warp-drive/json-api`).
- How a wave's single transaction interacts with RFC 1's request-state signals for routes that
  are still being entered when the next wave commits.
- Whether the Ember integration should wait for Ember's Context API or ship its own provider
  first.
