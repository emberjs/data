# Requests

- Next → [Auth Handler](./1-auth.md)
- ⮐ [Requests Guide](../index.md)

## Basic Usage Example

> **Note**
> This example uses [Ember](https://emberjs.com/)
> for convenience.
>
> `@ember-data/request` works with raw javascript
> or any framework of your choosing.

Say you want to show a list of companies and their CEO. Your API returns a list of companies with the related employee records with a payload similar to the one shown below.

```jsonc
{
  "data": [
    {
      "id": "1",
      "type": "company",
      "attributes": { "name": "Auditboard" },
      "relationships": {
        "ceo": {
          "data": { "id": "1", "type": "employee" }
        }
      }
    },
    // ... and 49 more omitted for brevity
  ],
  "included": [
    {
      "id": "1",
      "type": "employee",
      "attributes": {
        "name": "Scott Arnold",
        "profileImage": "https://www.auditboard.com/img/leadership/scott-arnold.jpg"
      }
    }
    // ... and 49 more omitted for brevity
  ],
}
```

> **Note**
> Curious about this format? This is [JSON:API](https://jsonapi.org/format/#document-top-level) using [Cursor Pagination Profiles](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/) and [Sparse Fieldsets](https://jsonapi.org/format/#fetching-sparse-fieldsets)

Because the list is large and our API supports pagination, we want to request just 50 items at a time.

And because we only need the name of each company, and the name
and profile image of its ceo, we want to ask for just that information to be returned.

To get this payload we issue the following http request:

```https
GET /api/companies?fields[company]=name&fields[employee]=name,profileImage&included=ceo&page[size]=10 HTTP/2
Accept: application/vnd.api+json; profile="https://jsonapi.org/profiles/ethanresnick/cursor-pagination"
```

Lets see how we'd approach this request.

## Step 1: lets create a request manager for our app

*app/fetch.ts*
```ts
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

const fetch = new RequestManager();
manager.use([Fetch]);

export default fetch;
```

Our API is a simple HTTP api and all we really need is the
ability to interact with it via `fetch`. While you might be
tempted to just make a fetch request and move on, there's a
few advantages to using a RequestManager here instead.

First, the manager takes care of a few things for us right away
even in this simple form.

 - [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) is wired in
 - The double await goes away (ie no `response = await fetch(); data = await response.json()` )
 - Its simpler to mock for our tests and can even help us provide [advanced parallel and concurrent test mocking](https://github.com/emberjs/data/tree/main/packages/holodeck#readme)
 - It automatically adds test waiters we can use to guard against leaky tests!
 - It gives us a unified interface for managing requests everywhere in our app, not just for this request!

It also sets up nicely in case we later decide to refactor our API, add authentication, adjust needed headers, or add caching.

Second, the [Fetch Handler](https://api.emberjs.com/ember-data/release/classes/Fetch) is doing a lot of heavy lifting for us.

- It normalizes network errors
- It ensures API errors are thrown as errors
- It parses JSON responses (content or errors) into JSON for us and attaches meaningful status information.

Apps may have multiple request managers, but typically just one will do even for extremely large apps.

## Step 2: Configure some request defaults

Since we're interacting with a JSON:API API we can use the request utilities provided by
 [@ember-data/json-api/request](https://github.com/emberjs/data/tree/main/packages/json-api#readme)
to help us construct requests.

Let's configure the utils to interface with this API and use the [Cursor Pagination Profile](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/):

```ts
import { setBuildURLConfig } from '@ember-data/json-api/request';

setBuildURLConfig({
  host: 'https://cloud.example.com',
  namespace: 'api/v1',
  profiles: {
    pagination: "https://jsonapi.org/profiles/ethanresnick/cursor-pagination"
  }
});
```

## Step 3: Lets make a request!

As a reminder, this is the request we want to construct:

```https
GET /api/companies?fields[company]=name&fields[employee]=name,profileImage&included=ceo&page[size]=10 HTTP/2
Accept: application/vnd.api+json; profile="https://jsonapi.org/profiles/ethanresnick/cursor-pagination"
```

The `query` builder from `@ember-data/json-api/request` will do most of the heavy lifting for us,
constructing the url, and making sure headers are attached appropriately.

*app/page.ts*
```ts
import { query } from '@ember-data/json-api/request';
import fetch from './fetch';

// ... execute a request
const { content: collection } = await fetch.request(query('company', {
  include: 'ceo',
  fields: {
    company: 'name',
    employee: ['name', 'profileImage']
  },
  page: {
    size: 10
  }
}));
```

Now, we can make use of the returned data. The has the following structure:

```ts
type StructuredResponse<T> = {
  request: Request;
  response: Response;
  content: T;
}
```

The `json:api` document we got back is available as `content`, so the companies
list is its `data`.

```ts
const companies = collection.data;
```

At first this may feel a little verbose, but this structure ensures we have access to everything,
so for instance if your API stores valuable information as `headers` then `result.response.headers` will give access to that information.

### Requesting via the Store

Requests issued against the store differ in three ways from raw requests.

1. The store's `CacheHandler` will resolve from cache if the request is not stale
2. The store's `CacheHandler` will update the cache if a new request is made
3. The result's `content` will be a `StructuredDocument` whose data property is a list of records instead of raw data.

```ts
import { query } from '@ember-data/json-api/request';

// ... execute a request
const { content: collection } = await store.request(query('company', {
  include: 'ceo',
  fields: {
    company: 'name',
    employee: ['name', 'profileImage']
  },
  page: {
    size: 10
  }
}));

// accessing the data is the same, execept now
// this will be a list of records instead of raw objects
const companies = collection.data;
```

### Pagination

The API response above likely contained a bit more information in the payload than just `data` and `included`. Since we were using the `cursor pagination` profile, the full response likely looked like this:

```jsonc
{
  "data": [
    // ...
  ],
  "included": [
    //...
  ],
  "links": {
    "first": "/api/company?fields[company]=name&fields[employee]=name,profileImage&included=ceo&page[size]=10",
    "prev": null,
    "next": "/api/company?fields[company]=name&fields[employee]=name,profileImage&included=ceo&page[size]=10&page[after]=10",
    "last": "/api/company?fields[company]=name&fields[employee]=name,profileImage&included=ceo&page[size]=10&page[after]=5990",
    "self": "/api/company?fields[company]=name&fields[employee]=name,profileImage&included=ceo&page[size]=10"
  },
  "meta": {
    "page": {
      "total": 6000,
      "maxSize": 100
    }
  }
}
```

This information is also available on the result, and can be used to quickly fetch additional pages in the same
collection without needing to remember all the original parameters.

```ts
const { content: nextPage } = await fetch.request({ url: result.content.links.next });
```

If we were using the cache handler and store, this is built in!

```ts
const nextPage = await collection.next();
```

## Step 4: Handling Errors

Errors are handled via try/catch

```ts
import { query } from '@ember-data/json-api/request';
import fetch from './fetch';

// ... execute a request
try {
  const result = await fetch.request(query('company', {
    include: 'ceo',
    fields: {
      company: 'name',
      employee: ['name', 'profileImage']
    },
    page: {
      size: 10
    }
  }));
} catch (error) {
  // errors will be normal Errors with some exra information
  error instanceof Error; // true

  // request and response are also available on errors
  const { request, response } = error;
}
```

Errors thrown by the `Fetch` handler have some additional useful properties.

- If the API returned an error with a JSON payload, it is parsed and available as `content`.
- If the API returnered an array of errors or an object with an `errors` property as an array, an `AggregateError` is thrown with those errors.
- `status`, `statusText`, `name`, `code` are all available and normalized
- `isRequestError` will be set to `true`

---

- Next → [Auth Handler](./1-auth.md)
- ⮐ [Requests Guide](../index.md)
