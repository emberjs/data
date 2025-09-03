import { useMemo, useRef } from "react";
import { useReact } from '@warp-drive/diagnostic/react';
import { AwaitSpec } from '@warp-drive-internal/specs/await-component.spec';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { getPromiseState } from '@warp-drive/core/store/-private';
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

function CountFor({ countFor, data }: { countFor: (thing?: unknown) => number; data: unknown }) {
    const value = useBetterMemo(() => countFor(data), [data]);
    return <>{value}</>;
}

AwaitSpec.use(useReact(), function (b) {
    b
        .test('it renders each stage of a promise', function (props) {
            const { promise, countFor } = props;

            function AwaitComponent() {
                const state = getPromiseState(promise);

                if (state.isPending) {
                    return <>Loading...<br />Count: <CountFor countFor={countFor} data={promise} /></>;
                }
                if (state.isError && state.error) {
                    return <>{state.error.message}<br />Count: <CountFor countFor={countFor} data={state.error} /></>;
                }
                if (state.isSuccess && state.result) {
                    return <>{state.result}<br />Count: <CountFor countFor={countFor} data={state.result} /></>;
                }
                return <>Loading...<br />Count: <CountFor countFor={countFor} data={promise} /></>;
            }

            return <ReactiveContext><AwaitComponent /></ReactiveContext>;
        })

        .test('it renders only once when the promise already has a result cached', function (props) {
            const { promise, countFor } = props;

            function AwaitComponent() {
                const state = getPromiseState(promise);

                if (state.isPending) {
                    return <>Loading...<br />Count: <CountFor countFor={countFor} data={promise} /></>;
                }
                if (state.isError && state.error) {
                    return <>{state.error.message}<br />Count: <CountFor countFor={countFor} data={state.error} /></>;
                }
                if (state.isSuccess && state.result) {
                    return <>{state.result}<br />Count: <CountFor countFor={countFor} data={state.result} /></>;
                }
                return <>Loading...<br />Count: <CountFor countFor={countFor} data={promise} /></>;
            }

            return <ReactiveContext><AwaitComponent /></ReactiveContext>;
        })

        .test('it transitions to error state correctly', function (props) {
            const { promise, countFor } = props;

            function AwaitComponent() {
                const state = getPromiseState(promise);

                if (state.isPending) {
                    return <>Loading...<br />Count: <CountFor countFor={countFor} data={promise} /></>;
                }
                if (state.isError && state.error) {
                    return <>{state.error.message}<br />Count: <CountFor countFor={countFor} data={state.error} /></>;
                }
                if (state.isSuccess && state.result) {
                    return <>{state.result}<br />Count: <CountFor countFor={countFor} data={state.result} /></>;
                }
                return <>Loading...<br />Count: <CountFor countFor={countFor} data={promise} /></>;
            }

            return <ReactiveContext><AwaitComponent /></ReactiveContext>;
        })

        .test('it renders only once when the promise error state is already cached', function (props) {
            const { promise, countFor } = props;

            function AwaitComponent() {
                const state = getPromiseState(promise);

                if (state.isPending) {
                    return <>Loading...<br />Count: <CountFor countFor={countFor} data={promise} /></>;
                }
                if (state.isError && state.error) {
                    return <>{state.error.message}<br />Count: <CountFor countFor={countFor} data={state.error} /></>;
                }
                if (state.isSuccess && state.result) {
                    return <>{state.result}<br />Count: <CountFor countFor={countFor} data={state.result} /></>;
                }
                return <>Loading...<br />Count: <CountFor countFor={countFor} data={promise} /></>;
            }

            return <ReactiveContext><AwaitComponent /></ReactiveContext>;
        });
});