import { useMemo, useRef, useState } from "react";
import { useReact } from "@warp-drive/diagnostic/react";
import { GetPromiseStateSpec } from "@warp-drive-internal/specs/get-promise-state.spec";
import { DEBUG } from "@warp-drive/core/build-config/env";
import { ReactiveContext } from "@warp-drive/react";

function useBetterMemo<T>(getValue: () => T, deps: React.DependencyList) {
  const count = useRef<{ invoked: number; last: T }>({ invoked: 0, last: null as unknown as T });

  return useMemo(() => {
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

function CountFor({
  countFor,
  data,
  error,
}: {
  countFor: (thing?: unknown, error?: unknown) => number;
  data: unknown;
  error?: unknown;
}) {
  const value = useBetterMemo(() => countFor(data, error), [data, error]);
  return <>{value}</>;
}

GetPromiseStateSpec.use(useReact(), function (b) {
  b.test("it renders each stage of a promise resolving in a new microtask queue", function (props) {
    const { defer, _getPromiseState, countFor } = props;
    if (!defer || !_getPromiseState) return <div>Missing props</div>;

    function Component() {
      const state = _getPromiseState(defer.promise);
      return (
        <>
          {state.result}
          <br />
          Count: <CountFor countFor={countFor} data={state.result} />
        </>
      );
    }

    return (
      <ReactiveContext>
        <Component />
      </ReactiveContext>
    );
  })

    .test("it renders each stage of a promise resolving in the same microtask queue", function (props) {
      const { promise, _getPromiseState, countFor } = props;
      if (!promise || !_getPromiseState) return <div>Missing props</div>;

      const state = _getPromiseState(promise);

      function Component() {
        return (
          <>
            {state.result}
            <br />
            Count: <CountFor countFor={countFor} data={state.result} />
          </>
        );
      }

      return (
        <ReactiveContext>
          <Component />
        </ReactiveContext>
      );
    })

    .test("it renders only once when the promise already has a result cached", function (props) {
      const { promise, _getPromiseState, countFor } = props;
      if (!promise || !_getPromiseState) return <div>Missing props</div>;

      function Component() {
        const state = _getPromiseState(promise);
        return (
          <>
            {state.result}
            <br />
            Count: <CountFor countFor={countFor} data={state.result} />
          </>
        );
      }

      return (
        <ReactiveContext>
          <Component />
        </ReactiveContext>
      );
    })

    .test("it transitions to error state correctly", function (props) {
      const { promise, _getPromiseState, countFor } = props;
      if (!promise || !_getPromiseState) return <div>Missing props</div>;

      const state = _getPromiseState(promise);

      function Component() {
        return (
          <>
            {state.isPending && <>Pending </>}
            {state.isError && <>{state.error?.message} </>}
            {state.isSuccess && <>Invalid Success Reached</>}
            Count: <CountFor countFor={countFor} data={state.result} error={state.error} />
          </>
        );
      }

      return (
        <ReactiveContext>
          <Component />
        </ReactiveContext>
      );
    })

    .test("it renders only once when the promise error state is already cached", function (props) {
      const { promise, _getPromiseState, countFor } = props;
      if (!promise || !_getPromiseState) return <div>Missing props</div>;

      function Component() {
        const state = _getPromiseState(promise);
        return (
          <>
            {state.isPending && <>Pending </>}
            {state.isError && <>{state.error?.message} </>}
            {state.isSuccess && <>Invalid Success Reached</>}
            Count: <CountFor countFor={countFor} data={state.result} error={state.error} />
          </>
        );
      }

      return (
        <ReactiveContext>
          <Component />
        </ReactiveContext>
      );
    })

    .test("it unwraps promise-proxies that utilize the secret symbol for error states", function (props) {
      const { promise, _getPromiseState, countFor } = props;
      if (!promise || !_getPromiseState) return <div>Missing props</div>;

      function Component() {
        const state = _getPromiseState(promise);
        return (
          <>
            {state.isPending && <>Pending </>}
            {state.isError && <>{state.error?.message} </>}
            {state.isSuccess && <>Invalid Success Reached</>}
            Count: <CountFor countFor={countFor} data={state.result} error={state.error} />
          </>
        );
      }

      return (
        <ReactiveContext>
          <Component />
        </ReactiveContext>
      );
    })

    .test("it unwraps promise-proxies that utilize the secret symbol for success states", function (props) {
      const { promise, _getPromiseState, countFor } = props;
      if (!promise || !_getPromiseState) return <div>Missing props</div>;

      function Component() {
        const state = _getPromiseState(promise);
        return (
          <>
            {state.result}
            <br />
            Count: <CountFor countFor={countFor} data={state.result} />
          </>
        );
      }

      return (
        <ReactiveContext>
          <Component />
        </ReactiveContext>
      );
    });
});
