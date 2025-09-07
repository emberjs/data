<template>
  <div v-if="props.contributors.length" class="contributors-container">
    <div class="avatars">
      <a
        v-for="contributor in props.contributors"
        :key="contributor.avatar"
        :href="contributor.githubLink"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="contributor.name"
      >
        <img :src="contributor.avatar" :alt="`${contributor.name}'s avatar`" class="avatar" />
      </a>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  contributors: {
    type: Array,
    required: true,
  },
});
</script>

<style scoped>
.contributors-container {
  margin-top: 2rem;
}
.avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--vp-c-border);
  transition: transform 0.2s ease-in-out;
}
.avatar:hover {
  transform: scale(1.1);
}
</style>
