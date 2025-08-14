import {
  AutorefreshBehaviorCombos,
  createRequestSubscription,
  DISPOSE,
  RequestArgs,
  signal,
  type ContentFeatures,
  type RecoveryFeatures,
  type RequestLoadingState,
  type RequestState,
  type RequestSubscription,
} from "@warp-drive/core/store/-private";
import type { StructuredErrorDocument } from "@warp-drive/core/types/request";
import { JSX, ReactNode, useEffect, useMemo, useRef } from "react";
import { useStore } from "./store-provider";
import { ReactiveContext } from "./reactive-context";
import { SubscriptionArgs } from "@warp-drive/core/store/-private";
import { Future } from "@warp-drive/core/request";
import { StoreRequestInput } from "@warp-drive/core";

const IdleBlockMissingError = new Error(
  "No idle block provided for <Request> component, and no query or request was provided."
);

class ReactiveArgs<RT, E> implements SubscriptionArgs<RT, E> {
  @signal request?: Future<RT> | undefined | null;
  @signal query?: StoreRequestInput<RT> | undefined | null;
  @signal autorefresh?: AutorefreshBehaviorCombos | undefined;
  @signal autorefreshThreshold?: number | undefined;
  @signal autorefreshBehavior?: "refresh" | "reload" | "policy";
}

interface ChromeComponentProps<RT> {
  children: ReactNode;
  state: RequestState | null;
  features: ContentFeatures<RT>;
}

const DefaultChrome = <RT,>({ children }: ChromeComponentProps<RT>) => {
  return <>{children}</>;
};

export interface RequestProps<RT, E> extends RequestArgs<RT, E> {
  chrome?: React.FC<ChromeComponentProps<RT>>;

  states: RequestStates<RT, E>;
}

interface RequestStates<RT, E> {
  /**
   * The block to render when the component is idle and waiting to be given a request.
   *
   */
  idle?: React.FC<{}>;

  /**
   * The block to render when the request is loading.
   *
   */
  loading?: React.FC<{ state: RequestLoadingState }>;

  /**
   * The block to render when the request was cancelled.
   *
   */
  cancelled?: React.FC<{
    /**
     * The Error the request rejected with.
     */
    error: StructuredErrorDocument<E>;
    /**
     * Utilities to assist in recovering from the error.
     */
    features: RecoveryFeatures;
  }>;

  /**
   * The block to render when the request failed. If this block is not provided,
   * the error will be rethrown.
   *
   * Thus it is required to provide an error block and proper error handling if
   * you do not want the error to crash the application.
   */
  error: React.FC<{
    /**
     * The Error the request rejected with.
     */
    error: StructuredErrorDocument<E>;
    /**
     * Utilities to assist in recovering from the error.
     */
    features: RecoveryFeatures;
  }>;

  /**
   * The block to render when the request succeeded.
   *
   */
  content: React.FC<{ result: RT; features: ContentFeatures<RT> }>;
}

export function Throw({ error }: { error: Error }): never {
  throw error;
}

/**
 * The `<Request />` component is a powerful tool for managing data fetching and
 * state in your React application. It provides a declarative approach to reactive
 * control-flow for managing requests and state in your application.
 *
 * The `<Request />` component is ideal for handling "boundaries", outside which some
 * state is still allowed to be unresolved and within which it MUST be resolved.
 *
 * ## Request States
 *
 * `<Request />` has five states, only one of which will be active and rendered at a time.
 *
 * - `idle`: The component is waiting to be given a request to monitor
 * - `loading`: The request is in progress
 * - `error`: The request failed
 * - `content`: The request succeeded
 * - `cancelled`: The request was cancelled
 *
 * Additionally, the `content` state has a `refresh` method that can be used to
 * refresh the request in the background, which is available as a sub-state of
 * the `content` state.
 *
 * ### Example Usage
 *
 * ```tsx
 * import { Request } from "@warp-drive/react";
 *
 * export function UserPreview($props: { id: string | null }) {
 *   return (
 *    <Request
 *       query={findRecord('user', $props.id)}
 *       states={{
 *         idle: () => <div>Waiting for User Selection</div>,
 *         loading: ({ state }) => <div>Loading user data...</div>,
 *         cancelled: ({ error, features }) => (
 *           <div>
 *             <p>Request Cancelled</p>
 *             <p><button onClick={features.retry}>Start Again?</button></p>
 *           </div>
 *         ),
 *         error: ({ error, features }) => (
 *           <div>
 *             <p>Error: {error.message}</p>
 *             <p><button onClick={features.retry}>Try Again?</button></p>
 *           </div>
 *         ),
 *         content: ({ result, features }) => (
 *           <div>
 *            <h2>User Details</h2>
 *            <p>ID: {result.id}</p>
 *            <p>Name: {result.name}</p>
 *          </div>
 *        ),
 *      }}
 *    />
 *   );
 * }
 *
 * ```
 *
 */
export function Request<RT, E>($props: RequestProps<RT, E>): JSX.Element {
  return (
    <ReactiveContext>
      <InternalRequest {...$props} />
    </ReactiveContext>
  );
}

function InternalRequest<RT, E>($props: RequestProps<RT, E>): JSX.Element {
  const store = $props.store ?? useStore();
  const Chrome = $props.chrome ?? DefaultChrome;
  const sink = useRef<RequestSubscription<RT, E> | null>(null);
  const args = useRef<SubscriptionArgs<RT, E> | null>(null);

  if (!args.current) {
    args.current = new ReactiveArgs<RT, E>();
  }
  Object.assign(args.current, $props);

  if (sink.current && (sink.current.store !== store || $props.subscription)) {
    sink.current[DISPOSE]();
    sink.current = null;
  }

  if (!sink.current && !$props.subscription) {
    sink.current = createRequestSubscription(store, args.current!);
  }

  const initialized = useRef<null | { disposable: { [DISPOSE]: () => void } | null; dispose: () => void }>(null);
  useEffect(() => {
    if (sink.current && (!initialized.current || initialized.current.disposable !== sink.current)) {
      initialized.current = {
        disposable: sink.current,
        dispose: () => {
          sink.current?.[DISPOSE]();
          initialized.current = null;
          sink.current = null;
        },
      };
    }

    return sink.current ? initialized.current!.dispose : undefined;
  }, [sink.current]);

  const state = $props.subscription ?? sink.current!;
  const slots = $props.states;

  console.log({
    state,
    slots,
  });

  return (
    <Chrome state={state.isIdle ? null : state.reqState} features={state.contentFeatures}>
      {
        // prettier-ignore
        state.isIdle && slots.idle ? <slots.idle />
          : state.isIdle ? <Throw error={IdleBlockMissingError} />
          : state.reqState.isLoading ? slots.loading ? <slots.loading state={state.reqState.loadingState} /> : ''
          : state.reqState.isCancelled && slots.cancelled ? <slots.cancelled error={state.reqState.reason} features={state.errorFeatures} />
          : state.reqState.isError && slots.error ? <slots.error error={state.reqState.reason} features={state.errorFeatures} />
          : state.reqState.isSuccess ? slots.content ? <slots.content result={state.reqState.value} features={state.contentFeatures} /> : <Throw error={new Error('No content block provided for <Request> component.')} />
          : !state.reqState.isCancelled ? <Throw error={state.reqState.reason} />
          : '' // never
      }
    </Chrome>
  );
}
