import { useMemo, useRef } from "react";
import type { SingleResourceDataDocument } from "@warp-drive/core/types/spec/document";
import type { Type } from "@warp-drive/core/types/symbols";
import { ReactiveContext, Request } from "@warp-drive/react";

import { RequestSpec } from "./-spec";
import { useReact } from "@warp-drive/diagnostic/react";

function CountFor({ countFor, data }: { countFor: (thing?: unknown) => number; data: unknown }) {
  const count = useRef<boolean>(false);
  let invokedCount = 1;

  if (count.current === false) {
    count.current = true;
  } else {
    invokedCount = countFor(data);
  }

  return <>{invokedCount}</>;
}

RequestSpec.use(useReact(), function (b) {
  b
    /* this comment just to make prettier behave */

    .test("it renders each stage of a request that succeeds", function (props) {
      const { store, request, countFor } = props;
      return (
        <Request
          store={store}
          request={request}
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            error: ({ error }) => (
              <>
                {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("it renders only once when the promise already has a result cached", function (props) {
      const { store, request, countFor } = props;

      return (
        <Request
          store={store}
          request={request}
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            cancelled: ({ error }) => (
              <>
                Cancelled {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            error: ({ error }) => (
              <>
                {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("it transitions to error state correctly", function (props) {
      const { store, request, countFor } = props;

      return (
        <Request
          store={store}
          request={request}
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            error: ({ error }) => (
              <>
                {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("we can retry from error state", function (props) {
      const { store, request, countFor, retry } = props;

      return (
        <Request
          store={store}
          request={request}
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            error: ({ error, features }) => (
              <>
                {error.message}
                <br />
                Count:
                <CountFor countFor={countFor} data={error} />
                <button onClick={() => retry(features)} test-id="retry-button">
                  Retry
                </button>
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("externally retriggered request works as expected", function (props) {
      const { store, source, countFor, retry } = props;

      return (
        <Request
          store={store}
          request={source.request}
          states={{
            loading: ({ state }) => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={state} />
              </>
            ),
            error: ({ error, features }) => (
              <>
                {error.message}
                <br />
                Count:
                <CountFor countFor={countFor} data={error} />
                <button onClick={() => retry(features)} test-id="retry-button">
                  Retry
                </button>
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("externally retriggered request works as expected (store CacheHandler)", function (props) {
      const { store, source, countFor, retry } = props;

      return (
        <Request
          store={store}
          request={source.request}
          states={{
            loading: ({ state }) => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={state} />
              </>
            ),
            error: ({ error, features }) => (
              <>
                {error.message}
                <br />
                Count:
                <CountFor countFor={countFor} data={error.message} />
                <button onClick={() => retry(features)} test-id="retry-button">
                  Retry
                </button>
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data!.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("it rethrows if error block is not present", function (props) {
      const { store, request, countFor } = props;

      return (
        <Request
          store={store}
          request={request}
          // @ts-expect-error - Missing required 'error' state is intentional for this test
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            content: ({ result }) => (
              <>
                {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("it transitions to cancelled state correctly", function (props) {
      const { store, request, countFor } = props;

      return (
        <Request
          store={store}
          request={request}
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            cancelled: ({ error }) => (
              <>
                Cancelled {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            error: ({ error }) => (
              <>
                {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("we can retry from cancelled state", function (props) {
      const { store, request, countFor, retry } = props;

      return (
        <Request
          store={store}
          request={request}
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            cancelled: ({ error, features }) => (
              <>
                Cancelled:{error.message}
                <br />
                Count:
                <CountFor countFor={countFor} data={error} />
                <button onClick={() => retry(features)} test-id="retry-button">
                  Retry
                </button>
              </>
            ),
            error: ({ error }) => (
              <>
                {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("it transitions to error state if cancelled block is not present", function (props) {
      const { store, request, countFor } = props;

      return (
        <Request
          store={store}
          request={request}
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            error: ({ error }) => (
              <>
                {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("it does not rethrow for cancelled", function (props) {
      const { store, request, countFor } = props;

      return (
        <Request
          store={store}
          request={request}
          // @ts-expect-error - Missing required 'error' state is intentional for this test
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("it renders only once when the promise error state is already cached", function (props) {
      const { store, request, countFor } = props;

      return (
        <Request
          store={store}
          request={request}
          states={{
            loading: () => (
              <>
                Pending
                <br />
                Count: <CountFor countFor={countFor} data={request} />
              </>
            ),
            error: ({ error }) => (
              <>
                {error.message}
                <br />
                Count: <CountFor countFor={countFor} data={error} />
              </>
            ),
            content: ({ result }) => (
              <>
                {result.data.attributes.name}
                <br />
                Count: <CountFor countFor={countFor} data={result} />
              </>
            ),
          }}
        />
      );
    })

    .test("isOnline updates when expected", function (props) {
      const { store, request } = props;

      return (
        <Request
          store={store}
          request={request}
          // @ts-expect-error - Missing required 'error' state is intentional for this test
          states={{
            content: ({ result, features }) => <>Online: {String(features.isOnline)}</>,
          }}
        />
      );
    })

    .test('@autorefreshBehavior="reload" works as expected', function (props) {
      const { store, request } = props;

      return (
        <Request
          store={store}
          request={request}
          autorefresh={true}
          autorefreshBehavior="reload"
          autorefreshThreshold={0}
          // @ts-expect-error - Missing required 'error' state is intentional for this test
          states={{
            content: ({ result, features }) => (
              <>
                {result.data.attributes.name} | Online: {String(features.isOnline)}
              </>
            ),
          }}
        />
      );
    })

    .test("idle state does not error", function (props) {
      const { store } = props;

      return (
        <Request
          store={store}
          states={{
            idle: () => <>Waiting</>,
            content: ({ result }) => <>Content</>,
            error: ({ error }) => <>Error</>,
          }}
        />
      );
    })

    .test("idle state errors if no idle block is present", function (props) {
      const { store } = props;

      return (
        <Request
          store={store}
          states={{
            content: ({ result }) => <>Content</>,
            error: ({ error }) => <>Error</>,
          }}
        />
      );
    })

    .test("idle state allows for transition to request states", function (props) {
      const { store, state } = props;

      return (
        <Request
          store={store}
          request={state.request}
          states={{
            idle: () => <>Waiting</>,
            content: ({ result }) => <>Content</>,
            error: ({ error }) => <>Error</>,
          }}
        />
      );
    })

    .test("request with an identity does not trigger a second request", function (props) {
      const { countFor, dependency, url, setRequest, store } = props;
      type User = {
        id: string;
        name: string;
        [Type]: "user";
      };

      function Issuer() {
        // Ensure that the request doesn't kick off until after the Request component renders.
        const request = useMemo(() => {
          return setRequest(store.request<SingleResourceDataDocument<User>>({ url, method: "GET" }));
        }, [dependency.trackedThing]);

        return (
          <Request
            store={store}
            request={request}
            states={{
              loading: () => (
                <>
                  Pending
                  <br />
                  Count: <CountFor countFor={countFor} data={"loading"} />
                </>
              ),
              error: ({ error }) => (
                <>
                  {error.message}
                  <br />
                  Count: <CountFor countFor={countFor} data={error.message} />
                </>
              ),
              content: ({ result }) => (
                <>
                  {(result as SingleResourceDataDocument<User>)?.data?.name}
                  <br />
                  <CountFor countFor={countFor} data={(result as SingleResourceDataDocument<User>)?.data?.name} />
                </>
              ),
            }}
          />
        );
      }

      return (
        <ReactiveContext>
          <Issuer />
        </ReactiveContext>
      );
    })

    // If there's a typeerror here, we are missing a test.
    .never(null);
});
