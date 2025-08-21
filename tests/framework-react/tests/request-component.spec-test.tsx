import { useMemo, useRef } from "react";
import type { SingleResourceDataDocument } from "@warp-drive/core/types/spec/document";
import type { Type } from "@warp-drive/core/types/symbols";
import { ReactiveContext, Request } from "@warp-drive/react";

import { RequestSpec } from "@warp-drive-internal/specs/request-component.spec";
// import { RequestSpec } from "./request-component.spec";
import { useReact } from "@warp-drive/diagnostic/react";
import { DEBUG } from "@warp-drive/core/build-config/env";
import { getRequestState } from "@warp-drive/core/store/-private";

function useBetterMemo<T>(getValue: () => T, deps: React.DependencyList) {
  const count = useRef<{ invoked: number; last: T }>({ invoked: 0, last: null as unknown as T });

  return useMemo(() => {
    // in debug we need to skip every second invocation
    if (DEBUG) {
      if (count.current.invoked % 2 === 0) {
        count.current.last = getValue();
      }
      count.current.invoked++;
    } else {
      count.current.last = getValue();
    }

    return count.current.last;
  }, deps);
}

function CountFor({ countFor, data }: { countFor: (thing?: unknown) => number; data: unknown }) {
  const value = useBetterMemo(() => countFor(data), [data]);

  return <>{value}</>;
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
            content: ({ result, features: state }) => (
              <>
                {result.data?.name}
                <br />
                Count:{" "}
                <CountFor countFor={countFor} data={[result.data?.name, state.isRefreshing, state.latestRequest]} />
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
            content: ({ result, features: state }) => (
              <>
                {result.data!.name}
                <br />
                Count:{" "}
                <CountFor countFor={countFor} data={[result.data?.name, state.isRefreshing, state.latestRequest]} />
              </>
            ),
          }}
        />
      );
    })

    .test("externally updated request arg works as expected", function (props) {
      const { store, source, countFor, retry } = props;

      function TestComponent() {
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
              content: ({ result, features: state }) => (
                <>
                  {result.data!.name}
                  <br />
                  Count:{" "}
                  <CountFor countFor={countFor} data={[result.data?.name, state.isRefreshing, state.latestRequest]} />
                </>
              ),
            }}
          />
        );
      }

      return (
        <ReactiveContext>
          <TestComponent />
        </ReactiveContext>
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

      // by wrapping our invocation in another component, we Ensure
      // that the transpiled output has not eagerly accessed state.request before
      // it is being rendered.
      function TestComponent() {
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
      }

      // the extra <ReactiveContext /> wrapper is because
      // we need `{store.request}` to be reactive as an input argument.
      return (
        <ReactiveContext>
          <TestComponent />
        </ReactiveContext>
      );
    })

    .test(
      "request with an identity does NOT trigger a second request if the CachePolicy says it is not expired",
      function (props) {
        const { countFor, dependency, url, setRequest, store } = props;
        type User = {
          id: string;
          name: string;
          [Type]: "user";
        };

        function Issuer() {
          // Ensure that the request doesn't kick off until after the Request component renders.
          const request = useBetterMemo(() => {
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
      }
    )

    .test(
      "request with an identity DOES trigger a second request if the CachePolicy says it is expired",
      function (props) {
        const { countFor, dependency, url, setRequest, store } = props;
        type User = {
          id: string;
          name: string;
          [Type]: "user";
        };

        function Issuer() {
          // Ensure that the request doesn't kick off until after the Request component renders.
          const request = useBetterMemo(() => {
            return setRequest(store.request<SingleResourceDataDocument<User>>({ url, method: "GET" }));
          }, [dependency.trackedThing]);

          const reqState = getRequestState(request);

          return (
            <Request
              store={store}
              request={request}
              states={{
                loading: () => (
                  <>
                    Pending
                    <br />
                    Count: <CountFor countFor={countFor} data={reqState.isPending ? "loading" : "loaded"} />
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
      }
    )

    // @ts-expect-error - we need to improve our typing to not have the generic
    // If there's a typeerror here, we are missing a test.
    .never(null);
});
