<script setup lang="ts">
import type {Explanation} from '@/model/explain';

defineProps<{node: Explanation; depth?: number}>();
</script>

<template>
  <details class="k-explain" :open="(depth ?? 0) < 2">
    <summary>
      <span class="k-metric" style="margin-right: 8px">{{ node.value }}</span>
      <span class="k-muted">{{ node.description }}</span>
    </summary>
    <div v-if="node.details?.length" class="k-explain-children">
      <ExplanationTree
        v-for="(child, i) in node.details"
        :key="i"
        :node="child"
        :depth="(depth ?? 0) + 1"
      />
    </div>
  </details>
</template>

<style scoped>
.k-explain > summary {
  cursor: pointer;
  padding: 2px 0;
  font-size: 12px;
}

.k-explain-children {
  margin-left: 8px;
  padding-left: 10px;
  border-left: 1px solid var(--k-border);
}
</style>
