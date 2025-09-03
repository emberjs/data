import { useMemo, useRef } from "react";
import { useReact } from '@warp-drive/diagnostic/react';
import { GetRequestStateRenderingSpec } from '@warp-drive-internal/specs/get-request-state-rendering.spec';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { ReactiveContext } from '@warp-drive/react';

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

function CountFor({ countFor, data, error }: { countFor: (thing?: unknown, error?: unknown) => number; data: unknown; error?: unknown }) {
    const value = useBetterMemo(() => countFor(data, error), [data, error]);
    return <>{value}</>;
}

GetRequestStateRenderingSpec.use(useReact(), function (b) {
    b
        .test('it renders each stage of a request resolving in a new microtask queue', function (props) {
            const { request, _getRequestState, countFor } = props;

            function Component() {
                const state = _getRequestState(request);

                if (state.isSuccess && state.result) {
                    const result = state.result as any;
                    if (result.data?.attributes?.name) {
                        return <>{result.data.attributes.name}Count: <CountFor countFor={countFor} data={state.result} /></>;
                    }
                }

                return <>Count: <CountFor countFor={countFor} data={state.result} /></>;
            }

            return <ReactiveContext><Component /></ReactiveContext>;
        })

        .test('it renders only once when the promise already has a result cached', function (props) {
            const { request, _getRequestState, countFor } = props;

            function Component() {
                const state = _getRequestState(request);

                if (state.isSuccess && state.result) {
                    const result = state.result as any;
                    if (result.data?.attributes?.name) {
                        return <>{result.data.attributes.name}Count: <CountFor countFor={countFor} data={state.result} /></>;
                    }
                }

                return <>Count: <CountFor countFor={countFor} data={state.result} /></>;
            }

            return <ReactiveContext><Component /></ReactiveContext>;
        })

        .test('it transitions to error state correctly', function (props) {
            const { request, _getRequestState, countFor } = props;

            function Component() {
                const state = _getRequestState(request);

                if (state.isPending) {
                    return <>Pending Count: <CountFor countFor={countFor} data={state.result} error={state.error} /></>;
                }
                if (state.isError && state.error) {
                    return <>{state.error.message} Count: <CountFor countFor={countFor} data={state.result} error={state.error} /></>;
                }

                return <>Count: <CountFor countFor={countFor} data={state.result} error={state.error} /></>;
            }

            return <ReactiveContext><Component /></ReactiveContext>;
        })

        .test('it renders only once when the promise error state is already cached', function (props) {
            const { request, _getRequestState, countFor } = props;

            function Component() {
                const state = _getRequestState(request);

                if (state.isError && state.error) {
                    return <>{state.error.message} Count: <CountFor countFor={countFor} data={state.result} error={state.error} /></>;
                }

                return <>Count: <CountFor countFor={countFor} data={state.result} error={state.error} /></>;
            }

            return <ReactiveContext><Component /></ReactiveContext>;
        });
});