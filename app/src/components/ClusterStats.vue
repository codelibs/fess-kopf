<script setup lang="ts">
import {useCluster} from '@/composables/useCluster';

const {health} = useCluster();

const STATUS_CLASS: Record<string, string> = {
  green: 'text-bg-success',
  yellow: 'text-bg-warning',
  red: 'text-bg-danger',
};
</script>

<template>
  <div v-if="health" class="container-fluid py-2 border-bottom">
    <div class="d-flex flex-wrap gap-3 small">
      <span>
        status
        <span class="badge" :class="STATUS_CLASS[health.status]">{{ health.status }}</span>
      </span>
      <span>nodes <strong>{{ health.number_of_nodes }}</strong></span>
      <span>data nodes <strong>{{ health.number_of_data_nodes }}</strong></span>
      <span>active shards <strong>{{ health.active_shards }}</strong></span>
      <span v-if="health.relocating_shards">
        relocating <strong>{{ health.relocating_shards }}</strong>
      </span>
      <span v-if="health.initializing_shards">
        initializing <strong>{{ health.initializing_shards }}</strong>
      </span>
      <span v-if="health.unassigned_shards">
        unassigned <strong>{{ health.unassigned_shards }}</strong>
      </span>
    </div>
  </div>
</template>
