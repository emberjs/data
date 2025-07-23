<script lang="ts">
  import { getStore } from '$lib/context/store.svelte';
  import { registerSchema } from '../store/schema';
  import { findRecord } from '@warp-drive/utilities/json-api';
  import { Request } from '@warp-drive/svelte';

  import type { User } from '../store/user';

  const store = getStore();
  registerSchema(store);

  let userId = $state('1');

  const query = $derived(findRecord<User>("user", userId));
</script>

<Request {query} {store}>
  {#snippet content(value)}
    {@const user = value.data}
    {user.first_name} {user.last_name}
  {/snippet}
</Request>
