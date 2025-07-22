<script lang="ts">
  import { getStore } from '$lib/context/store.svelte';
  import type { SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';
  import { registerSchema } from '../store/schema';
  import type { User } from '../store/user';

  const store = getStore();
  registerSchema(store);

  let userId = $state('1');

  const record = $derived(store.request<SingleResourceDataDocument<User>>({
      url: `/users/${userId}`,
      method: 'GET',
      op: 'query',
    }));
</script>

{#await record}
  Loading...
{:then response}
  {@const user = response.content.data}

  <div data-test="first_name">{user?.first_name}</div>
  <div data-test="last_name">{user?.last_name}</div>
  <div data-test="full_name">{user?.full_name}</div>

  <button data-test-update-user type="button" onclick={() => {
    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          first_name: 'Sam',
          last_name: 'Jones',
        },
      },
    })
  }}>
    Update name to Sam Jones
  </button>

  <button data-test-update-id type="button" onclick={() => {
    userId = '2';
  }}>
    Fetch user 2
  </button>
{/await}
