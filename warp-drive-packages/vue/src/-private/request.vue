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
/**
 * The `<Request />` component is a powerful tool for managing data fetching and
 * state in your Ember application. It provides a declarative approach to reactive
 * control-flow for managing requests and state in your application.
 *
 * The `<Request />` component is ideal for handling "boundaries", outside which some
 * state is still allowed to be unresolved and within which it MUST be resolved.
 */
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
