---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/the-manual/testing/troubleshooting.md
---

# Troubleshooting

Each section starts with what holodeck prints. Search this page for the text you have.

## A mocked request failed with a 400

A missing or mismatched fixture is a `400` from the mock server, and what the terminal shows
depends on whether the test lets that error escape.

A test that lets it escape prints the request and, under it, the server's explanation.

```
💥 Fail Unexpected Test Failure: [400 Bad Request] POST (cors) - https://localhost:7358/api/user/ops/bulk.create

No meta was found for POST https://localhost:7358/api/user/ops/bulk.create. The expected cacheKey was /path/to/tests/json-api/.mock-cache/36ff0af3/POST::api_user_ops_bulk.create::0/f6c45fa65d57493c31a4f1b85eddcf6f. You may need to record a mock for this request.
```

The second paragraph is the `detail` of the server's `MOCK_NOT_FOUND` response. `MockServerHandler`
lifts it into the thrown error, with holodeck's own `__xTestId` query stripped out of the URL, so it
reaches the terminal and the CI log. Searching a failed run for `No meta was found` finds it.

A test that catches the error and asserts against it prints only the assertions that failed. The
explanation is still on the caught error, as `error.content`, but nothing prints it.

```
💥 Failed: 0ms Integration | @ember-data/json-api Cach.put(<ErrorDocument>):Useful errors are propagated by the CacheHandler
	✅ Pass The error is an AggregateError
	💥 Fail The error message is correct
	💥 Fail The error status is correct
```

Diagnostic prints the test id with every failure, whichever shape you get.

```
open test locally: https://localhost:7357?testId=546c9e3a
```

That id is the fixture directory. Look in `.mock-cache/546c9e3a/` and you are in the right place.
Open the printed URL to run the one test in a browser and read the failed request in the network
panel, where the same `MOCK_NOT_FOUND` payload is the response body.

Compare the `cacheKey` in the message against what is on disk. The part that differs tells you
which half of the mock is wrong.

* The directory is missing entirely. The fixture was never committed, or you are running in replay
  mode against a test you have not recorded yet.
* The URL segment differs. The mock URL and the request URL are not the same string. Query
  encoding is the usual cause. See
  [Write the URL the way the server will see it](./writing-mocks.md#write-the-url-the-way-the-server-will-see-it).
* The trailing number differs. The test made more requests to that URL than it declared mocks for,
  or declared them in a different order.
* The file name is a hash rather than `res`, and no file of that name exists. The `body` option and
  the real request body are not the same string. Open the recorded `.meta.json` and look at
  `requestBody`. A correctly recorded body-matched mock stores an escaped JSON **string**. An
  object there means someone passed an object literal to the mock.

## The test declared a mock it never requested

```
💥 Fail Unexpected Test Failure in afterEach: Holodeck: this test declared mocks it never requested.

	GET users/never-requested (mocked 1, requested 0)

A mock that is never requested proves nothing. Remove it, or make the request it describes.
```

When `setTestId(this, null)` runs from `afterEach`, holodeck compares the mocks the test declared
against the requests it made, per method and URL, and fails the test over any mock left over. The
report is added alongside the body's own assertions rather than in place of them, so a test whose
body already failed shows both. It fires in record and replay alike.

Read the two counts. `mocked 1, requested 0` is a mock the code under test never asked for. Delete
it, or fix the test so the request happens. `mocked 2, requested 1` is one declaration too many
for a URL the test does hit. See
[Mock the same URL more than once](./writing-mocks.md#mock-the-same-url-more-than-once).

An error earlier in the test body, including a failed recording, also leaves its mock unrequested,
so this report often follows another failure. Fix the first one and this one goes with it.

## Holodeck failed to record

```
💥 Fail Unexpected Test Failure: MockError: Holodeck failed to record GET users/1 (500 ). Cannot read properties of undefined (reading 'Content-Type')
```

While recording, each mock helper posts its scaffold to the server, and throws when the server
rejects it. The message carries the status and then the server's own explanation. The status text
is blank because the server speaks HTTP/2, which has none.

In the example the scaffold was built by hand with `mock` and left out `headers`, which the six
helpers always supply. A fixture the server cannot write, because `.mock-cache` is not writable or
the disk is full, reports the filesystem error in the same place. Replay posts nothing, so this
only appears in a recording run.

## The test id is missing

```
MockServerHandler is not configured with a testId. Use setTestId to set the testId for each test
```

Holodeck looks the test up by object identity, and it was handed an object it does not know.

Check three things in this order. The global hooks that call `setTestId` are installed. The object
passed to `new MockServerHandler(...)` is the same test context `setTestId` received. The test body
is a `function` rather than an arrow function, so `this` is the test context at all.

```
Cannot call "mock" before configuring a testId. Use setTestId to set the testId for each test
```

Same cause, reported from a mock helper instead of from the request handler.

```
MockServerHandler is already configured with a testId.
```

`setTestId` ran twice for one test context. A second `setupGlobalHooks` block or a stray per-test
call is the usual reason.

## The request never reached the handler

```
MISSING_X_TEST_ID_HEADER
```

The server received a request carrying no `__xTestId` query parameter, which means the request did
not go through `MockServerHandler`. The code keeps its historical name, but the message names the
query parameter and says what to do. Put the handler in the chain ahead of `Fetch`, and check that
the code under test goes through that `RequestManager` rather than calling `fetch` directly.

## The certificate is missing

```
Error: SSL certificate or key not found, you may need to run `pnpm dlx @warp-drive/holodeck ensure-cert`
    at getCertInfo (.../@warp-drive/diagnostic/dist-server/index.js:1254:67)
    at launch (.../@warp-drive/diagnostic/dist-server/index.js:1336:27)
```

Both `@warp-drive/diagnostic` and holodeck serve over TLS, and both read the same certificate.
Diagnostic starts first, so this is usually the first thing a machine without a certificate hits,
and holodeck's banner never prints. Run the certificate step from
[Server setup](./server-setup.md#trust-a-local-certificate).

Holodeck looks for `HOLODECK_SSL_CERT_PATH` and `HOLODECK_SSL_KEY_PATH`, and falls back to
`$HOME/holodeck-localhost.pem` and `$HOME/holodeck-localhost-key.pem` when they are unset. The
fallback is announced, not an error.

```
HOLODECK_SSL_CERT_PATH was not found in the current environment. Setting it to default value of /Users/you/holodeck-localhost.pem
```

A run that prints those two lines and then serves normally is fine. Set the variables only when
the certificate lives somewhere other than your home directory.

```
Could not determine a startup file for shell: /usr/bin/nu.
Holodeck falls back to /Users/you/holodeck-localhost.pem when the environment variables
are unset, so the certificate above already works as it is.
```

This is information, not an error. `ensure-cert` issues the certificate before it looks at your
shell, and it exits normally on a shell it cannot write a profile for. It goes on to print the two
`export` lines in case you want them, but the certificate is already where holodeck looks.

```
mkcert was not found on your PATH. Holodeck serves over TLS and uses mkcert to
issue a certificate for localhost.
```

`ensure-cert` checks for `mkcert` before it does anything else and exits with the install commands
for each platform. Install it and run the command again.

## The suite starts and then times out

```
⚠️  Diagnostic Watchdog: No browser reported in within 90s of launch. Assuming a hung browser and exiting.

   connections: 2 tcp, 1 tls handshakes
   requests served: 2
   websocket connections: 0
   server events: 870ms tlsClientError: socket hang up
   browsers: chrome#42 pid=90709 running
```

Nothing before this names a cause. Holodeck's banner prints, the browser launches, and 90 seconds
later the watchdog gives up and prints what the server saw in the meantime. A browser that fetched
a page or two and never opened a websocket, as above, has usually been served a test bundle that
does not exist. Check that `dist-test/index.html` is there, and run the suite through the command
that builds first, which at this repository's root is `pnpm test`. The wait is
`browserStartTimeout` in the launch config, 90 seconds by default.

## The holodeck server is not running

```
Promise rejected during "…": Failed to fetch
```

Every mock fails this way when nothing is listening on the host passed to `setConfig`. Safari words
it as `Load failed`. Each test also fails from `afterEach` with a report that its mocks were never
requested, which follows from the first error.

Check that whatever serves the suite also launched holodeck, and that its banner printed the port
`setConfig` names. A suite opened from an app's dev server rather than from its test runner
usually has no holodeck behind it. See
[Holodeck in dev mode](/guides/the-manual/cookbook/holodeck-in-dev-mode.md) for one way to start
it there.

## The port was taken

Holodeck binds the port it is given and never picks another, because the browser works out the mock
server's URL by adding one to the test server's port. A conflict retries the same port a few times
and then fails.

Stop whatever holds the port. A test run that was killed rather than shut down is the usual
culprit.

## Launched from the wrong directory

```
Package name not found in package.json
```

`launchProgram` reads `package.json` from the current working directory, and writes `.mock-cache`
there too. Start the test runner from the test app's own directory.

## Related

* [Server setup](./server-setup.md)
* [Recording and replaying](./record-and-replay.md)
