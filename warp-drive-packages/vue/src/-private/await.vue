<script lang="ts" setup generic="T, E = Error | string | object">
import type { Awaitable } from "@warp-drive/core/request";
import { getPromiseState } from "@warp-drive/core/store/-private";
import Throw from "./throw.vue";

const and = (x: unknown, y: unknown) => Boolean(x && y);

const props = defineProps<{
  /**
   * The promise to await
   */
  promise: Promise<T> | Awaitable<T, E>;
}>();
const state = getPromiseState<T, E>(props.promise);
</script>

<template>
  <template v-if="state.isPending">
    <slot name="pending"></slot>
  </template>
  <template v-else-if="and(state.isError, $slots.error)">
    <slot name="error" :reason="state.reason"></slot>
  </template>
  <template v-else-if="state.isSuccess">
    <slot name="success" :value="state.value"></slot>
  </template>
  <template v-else>
    <Throw :error="state.reason" />
  </template>
</template>
