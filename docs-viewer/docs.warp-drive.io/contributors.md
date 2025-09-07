---
layout: page
---

<script setup>
import { VPTeamPage, VPTeamPageTitle, VPTeamMembers } from 'vitepress/theme'
import { data as members } from '.vitepress/data/contributors.data.ts'
import { data as coreTeam } from '.vitepress/data/core.data.ts'
</script>

<VPTeamPage>
  <VPTeamPageTitle>
    <template #title>The Core Team</template>
    <template #lead>People you should really buy a coffee for.</template>
  </VPTeamPageTitle>
  <VPTeamMembers size="medium" :members="coreTeam" />
</VPTeamPage>

<VPTeamPage>
  <VPTeamPageTitle>
    <template #title>Our Contributors {{members.length}}</template>
    <template #lead>A big thank you to all the amazing people who have helped improve this project.</template>
  </VPTeamPageTitle>
  <VPTeamMembers size="small" :members="members" />
</VPTeamPage>
