# Components

:::tabs

== Ember

```gts:line-numbers [Ember]
import type { TOC } from '@ember/component/template-only';
import { service } from '@ember/service';
import Component from '@glimmer/component';

import { importSync, macroCondition, moduleExists } from '@embroider/macros';
import type { ComponentLike } from '@glint/template';

import type { RequestManager, Store } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import type {
  ContentFeatures,
  RecoveryFeatures,
  RequestArgs,
  RequestLoadingState,
  RequestState,
  RequestSubscription,
} from '@warp-drive/core/store/-private';
import { createRequestSubscription, DISPOSE, memoized } from '@warp-drive/core/store/-private';
import type { StructuredErrorDocument } from '@warp-drive/core/types/request';

import { and, Throw } from './await.gts';

export type { ContentFeatures, RecoveryFeatures };

function notNull(x: null): never;
function notNull<T>(x: T): Exclude<T, null>;
function notNull<T>(x: T | null) {
  assert('Expected a non-null value, but got null', x !== null);
  return x;
}

const not = (x: unknown) => !x;
const IdleBlockMissingError = new Error(
  'No idle block provided for <Request> component, and no query or request was provided.'
);

let consume = service;
if (macroCondition(moduleExists('ember-provide-consume-context'))) {
  const { consume: contextConsume } = importSync('ember-provide-consume-context') as { consume: typeof service };
  consume = contextConsume;
}

const DefaultChrome: TOC<{
  Blocks: {
    default: [];
  };
}> = <template>{{yield}}</template>;

export interface EmberRequestArgs<RT, E> extends RequestArgs<RT, E> {
  chrome?: ComponentLike<{
    Blocks: { default: [] };
    Args: { state: RequestState | null; features: ContentFeatures<RT> };
  }>;
}

interface RequestSignature<RT, E> {
  Args: EmberRequestArgs<RT, E>;
  Blocks: {
    idle: [];
    loading: [state: RequestLoadingState];
    cancelled: [
      error: StructuredErrorDocument<E>,
      features: RecoveryFeatures,
    ];

    error: [
      error: StructuredErrorDocument<E>,
      features: RecoveryFeatures,
    ];

    content: [value: RT, features: ContentFeatures<RT>];
    always: [state: RequestState<RT, StructuredErrorDocument<E>>];
  };
}

export class Request<RT, E> extends Component<RequestSignature<RT, E>> {
  @consume('store') declare _store: Store;

  get store(): Store | RequestManager {
    const store = this.args.store || this._store;
    assert(
      moduleExists('ember-provide-consume-context')
        ? `No store was provided to the <Request> component. Either provide a store via the @store arg or via the context API provided by ember-provide-consume-context.`
        : `No store was provided to the <Request> component. Either provide a store via the @store arg or by registering a store service.`,
      store
    );
    return store;
  }

  _state: RequestSubscription<RT, E> | null = null;
  get state(): RequestSubscription<RT, E> {
    let { _state } = this;
    const { store } = this;
    const { subscription } = this.args;
    if (_state && (_state.store !== store || subscription)) {
      _state[DISPOSE]();
      _state = null;
    }

    if (subscription) {
      return subscription;
    }

    if (!_state) {
      this._state = _state = createRequestSubscription(store, this.args);
    }

    return _state;
  }

  @memoized
  get Chrome(): ComponentLike<{
    Blocks: { default: [] };
    Args: { state: RequestState | null; features: ContentFeatures<RT> };
  }> {
    return this.args.chrome || DefaultChrome;
  }

  willDestroy(): void {
    if (this._state) {
      this._state[DISPOSE]();
      this._state = null;
    }
  }

  <template>
    <this.Chrome @state={{if this.state.isIdle null this.state.reqState}} @features={{this.state.contentFeatures}}>
      {{#if (and this.state.isIdle (has-block "idle"))}}
        {{yield to="idle"}}

      {{else if this.state.isIdle}}
        <Throw @error={{IdleBlockMissingError}} />

      {{else if this.state.reqState.isLoading}}
        {{yield this.state.reqState.loadingState to="loading"}}

      {{else if (and this.state.reqState.isCancelled (has-block "cancelled"))}}
        {{yield (notNull this.state.reqState.reason) this.state.errorFeatures to="cancelled"}}

      {{else if (and this.state.reqState.isError (has-block "error"))}}
        {{yield (notNull this.state.reqState.reason) this.state.errorFeatures to="error"}}

      {{else if this.state.reqState.isSuccess}}
        {{yield this.state.result this.state.contentFeatures to="content"}}

      {{else if (not this.state.reqState.isCancelled)}}
        <Throw @error={{(notNull this.state.reqState.reason)}} />
      {{/if}}

      {{yield this.state.reqState to="always"}}
    </this.Chrome>
  </template>
}
```


== React

```tsx:line-numbers [React]
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
import { DEBUG } from "@warp-drive/core/build-config/env";

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
  idle?: React.FC<{}>;
  loading?: React.FC<{ state: RequestLoadingState }>;
  cancelled?: React.FC<{
    error: StructuredErrorDocument<E>;
    features: RecoveryFeatures;
  }>;

  error: React.FC<{
    error: StructuredErrorDocument<E>;
    features: RecoveryFeatures;
  }>;

  content: React.FC<{ result: RT; features: ContentFeatures<RT> }>;
}

export function Throw({ error }: { error: Error }): never {
  throw error;
}

export function Request<RT, E>($props: RequestProps<RT, E>): JSX.Element {
  return (
    <ReactiveContext>
      <InternalRequest {...$props} />
    </ReactiveContext>
  );
}

function isStrictModeRender(): boolean {
  const count = useRef<number>(0);

  // in debug we need to skip every second invocation
  if (DEBUG) {
    if (count.current++ % 2 === 1) {
      return true;
    }
  }

  return false;
}

function InternalRequest<RT, E>($props: RequestProps<RT, E>): JSX.Element {
  const isStrict = isStrictModeRender();
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

  const initialized = useRef<null | {
    disposable: { [DISPOSE]: () => void } | null;
    dispose: () => void;
  }>(null);
  const effect = () => {
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
  };
  let maybeEffect = effect;

  if (DEBUG) {
    if (isStrict) {
      maybeEffect = () => {
        if (initialized.current) {
          return effect();
        }
        return () => {
          // initialize our actual effect
          effect();
          // in strict mode we don't want to run the teardown
          // for the second invocation
        };
      };
    }
  }

  useEffect(maybeEffect, [sink.current]);

  const state = $props.subscription ?? sink.current!;
  const slots = $props.states;

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
```

== Vue

```vue:line-numbers [Vue]
<script lang="ts" setup generic="RT, T, E = Error | string | object">
import type { Store } from "@warp-drive/core";
import { assert } from "@warp-drive/core/build-config/macros";
import {
  createRequestSubscription,
  DISPOSE,
  type RequestSubscription,
  type RequestComponentArgs,
} from "@warp-drive/core/store/-private";

import { inject, onBeforeUpdate, onUnmounted } from "vue";

const props = defineProps<RequestComponentArgs<RT, T, E>>();
const _store = inject<Store>("store");
let store = props.store || _store;
assert(`No store was provided to the <Request> component. Either pass a store via context or via props.`, store);
let state: RequestSubscription<RT, T, E> = createRequestSubscription(store, props);

function notNull(x: null): never;
function notNull<T>(x: T): Exclude<T, null>;
function notNull<T>(x: T | null) {
  assert("Expected a non-null value, but got null", x !== null);
  return x;
}
const and = (x: unknown, y: unknown) => Boolean(x && y);
const not = (x: unknown) => !x;
const IdleBlockMissingError = new Error(
  "No idle block provided for <Request> component, and no query or request was provided."
);

onBeforeUpdate(() => {
  store = props.store || _store;
  assert(`No store was provided to the <Request> component. Either pass a store via context or via props.`, store);

  if (state.store !== store) {
    state[DISPOSE]();
    state = createRequestSubscription(store, props);
  }
});

onUnmounted(() => {
  state[DISPOSE]();
});
</script>

<script lang="ts">
export default {
  name: "Request",
};
</script>

<template>
  <slot name="before" :state="state.reqState"></slot>
  <template v-if="state.isIdle">
    <slot name="idle"><Throw :error="IdleBlockMissingError" /></slot>
  </template>
  <template v-else-if="state.reqState.isLoading">
    <slot name="loading" :state="state.reqState.loadingState"></slot>
  </template>
  <template v-else-if="and(state.reqState.isCancelled, $slots.cancelled)">
    <slot name="cancelled" :reason="notNull(state.reqState.reason)" :state="state.errorFeatures"></slot>
  </template>
  <template v-else-if="and(state.reqState.isError, $slots.error)">
    <slot name="error" :reason="notNull(state.reqState.reason)" :state="state.errorFeatures"></slot>
  </template>
  <template v-else-if="state.reqState.isSuccess">
    <slot name="content" :value="state.result" :state="state.contentFeatures"></slot>
  </template>
  <template v-else-if="not(state.reqState.isCancelled)">
    <Throw :error="notNull(state.reqState.reason)" />
  </template>
  <slot name="after" :state="state.reqState"></slot>
</template>
```

== Svelte

```svelte:line-numbers [Svelte]
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
    request?: Future<RT>;
    query?: StoreRequestInput<RT, T>;
    store?: Store;
    autorefresh?: AutorefreshBehaviorCombos;
    autorefreshThreshold?: number;
    autorefreshBehavior?: 'refresh' | 'reload' | 'policy';
    idle?: Snippet;
    loading?: Snippet<[state: RequestLoadingState]>;

    cancelled?: Snippet<[
      error: StructuredErrorDocument<any>,
      features: RecoveryFeatures,
    ]>;

    error?: Snippet<[
      error: StructuredErrorDocument<E>,
      features: RecoveryFeatures,
    ]>;

    content?: Snippet<[value: RT, features: ContentFeatures<RT>]>;
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
```


:::
