<script setup lang="ts">
import {computed, ref} from 'vue';
import {RequestError} from '@/api/client';
import {fetchNodeStats} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import {showInfo} from '@/composables/useDialogs';
import type {ClusterNode} from '@/model/cluster-node';
import {bytes, decimal, timeInterval} from '@/model/format';
import {NodeFilter} from '@/model/node-filter';

const alerts = useAlerts();
const {cluster} = useCluster();

const filter = ref(new NodeFilter('', true, true, true));
const sortBy = ref<keyof ClusterNode>('name');
const reverse = ref(false);

const COLUMNS: {property: keyof ClusterNode; label: string}[] = [
  {property: 'name', label: 'name'},
  {property: 'load_average', label: 'load average'},
  {property: 'cpu', label: 'cpu %'},
  {property: 'heap_used_percent', label: 'heap usage %'},
  {property: 'disk_used_percent', label: 'disk usage %'},
  {property: 'uptime', label: 'uptime'},
];

const nodes = computed(() => {
  const matching = (cluster.value?.nodes ?? []).filter((node) => filter.value.matches(node));
  const sorted = [...matching].sort((a, b) => {
    const left = a[sortBy.value];
    const right = b[sortBy.value];
    if (typeof left === 'string' && typeof right === 'string') {
      return left.localeCompare(right);
    }
    return Number(left ?? 0) - Number(right ?? 0);
  });
  return reverse.value ? sorted.reverse() : sorted;
});

function setSortBy(property: keyof ClusterNode): void {
  if (sortBy.value === property) {
    reverse.value = !reverse.value;
  }
  sortBy.value = property;
}

async function showNodeStats(nodeId: string): Promise<void> {
  try {
    const stats = await fetchNodeStats(nodeId);
    showInfo(`stats for ${stats.name}`, stats.stats);
  } catch (error) {
    alerts.error(
      'Error while loading node stats',
      error instanceof RequestError ? error.body : String(error),
    );
  }
}
</script>

<template>
  <div>
    <div class="row g-2 mb-3">
      <div class="col-sm-4">
        <label class="visually-hidden" for="node-name-filter">filter nodes by name</label>
        <input
          id="node-name-filter"
          v-model="filter.name"
          class="form-control form-control-sm"
          placeholder="filter nodes by name"
        >
      </div>
      <div class="col-sm-8 d-flex gap-3 align-items-center">
        <div class="form-check">
          <input id="f-master" v-model="filter.master" class="form-check-input" type="checkbox">
          <label class="form-check-label small" for="f-master">master</label>
        </div>
        <div class="form-check">
          <input id="f-data" v-model="filter.data" class="form-check-input" type="checkbox">
          <label class="form-check-label small" for="f-data">data</label>
        </div>
        <div class="form-check">
          <input id="f-client" v-model="filter.client" class="form-check-input" type="checkbox">
          <label class="form-check-label small" for="f-client">client</label>
        </div>
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-sm table-bordered align-middle">
        <thead>
          <tr>
            <th v-for="column in COLUMNS" :key="column.property" scope="col">
              <button
                type="button"
                class="btn btn-link btn-sm p-0"
                @click="setSortBy(column.property)"
              >
                {{ column.label }}
                <span v-if="sortBy === column.property">{{ reverse ? '▼' : '▲' }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in nodes" :key="node.id">
            <td>
              <div class="d-flex gap-2 align-items-start">
                <div class="small text-body-secondary">
                  <span
                    v-if="node.master"
                    :title="node.current_master ? 'current master' : 'master eligible'"
                  >
                    {{ node.current_master ? '★' : '☆' }}
                  </span>
                  <span v-if="node.data" title="data node">🗄</span>
                  <span v-if="node.client" title="client node">🔍</span>
                </div>
                <div>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0"
                    @click="showNodeStats(node.id)"
                  >
                    {{ node.name }}
                  </button>
                  <div class="small text-body-secondary">{{ node.host }}</div>
                  <div class="small text-body-secondary">{{ node.transportAddress }}</div>
                  <div class="small">
                    <span class="badge text-bg-secondary">JVM: {{ node.jvmVersion }}</span>
                    <span class="badge text-bg-secondary ms-1">OS: {{ node.version }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td>{{ node.load_average ? decimal(node.load_average) : 'N/A' }}</td>
            <td>{{ decimal(node.cpu) }}</td>
            <td>
              {{ decimal(node.heap_used_percent) }}
              <div class="small text-body-secondary">used: {{ node.heap_used }}</div>
              <div class="small text-body-secondary">max: {{ node.heap_max }}</div>
            </td>
            <td>
              <template v-if="!node.client">
                {{ decimal(node.disk_used_percent) }}
                <div class="small text-body-secondary">
                  free: {{ bytes(node.disk_free_in_bytes) }}
                </div>
                <div class="small text-body-secondary">
                  total: {{ bytes(node.disk_total_in_bytes) }}
                </div>
              </template>
              <em v-else class="small text-body-secondary">no disk info for client nodes</em>
            </td>
            <td>{{ timeInterval(node.uptime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="nodes.length === 0" class="text-center text-body-secondary py-3">
      No nodes found matching the current filter
    </p>
  </div>
</template>
