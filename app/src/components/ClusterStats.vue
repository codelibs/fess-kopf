<script setup lang="ts">
import {useCluster} from '@/composables/useCluster';

const {current, degraded} = useCluster();

const STATUS_CLASS: Record<string, string> = {
  green: 'text-bg-success',
  yellow: 'text-bg-warning',
  red: 'text-bg-danger',
};
</script>

<template>
  <div v-if="current" class="container-fluid py-2 border-bottom">
    <div class="d-flex flex-wrap gap-3 small align-items-center">
      <span>
        status
        <span class="badge" :class="STATUS_CLASS[current.status]">{{ current.status }}</span>
      </span>
      <span>nodes <strong>{{ current.number_of_nodes }}</strong></span>
      <span>data nodes <strong>{{ current.number_of_data_nodes }}</strong></span>
      <span>shards <strong>{{ current.shards }}</strong></span>
      <span v-if="current.relocating_shards">
        relocating <strong>{{ current.relocating_shards }}</strong>
      </span>
      <span v-if="current.initializing_shards">
        initializing <strong>{{ current.initializing_shards }}</strong>
      </span>
      <span v-if="current.unassigned_shards">
        unassigned <strong>{{ current.unassigned_shards }}</strong>
      </span>
      <span>indices <strong>{{ current.indices.length }}</strong></span>
      <span class="text-body-secondary ms-auto">{{ current.fetched_at }}</span>
      <span v-if="degraded" class="badge text-bg-warning">
        limited view: index data unavailable
      </span>
    </div>
  </div>
</template>
