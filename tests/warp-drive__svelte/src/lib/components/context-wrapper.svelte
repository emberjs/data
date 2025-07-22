<script lang="ts">
  import { createStore } from '$lib/context/store.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  createStore();
</script>

{@render children()}
