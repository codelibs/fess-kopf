<script setup lang="ts">
import type {Explanation} from '@/model/explain';

defineProps<{node: Explanation; depth?: number}>();
</script>

<template>
  <details :open="(depth ?? 0) < 2">
    <summary class="small">
      <span class="fw-bold me-2">{{ node.value }}</span>
      <span>{{ node.description }}</span>
    </summary>
    <div v-if="node.details?.length" class="ms-3 border-start ps-2">
      <ExplanationTree
        v-for="(child, i) in node.details"
        :key="i"
        :node="child"
        :depth="(depth ?? 0) + 1"
      />
    </div>
  </details>
</template>
