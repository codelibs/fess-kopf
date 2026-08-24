<script setup lang="ts">
import {NTag} from 'naive-ui';
import {useCluster} from '@/composables/useCluster';

const {current, degraded, version} = useCluster();

const DOT_CLASS: Record<string, string> = {
  green: 'k-dot-green',
  yellow: 'k-dot-yellow',
  red: 'k-dot-red',
};
</script>

<template>
  <div v-if="current" class="k-statusbar">
    <span class="k-stat">
      <span class="k-dot" :class="DOT_CLASS[current.status] ?? 'k-dot-grey'" aria-hidden="true" />
      <span class="k-strong">{{ current.status }}</span>
    </span>
    <span class="k-stat">
      <span class="k-stat-label">nodes</span>
      <span class="k-metric">{{ current.number_of_nodes }}</span>
    </span>
    <span class="k-stat">
      <span class="k-stat-label">data nodes</span>
      <span class="k-metric">{{ current.number_of_data_nodes }}</span>
    </span>
    <span class="k-stat">
      <span class="k-stat-label">shards</span>
      <span class="k-metric">{{ current.shards }}</span>
    </span>
    <span v-if="current.relocating_shards" class="k-stat">
      <span class="k-stat-label">relocating</span>
      <span class="k-metric">{{ current.relocating_shards }}</span>
    </span>
    <span v-if="current.initializing_shards" class="k-stat">
      <span class="k-stat-label">initializing</span>
      <span class="k-metric">{{ current.initializing_shards }}</span>
    </span>
    <span v-if="current.unassigned_shards" class="k-stat">
      <span class="k-stat-label">unassigned</span>
      <span class="k-metric">{{ current.unassigned_shards }}</span>
    </span>
    <span class="k-stat">
      <span class="k-stat-label">indices</span>
      <span class="k-metric">{{ current.indices.length }}</span>
    </span>
    <NTag v-if="degraded" size="small" type="warning" :bordered="false">
      limited view: index data unavailable
    </NTag>
    <span class="k-push k-row k-small k-muted">
      <!-- The engine version used to sit in the title bar; it belongs with the
           rest of what the poll reports about the cluster. -->
      <span v-if="version">OpenSearch {{ version.value }}</span>
      <span>{{ current.fetched_at }}</span>
    </span>
  </div>
</template>
