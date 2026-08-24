<script setup lang="ts">
import {computed, ref} from 'vue';
import {NButton, NCard, NCheckbox, NInput, NTag} from 'naive-ui';
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

/** Percentages read better with a bar behind them than as bare numbers. */
function gaugeColour(percent: number | undefined): string {
  if ((percent ?? 0) >= 90) {
    return 'var(--k-error)';
  }
  return (percent ?? 0) >= 75 ? 'var(--k-warning)' : 'var(--k-success)';
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">Nodes</h1>
      <p class="k-page-sub">{{ nodes.length }} of {{ cluster?.nodes.length ?? 0 }} shown.</p>
    </div>
  </div>

  <NCard>
    <div class="k-row k-wrap k-gap-lg">
      <label class="k-label" for="node-name-filter" style="margin: 0">filter</label>
      <NInput
        v-model:value="filter.name"
        placeholder="filter nodes by name"
        clearable
        style="max-width: 22rem"
        :input-props="{id: 'node-name-filter'}"
      />
      <div class="k-row">
        <NCheckbox id="f-master" v-model:checked="filter.master">master</NCheckbox>
        <NCheckbox id="f-data" v-model:checked="filter.data">data</NCheckbox>
        <NCheckbox id="f-client" v-model:checked="filter.client">client</NCheckbox>
      </div>
    </div>
  </NCard>

  <NCard :content-style="{padding: 0}">
    <div class="k-scroll-x">
      <table class="k-table">
        <thead>
          <tr>
            <th v-for="column in COLUMNS" :key="column.property" scope="col">
              <NButton text size="tiny" @click="setSortBy(column.property)">
                <span class="k-strong" style="color: var(--k-text-muted)">{{ column.label }}</span>
                <span v-if="sortBy === column.property" style="margin-left: 4px">
                  {{ reverse ? '▼' : '▲' }}
                </span>
              </NButton>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in nodes" :key="node.id">
            <td>
              <div class="k-row k-row-top">
                <div class="k-small k-muted">
                  <span
                    v-if="node.master"
                    :title="node.current_master ? 'current master' : 'master eligible'"
                  >
                    {{ node.current_master ? '★' : '☆' }}
                  </span>
                  <span v-if="node.data" title="data node">🗄</span>
                  <span v-if="node.client" title="client node">🔍</span>
                </div>
                <div class="k-stack-tight">
                  <NButton text type="primary" size="small" @click="showNodeStats(node.id)">
                    <span class="k-strong">{{ node.name }}</span>
                  </NButton>
                  <div class="k-small k-muted k-mono">{{ node.host }}</div>
                  <div class="k-small k-muted k-mono">{{ node.transportAddress }}</div>
                  <div class="k-row">
                    <NTag size="tiny" :bordered="false">JVM: {{ node.jvmVersion }}</NTag>
                    <NTag size="tiny" :bordered="false">OS: {{ node.version }}</NTag>
                  </div>
                </div>
              </div>
            </td>
            <td class="k-metric">
              {{ node.load_average ? decimal(node.load_average) : 'N/A' }}
            </td>
            <td>
              <div class="k-metric">{{ decimal(node.cpu) }}</div>
              <div class="k-gauge">
                <span :style="{width: `${node.cpu ?? 0}%`, background: gaugeColour(node.cpu)}" />
              </div>
            </td>
            <td>
              <div class="k-metric">{{ decimal(node.heap_used_percent) }}</div>
              <div class="k-gauge">
                <span
                  :style="{
                    width: `${node.heap_used_percent ?? 0}%`,
                    background: gaugeColour(node.heap_used_percent),
                  }"
                />
              </div>
              <div class="k-small k-muted">used: {{ node.heap_used }}</div>
              <div class="k-small k-muted">max: {{ node.heap_max }}</div>
            </td>
            <td>
              <template v-if="!node.client">
                <div class="k-metric">{{ decimal(node.disk_used_percent) }}</div>
                <div class="k-gauge">
                  <span
                    :style="{
                      width: `${node.disk_used_percent ?? 0}%`,
                      background: gaugeColour(node.disk_used_percent),
                    }"
                  />
                </div>
                <div class="k-small k-muted">free: {{ bytes(node.disk_free_in_bytes) }}</div>
                <div class="k-small k-muted">total: {{ bytes(node.disk_total_in_bytes) }}</div>
              </template>
              <em v-else class="k-small k-muted">no disk info for client nodes</em>
            </td>
            <td class="k-metric">{{ timeInterval(node.uptime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="nodes.length === 0" class="k-empty">
      No nodes found matching the current filter
    </p>
  </NCard>
</template>

<style scoped>
.k-gauge {
  width: 100%;
  min-width: 4rem;
  max-width: 8rem;
  height: 4px;
  margin: 3px 0 5px;
  border-radius: 2px;
  background: var(--k-border);
  overflow: hidden;
}

.k-gauge > span {
  display: block;
  height: 100%;
  border-radius: 2px;
}
</style>
