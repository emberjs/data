<script>
  import ContextWrapper from '$lib/components/context-wrapper.svelte';
  import FindRecord from '$lib/components/find-record.svelte';
  import Request from '$lib/components/request.svelte';

</script>

<ContextWrapper>
  <h1>Find Record</h1>
  <FindRecord />
  <h1>Request</h1>
  <Request />
</ContextWrapper>
