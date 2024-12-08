# HoloPrograms

<br>

**HoloPrograms** are sets of simulated API interactions that can be used to quickly
set the scene for a test.

<br>

**Table of Contents**

- Using HoloPrograms
  - [Using a HoloProgram](#using-a-holoprogram)
  - [Adjusting a HoloProgram from Within a Test](#adjusting-a-holoprogram-from-within-a-test)
  - [HoloProgam Replay](#holoprogram-replay)
- Creating HoloPrograms
  - [Creating a HoloProgram](#creating-a-holoprogram)
  - [Route Handlers](#1-shared-route-handlers)
  - [Seed Data](#2-seed-data)
  - [Easy Mode for Building JSON for Seeds](#easy-mode-for-building-up-json-for-seeds)
  - [Auto-Generating HoloPrograms](#auto-generating-holoprograms)
  - [Defining HoloProgram Behaviors](#3-holoprogram-specific-behaviors)
  - [Available Behaviors](#available-behaviors)

<br>

---

<br>

### Using a HoloProgram

A test declares upfront what HoloProgram it is using.

```ts
import { module, test } from 'qunit';
import { startProgram, POST } from '@warp-drive/holodeck';

module('First Contact', function() {
  test('borg are vulnerable to holographic bullets', async function(assert) {
    await startProgram(this, 'the-big-goodbye_chapter-13');

    // now all requests made in this test will be resolved using the program
    // defined as 'the-big-goodbye_chapter-13'

  });
});
```

<br>

### Adjusting a HoloProgram from Within a Test

HoloPrograms can be adjusted throughout a test if required. For instance, to add handling for a request that wasn't in the original program, or to provide a different response to the next request.

```ts
import { module, test } from 'qunit';
import { startProgram , POST } from '@warp-drive/holodeck';

module('First Contact', function() {
  test('borg are vulnerable to holographic bullets', async function(assert) {
    await startProgram(this, 'the-big-goodbye_chapter-13');

    // now the next POST request to `/casualty` will respond with this payload
    // note: this will cause this particular request to NOT update any HoloProgram
    // state as it will no longer be handled by the Program
    await POST(this, '/casualty', () => ({
      data: {
        id: '3',
        type: 'casualty',
        attributes: {
          species: 'human',
          affiliation: 'borg',
          name: 'Ensign Lynch',
        },
      },
    });

  });
});
```

To update the state of a HoloProgram from within the test instead, we can use `updateProgram`

```ts
import { module, test } from 'qunit';
import { startProgram, updateProgram } from '@warp-drive/holodeck';

module('First Contact', function() {
  test('borg are vulnerable to holographic bullets', async function(assert) {
    await startProgram(this, 'The Big Boodbye | Chapter 13');

    // the payload provided here will be upserted directly into the program
    // cache, and thus should match the cache format in use.
    // updates to a program from within a test will not affect any other tests
    await updateProgram(this, () => ({
      data: {
        id: '3',
        type: 'casualty',
        attributes: {
          species: 'human',
          affiliation: 'borg',
          name: 'Ensign Lynch',
        },
      },
    });

    // any requests from here out that return `casualty:3`
    // will have the updated data

  });
});
```

<br>

### HoloProgram Replay

HoloPrograms record all requests for replay the same as any other mocked request,
thus the program does not activate in replay mode.

<br>

---

<br>

## Creating a HoloProgram

Every HoloProgram consists of three things: route handlers, a seed, and preset behaviors.

<br>

### 1. Shared Route Handlers

In holodeck, all HoloPrograms utilize the same underlying route handlers. This encourages writing realistic handlers which in turn makes authoring new tests faster and easier.

Route Handlers are responsible for parsing a request and providing a response. This typically takes the form of querying (and updating) the HoloProgram's store to match the request's intent.

Note: any updates made to the store affect future requests within the same test, making it easy to generate realistic API scenarios.

```ts
import { Router } from '@warp-drive/holodeck';

// The holodeck router encourages lazy-evaluation as a pattern
// in order to ensure the server boots and begins responding to
// request as quickly as possible
//
// the router map is only generated if holodeck needs to record
export default new Router((r) => {
  r.GET('/officers', async () => {
    // the cost of importing and parsing the handler code is only paid if
    // a matching request is made.
    return (await import('./handlers/officers')).GET;
  })
});
```

The handler type is:

```ts
interface RouteHandler {
  request(context: Context, request: Request): Response | Value;

  protocols?(v: HolodeckValibot): Record<string, SafetyProtocol>;

  requestProtocol?(request: Request): keyof ReturnType<this.protocols>;
  responseProtocol?(response: Response): keyof ReturnType<this.protocols>;
}
```

See also [Safety Protocols](#safety-protocols)


<br>

### 2. Seed Data

While all tests share the same route handlers, each HoloProgram begins from a unique store state.

The store (and its starting state) are encapsulated to the test context and will never leak between tests, even when tests are recording concurrently.

The starting seed data should be an array of json resources in the configured cache format, which can be generated via any mechanism desired.

```ts
import { createProgram } from '@warp-drive/holodeck';
import { fnThatGeneratesJson } from './my-seed';

await createProgram({
  name: 'The Big Goodbye | Chapter 13',
  seed: fnThatGeneratesJson,
});
```

In keeping with the encouraged pattern of lazy evaluation, the seed function only executes if the program needs to be booted for a test in record mode.

<br>

### Easy Mode for Building up JSON for Seeds 

Don't know or understand the cache format? No sweat!

We can use a store instance to generate the data using the record types and API's we are familiar with from our app, and then serialize this to a seed.

In general, this allows us to write fairly composable functions to build up our seed quickly.

For instance:

```ts
import { serializeCache } from '@warp-drive/holodeck';
import Store from 'my-enterprise/services/store';
import type { Officer, Starship } from 'my-enterprise/schema-types';

function generateOfficers(store: Store) {
  const Picard = store.createRecord<Officer>('officer', {
    id: '1',
    name: 'Jean-Luc Picard',
    rank: 'Captain'
  });

  const Riker = store.createRecord<Officer>('officer', {
    id: '2',
    name: 'William Thomas Riker',
    rank: 'First-Officer',
    bestFriend: Picard;
  });

  return [Picard, Riker];
}

function generateStarship(store: Store, crew: Officer[]) {
  const Enterprise = store.createRecord<Starship>('starship', {
    id: 'NCC-1701-D'
    name: 'Enterprise',
    crew,
  });

  return Enterprise;
}

export function generateSeed() {
  const store = new Store();

  const officers = generateOfficers(store);
  generateStarship(store, officers);

  return serializeCache(store);
}
```

A key feature to be aware of is that because all resources MUST have a primaryKey value, `serializeCache` will assign a uuid-v4 as the primaryKey value for any record you have not assigned one to.

<br>

### 3. HoloProgram Specific Behaviors

Most HoloPrograms will only ever require a seed to go along with the defined route handlers. But sometimes you may want a holoprogram to simulate externalities.

Externalities are things like "the API state updated in between the time a user made their last request and their next one" or "this endpoint should have a delay or timeout".

To handle these sorts of scenarios, HoloPrograms can augment the defined handlers for a specific route:

```ts
import { createProgram } from '@warp-drive/holodeck';
import { generateSeed } from './my-seed';

await createProgram({
  name: 'The Big Goodbye | Chapter 13',
  seed: generateSeed,
  behaviors: (r) => {
    // passing an object as the second param will apply the adjustment to the route
    // on every request
    r.GET('/starships', { delay: 50 });

    // when we pass an array of objects, each object is an adjustment
    // for a single request.
    //
    // The first request to /officers will have a 20ms delay
    // The second request to /officers will have a 100ms delay
    // The third request to /officers will have no delay
    r.GET('/officers', [{ delay: 20 }, { delay: 100 }]);
  }
})
```

<br>

### Auto-Generating HoloPrograms

HoloPrograms can be programatically created! To learn how read about [VCR Style Testing](./vcr-style.md).

<br>

### Available Behaviors

The following behaviors are available:

```ts
type Adjustment = {
  // milliseconds to wait before either invoking the registered
  // handler or responding with an error augmentation
  requestDelay?: number; 

  // milliseconds to wait after invoking the registered handler
  // or preparing an error augmentation before sending the response
  // back to the client
  responseDelay?: number;

  // an error to respond with instead of the handler's usual behavior
  // see also the statusCode utils
  // the usual handler WILL NOT run
  error?: {
    status: number; // >= 400;
    statusText?: string; // will be autopopulated if not provided based on statusCode
    body?: string;
    headers?: Headers | Record<string, string>;
  }

  // update store state only after this request
  // has completed sending its response
  after?: (request: Request, store: Store) => {}

  // CAUTION: this behavior is only utilized if a
  // route handler chooses to use it!
  //
  // When creating new records it can be useful
  // to explicitly declare the desired primaryKey
  // value to use
  //
  // This ID can be accessed by the handler calling
  // `<context>.desiredId()`.
  //
  // For transactional saves (multiple new records in
  // a single request) this should be the id for a
  // primary new record if present, while any other IDs
  // for new records should be contained in a `patch`.
  id?: string | number;

  // CAUTION: this behavior is only utilized if a
  // route handler chooses to use it!
  // 
  // When creating or updating records, sometimes
  // additional fields need to be created or updated.
  //
  // This behavior stores JSON state that should be
  // applied to the store to enable a mutation to 
  // adequately mirror the behavior of the real API.
  //
  // The format of this patch is an array of resource
  // data that could (if needed) be directly upsert to
  // the cache like a seed.
  //
  // The patch can be accessed by the route handler via
  // `<context>.desiredPatch()`. It can be applied either
  // manually in the handler or by the handler calling
  // `<context>.commitDesiredPatch()` or not at all.
  patch?: Value[];
}
```

<br>

---

<br>


## Safety Protocols

An route handler can declare Safety Protocols that are used to
ensure that both inbound requests and outbound responses match expectations of the API.

Safety Protocols are written using [Valibot](https://valibot.dev/) a fast, typed schema-validation library.

### Adding a Safety Protocol

```ts

```

### Filtering Sensitive Data

Safety Protocols enable filtering sensitive data from real API responses by utilizing [Transforms](https://valibot.dev/api/transform/).

While we use Valibot under the hood, Transforms defined on safety protocols are only active when processing the response from a real API request. In all other scenarios the transform passes through the original value.

This allows the same safety protocol to be used to validate and sanitize the shape of the real API response as is used to validate the shape of the mock API response.

### Dynamic Safety Protocols

Some endpoints adjust their behavior based on a request body or header. Protocols can be dynamically swapped.


<br>

---

<br>
