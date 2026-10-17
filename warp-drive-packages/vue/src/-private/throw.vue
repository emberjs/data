<script setup lang="ts" generic="E = Error | string | object">
import { onMounted } from "vue";
const props = defineProps<{
  /**
   * The error to throw.
   */
  error: E;
}>();

onMounted(() => {
  throw props.error;
});
</script>

<script lang="ts">
/**
 * The `<Throw />` component is used to throw an error in a template.
 *
 * That's all it does. So don't use it unless the application should
 * throw an error if it reaches this point in the template.
 *
 * ```vue
 * <Throw :error="myerror" />
 * ```
 */
export default {
  name: "Throw",
};
</script>

<template></template>
