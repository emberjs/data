---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/skills/holodeck/mock-http-requests-in-tests.md
---
# Mock HTTP Requests in Tests

Use this skill when a test needs the server to answer a request with a known response, and
`@warp-drive/holodeck` is already wired into the suite. Holodeck records the response on the first
run and replays it from disk afterwards, so what you write is a declaration rather than a stub.

## Steps

1. Import the helper for the method you need from `@warp-drive/holodeck/mock`. `GET`, `POST`,
   `PUT`, `PATCH`, `DELETE`, and `HEAD` all take the same arguments.
2. Declare the mock before the code under test makes the request, passing the test context as the
   first argument.

   ```ts
   await GET(this, 'users/1', () => ({
     data: { id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } },
   }));
   ```
3. Write the URL relative to the mock host, without a leading slash, and exactly as the browser
   will send it. The server reads the query string through `URLSearchParams`, so percent-encode
   anything outside the unreserved set. `users?filter[name]=Chris` has to be written
   `users?filter%5Bname%5D=Chris`.
4. Pass `status` in the options object for anything other than a success.

   ```ts
   await GET(this, 'users/1', () => ({ errors: [{ status: '404' }] }), { status: 404 });
   ```

   Leave `statusText` out. HTTP/2 carries no reason phrase, so the browser never sees the stored
   value, and `Fetch` derives an error's `statusText` from the status code. `Content-Type`
   defaults to `application/vnd.api+json`.
5. For a request with a body, build the serialized body once and pass the same string to both the
   mock and the request.

   ```ts
   const reqBody = JSON.stringify({ data: { type: 'user', attributes: { firstName: 'Chris' } } });
   await POST(this, 'users', () => ({ data: { id: '1', type: 'user' } }), { body: reqBody });
   await store.request({ url, method: 'POST', body: reqBody });
   ```
6. Run the suite locally to record the fixture, then commit the `.mock-cache` files it writes.
7. Prove the test replays what you committed. Record-versus-replay is decided when the test bundle
   is built, not when it runs, so set `CI=1` on the build as well as the run. A `CI=1` that reuses
   an already-built bundle silently records instead.

   ```sh
   CI=1 pnpm build:tests && CI=1 pnpm test
   ```

## Matching rules

* Holodeck matches on the test id, the method, the URL string, the request body, and a per-URL
  request counter. A mismatch in method, URL, or body is a `MOCK_NOT_FOUND` 400 naming the
  fixture it looked for. A request counter that is off serves a different recorded response
  with no error at all.
* The body is matched by hashing. An object and the JSON string of that object hash differently,
  so a `body` option that is not the exact request string never matches.
* Mocks for the same method and URL are consumed in declaration order. Declare them in the order
  the requests happen.

## Notes

* The response function runs only while recording. Do not put assertions or side effects in it.
* A mock the test never requests fails the test from `afterEach`, in record and replay alike.
  Remove it or make the request.
* `RECORD: true` is a per-request override that records even while the suite replays. Use it
  locally to refresh one fixture and delete it before committing. See
  [Use RECORD in Holodeck Mocks](/skills/holodeck/using-record).
* Legacy adapters bypass the request handler. Call `installAdapterFor(this, store)` for those.

## Related

* Full guide: [Writing Mocks](/guides/the-manual/testing/writing-mocks.md)
* Related skills: [Set Up Holodeck](/skills/holodeck/set-up-holodeck) if nothing is wired up yet,
  and [Use RECORD in Holodeck Mocks](/skills/holodeck/using-record) to refresh one fixture
