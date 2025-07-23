<!--
  The `<Request />` component is a powerful tool for managing data fetching and
  state in your Svelte application. It provides a declarative approach to reactive
  control-flow for managing requests and state in your application.

  The `<Request />` component is ideal for handling "boundaries", outside which some
  state is still allowed to be unresolved and within which it MUST be resolved.

  ## Request States

  `<Request />` has five states, only one of which will be active and rendered at a time.

  - `idle`: The component is waiting to be given a request to monitor
  - `loading`: The request is in progress
  - `error`: The request failed
  - `content`: The request succeeded
  - `cancelled`: The request was cancelled

  ## Usage Example

  ```svelte
  <script>
    import { Request } from '@warp-drive/svelte';
    import { getStore } from '$lib/context/store.svelte';

    const store = getStore();
    let request = store.request(someQuery);
  </script>

  <Request {request}>
    {#snippet loading(state)}
      <Spinner percentDone={state.completedRatio} />
      <button onclick={state.abort}>Cancel</button>
    {/snippet}

    {#snippet error(error, features)}
      <ErrorForm {error} />
      <button onclick={features.retry}>Retry</button>
    {/snippet}

    {#snippet content(data, features)}
      <h1>{data.title}</h1>
      {#if features.isRefreshing}
        <SmallSpinner />
        <button onclick={features.abort}>Cancel</button>
      {:else}
        <button onclick={features.refresh}>Refresh</button>
      {/if}
    {/snippet}

    {#snippet cancelled(error, features)}
      <h2>The Request was cancelled</h2>
      <button onclick={features.retry}>Retry</button>
    {/snippet}

    {#snippet idle()}
      <button onclick={kickOffRequest}>Load Preview?</button>
    {/snippet}
  </Request>
  ```

  ## Autorefresh

  `<Request />` supports automatic refresh and reload under certain conditions:

  - `online`: This occurs when a browser window or tab comes back to the foreground
    after being backgrounded or when the network reports as being online after
    having been offline.
  - `interval`: This occurs when a specified amount of time has passed.
  - `invalid`: This occurs when the store emits a notification that the request
    has become invalid.

  You can specify when autorefresh should occur by setting the `autorefresh` prop
  to `true` or a comma-separated list of the above values.

  A value of `true` is equivalent to `'online,invalid'`.
-->

<script lang="ts" generics="RT, T, E">
  import { getContext, onDestroy } from 'svelte';
  import type { Store, StoreRequestInput } from '@warp-drive/core';
  import { assert } from '@warp-drive/core/build-config/macros';
  import type { Future } from '@warp-drive/core/request';
  import type { RequestLoadingState, RequestState, RequestSubscription } from '@warp-drive/core/store/-private';
  import { createRequestSubscription, DISPOSE } from '@warp-drive/core/store/-private';
  import type { StructuredErrorDocument } from '@warp-drive/core/types/request';
  import type { Snippet } from 'svelte';
  import type { AutorefreshBehaviorCombos, ContentFeatures, RecoveryFeatures } from './types';

  interface Props<RT, T, E> {
    /**
     * The request to monitor. This should be a `Future` instance returned
     * by either the `store.request` or `store.requestManager.request` methods.
     */
    request?: Future<RT>;

    /**
     * A query to use for the request. This should be an object that can be
     * passed to `store.request`. Use this in place of `request` if you would
     * like the component to also initiate the request.
     */
    query?: StoreRequestInput<RT, T>;

    /**
     * The store instance to use for making requests. If contexts are available,
     * the component will default to using the `store` on the context.
     *
     * This is required if the store is not available via context or should be
     * different from the store provided via context.
     */
    store?: Store;

    /**
     * The autorefresh behavior for the request. This can be a boolean, or any
     * combination of the following values: `'online'`, `'interval'`, `'invalid'`.
     *
     * - `'online'`: Refresh the request when the browser comes back online
     * - `'interval'`: Refresh the request at a specified interval
     * - `'invalid'`: Refresh the request when the store emits an invalidation
     *
     * If `true`, this is equivalent to `'online,invalid'`.
     *
     * Defaults to `false`.
     */
    autorefresh?: AutorefreshBehaviorCombos;

    /**
     * The number of milliseconds to wait before refreshing the request when the
     * browser comes back online or the network becomes available.
     *
     * This also controls the interval at which the request will be refreshed if
     * the `interval` autorefresh type is enabled.
     *
     * Defaults to `30_000` (30 seconds).
     */
    autorefreshThreshold?: number;

    /**
     * The behavior of the request initiated by autorefresh. This can be one of
     * the following values:
     *
     * - `'refresh'`: Refresh the request in the background
     * - `'reload'`: Force a reload of the request
     * - `'policy'` (**default**): Let the store's configured CachePolicy decide whether to
     *    reload, refresh, or do nothing.
     *
     * Defaults to `'policy'`.
     */
    autorefreshBehavior?: 'refresh' | 'reload' | 'policy';

    /**
     * The block to render when the component is idle and waiting to be given a request.
     */
    idle?: Snippet;

    /**
     * The block to render when the request is loading.
     */
    loading?: Snippet<[state: RequestLoadingState]>;

    /**
     * The block to render when the request was cancelled.
     */
    cancelled?: Snippet<[
      /**
       * The Error the request rejected with.
       */
      error: StructuredErrorDocument<any>,
      /**
       * Utilities to assist in recovering from the error.
       */
      features: RecoveryFeatures,
    ]>;

    /**
     * The block to render when the request failed. If this block is not provided,
     * the error will be rethrown.
     *
     * Thus it is required to provide an error block and proper error handling if
     * you do not want the error to crash the application.
     */
    error?: Snippet<[
      /**
       * The Error the request rejected with.
       */
      error: StructuredErrorDocument<E>,
      /**
       * Utilities to assist in recovering from the error.
       */
      features: RecoveryFeatures,
    ]>;

    /**
     * The block to render when the request succeeded.
     */
    content?: Snippet<[value: RT, features: ContentFeatures<RT>]>;

    /**
     * The always block that receives the current state
     */
    always?: Snippet<[state: RequestState<RT, T, StructuredErrorDocument<E>>]>;
  }

  let {
    request,
    query,
    store: providedStore,
    autorefresh,
    autorefreshThreshold,
    autorefreshBehavior,
    idle,
    loading,
    cancelled,
    error,
    content,
    always,
  }: Props<RT, T, E> = $props();

  const contextStore = getContext<Store>('store');

  function throwError(error: any): never {
    throw error;
  }

  function notNull(x: null): never;
  function notNull<T>(x: T): Exclude<T, null>;
  function notNull<T>(x: T | null) {
    assert('Expected a non-null value, but got null', x !== null);
    return x;
  }

  const IdleBlockMissingError = new Error(
    'No idle block provided for <Request> component, and no query or request was provided.'
  );

  const resolvedStore = $derived.by(() => {
    const store = providedStore || contextStore
    assert(
      `No store was provided to the <Request> component. Either provide a store via the store prop or via the context API.`,
      store
    );
    return store;
  });

  let _state: RequestSubscription<RT, T, E> | null = null;

  const state = $derived.by(() => {
    if (_state && (_state as any).store !== resolvedStore) {
      _state[DISPOSE]();
      _state = null;
    }

    if (!_state) {
      _state = createRequestSubscription(resolvedStore, {
        request,
        query,
        autorefresh,
        autorefreshThreshold,
        autorefreshBehavior,
      });
    }

    return _state;
  });

  const isIdle = $derived(state?.isIdle ?? true);
  const reqState = $derived(state?.reqState);
  const result = $derived(state?.result);
  const errorFeatures = $derived(state?.errorFeatures);
  const contentFeatures = $derived(state?.contentFeatures);

  onDestroy(() => {
    if (_state) {
      _state[DISPOSE]();
      _state = null;
    }
  });
</script>

{#if isIdle}
  {#if idle}
    {@render idle()}
  {:else}
    {throwError(IdleBlockMissingError)}
  {/if}
{:else if reqState?.isLoading}
  {#if loading}
    {@render loading(reqState.loadingState)}
  {/if}
{:else if reqState?.isCancelled}
  {#if cancelled}
    {@render cancelled(notNull(reqState.reason), errorFeatures)}
  {/if}
{:else if reqState?.isError}
  {#if error}
    {@render error(notNull(reqState.reason), errorFeatures)}
  {:else}
    {throwError(notNull(reqState.reason))}
  {/if}
{:else if reqState?.isSuccess}
  {#if content}
    {@render content(result, contentFeatures)}
  {/if}
{:else if reqState && !(reqState as any).isCancelled}
  {throwError(notNull((reqState as any).reason))}
{/if}

{#if always && reqState}
  {@render always(reqState)}
{/if}
