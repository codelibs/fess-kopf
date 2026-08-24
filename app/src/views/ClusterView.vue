<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';
import {RouterLink} from 'vue-router';
import {NButton, NCard, NCheckbox, NInput, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {
  clearIndexCache,
  closeIndex,
  deleteIndex,
  fetchIndexMetadata,
  fetchShardStats,
  openIndex,
  optimizeIndex,
  refreshIndex,
  relocateShard,
  setShardAllocation,
} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {refresh as refreshCluster, useCluster} from '@/composables/useCluster';
import {confirm, showInfo} from '@/composables/useDialogs';
import {bytes} from '@/model/format';
import {IndexFilter} from '@/model/index-filter';
import {NodeFilter} from '@/model/node-filter';
import type {Index} from '@/model/opensearch-index';
import {Paginator} from '@/model/paginator';
import type {Shard} from '@/model/shard';

const alerts = useAlerts();
const {cluster} = useCluster();

/** Columns are indices; how many fit is a function of the window width. */
function pageSize(): number {
  return Math.max(Math.round(window.innerWidth / 280), 1);
}

const indexFilter = reactive(new IndexFilter('', true, false, true, true));
const nodeFilter = reactive(new NodeFilter('', true, false, false));
const page = ref(1);
const size = ref(pageSize());
const relocating = ref<Shard | null>(null);

function onResize(): void {
  size.value = pageSize();
}

onMounted(() => window.addEventListener('resize', onResize));
onBeforeUnmount(() => window.removeEventListener('resize', onResize));

const paginator = computed(() => {
  const p = new Paginator<Index>(page.value, size.value, [], indexFilter);
  p.setCollection([...(cluster.value?.indices ?? [])] as Index[]);
  return p;
});

const currentPage = computed(() => paginator.value.getPage());
const selected = computed(() => paginator.value.getResults().map((index) => index.name));

const nodes = computed(() =>
  (cluster.value?.nodes ?? [])
    .filter((node) => nodeFilter.matches(node))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name)),
);

const moving = computed(
  () =>
    (cluster.value?.unassigned_shards ?? 0) > 0 ||
    (cluster.value?.relocating_shards ?? 0) > 0 ||
    (cluster.value?.initializing_shards ?? 0) > 0,
);

// Once nothing is moving there is no unhealthy-only view to stay in, and the
// control that leaves it is only shown while shards move.
watch(moving, (isMoving) => {
  if (!isMoving) {
    indexFilter.healthy = true;
  }
});

// A narrower page can strand the viewer past the last page.
watch([size, () => indexFilter.name], () => {
  page.value = 1;
});

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

async function run(
  action: () => Promise<unknown>,
  success: string,
  failure: string,
  reload = false,
): Promise<void> {
  try {
    const response = await action();
    alerts.success(success, response);
    if (reload) {
      await refreshCluster();
    }
  } catch (error) {
    alerts.error(failure, describe(error));
  }
}

async function ask(header: string, body: string, confirmText: string): Promise<boolean> {
  return confirm(header, body, confirmText);
}

const NAMES = (indices: string[]): string => `\n\nSelected indices:\n${indices.join('\n')}`;

async function promptDelete(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? 'are you sure you want to delete all selected indices?'
      : `are you sure you want to delete index ${index}?`,
    'Deleting an index cannot be undone and all data for this index will be lost.' +
      (bulk ? NAMES(selected.value) : ''),
    'Delete',
  );
  if (ok) {
    await run(() => deleteIndex(index), 'Index was deleted', 'Error while deleting index', true);
  }
}

async function promptOptimize(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? 'are you sure you want to optimize all selected indices?'
      : `are you sure you want to optimize index ${index}?`,
    'Optimizing an index is a resource intensive operation and should be done with caution. ' +
      'Usually, you will only want to optimize an index when it will no longer receive updates.' +
      (bulk ? NAMES(selected.value) : ''),
    'Optimize',
  );
  if (ok) {
    await run(
      () => optimizeIndex(index),
      'Index was successfully optimized',
      'Error while optimizing index',
    );
  }
}

async function promptRefresh(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? 'are you sure you want to refresh all selected indices?'
      : `are you sure you want to refresh index ${index}?`,
    'Refreshing an index makes all operations performed since the last refresh available ' +
      'for search.' +
      (bulk ? NAMES(selected.value) : ''),
    'Refresh',
  );
  if (ok) {
    await run(
      () => refreshIndex(index),
      'Index was successfully refreshed',
      'Error while refreshing index',
    );
  }
}

async function promptClearCache(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? 'are you sure you want to clear the cache for all selected indices?'
      : `are you sure you want to clear the cache for ${index}?`,
    'This will clear all caches for this index.' + (bulk ? NAMES(selected.value) : ''),
    'Clear',
  );
  if (ok) {
    await run(
      () => clearIndexCache(index),
      'Index cache was cleared',
      'Error while clearing index cache',
      true,
    );
  }
}

async function promptClose(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? 'are you sure you want to close all selected indices?'
      : `are you sure you want to close index ${index}?`,
    "Closing an index will remove all it's allocated shards from the cluster. Both searches " +
      'and updates will no longer be accepted for the index. A closed index can be reopened.' +
      (bulk ? NAMES(selected.value) : ''),
    'Close index',
  );
  if (ok) {
    await run(
      () => closeIndex(index),
      'Index was successfully closed',
      'Error while closing index',
      true,
    );
  }
}

async function promptOpen(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? 'are you sure you want to open all selected indices?'
      : `are you sure you want to open index ${index}?`,
    'Opening an index will trigger the recovery process. This process could take sometime ' +
      'depending on the index size.' + (bulk ? NAMES(selected.value) : ''),
    'Open index',
  );
  if (ok) {
    await run(
      () => openIndex(index),
      'Index was successfully opened',
      'Error while opening index',
      true,
    );
  }
}

async function toggleAllocation(enable: boolean): Promise<void> {
  await run(
    () => setShardAllocation(enable),
    `Shard allocation was ${enable ? 'enabled' : 'disabled'}`,
    `Error while ${enable ? 'enabling' : 'disabling'} shard allocation`,
    true,
  );
}

async function showIndexInfo(index: string, what: 'settings' | 'mappings'): Promise<void> {
  try {
    const metadata = await fetchIndexMetadata(index);
    showInfo(`${what} for ${index}`, what === 'settings' ? metadata.settings : metadata.mappings);
  } catch (error) {
    alerts.error(`Error while loading index ${what}`, describe(error));
  }
}

async function showShardStats(shard: Shard): Promise<void> {
  try {
    const stats = await fetchShardStats(shard.shard, shard.index, shard.node ?? '');
    showInfo(`stats for shard ${shard.shard}`, stats.stats);
  } catch (error) {
    alerts.error('Error while loading shard stats', describe(error));
  }
}

/** A cell can receive the selected shard when it holds no copy of it already. */
function canReceiveShard(index: Index | null, nodeId: string): boolean {
  const shard = relocating.value;
  if (shard === null || index === null || shard.node === nodeId || shard.index !== index.name) {
    return false;
  }
  return (cluster.value?.getShards(nodeId, index.name) ?? []).every(
    (existing) => existing.shard !== shard.shard,
  );
}

async function promptRelocate(toNode: string): Promise<void> {
  const shard = relocating.value;
  if (shard === null) {
    return;
  }
  const ok = await ask(
    'are you sure you want relocate the shard?',
    'Once the relocation finishes, the cluster will try to rebalance itself to an even state',
    'Relocate',
  );
  if (!ok) {
    return;
  }
  try {
    const response = await relocateShard(shard.shard, shard.index, shard.node ?? '', toNode);
    alerts.success('Relocation successfully executed', response);
    await refreshCluster();
  } catch (error) {
    alerts.error('Error while moving shard', describe(error));
  } finally {
    relocating.value = null;
  }
}

function shardClass(shard: Shard): string {
  const classes = ['k-shard', `k-shard-${shard.state.toLowerCase()}`];
  classes.push(shard.primary ? 'k-shard-primary' : 'k-shard-replica');
  if (relocating.value?.id === shard.id) {
    classes.push('k-shard-selected');
  }
  return classes.join(' ');
}
</script>

<template>
  <template v-if="cluster">
    <div class="k-page-head">
      <div>
        <h1 class="k-page-title">Cluster</h1>
        <p class="k-page-sub">
          {{ currentPage.first }}-{{ currentPage.last }} of {{ currentPage.total }} indices across
          {{ nodes.length }} nodes.
        </p>
      </div>
      <div class="k-row">
        <NButton size="small" :disabled="!currentPage.previous" @click="page -= 1">
          previous
        </NButton>
        <NButton size="small" :disabled="!currentPage.next" @click="page += 1">next</NButton>
      </div>
    </div>

    <NCard>
      <div class="k-row k-wrap k-gap-lg">
        <NInput
          v-model:value="indexFilter.name"
          placeholder="Filter indices by name..."
          clearable
          aria-label="Filter indices by name"
          style="max-width: 20rem"
          :input-props="{id: 'index-filter'}"
        />
        <NCheckbox id="f-closed" v-model:checked="indexFilter.closed">
          Closed
          <NTag size="tiny" :bordered="false">{{ cluster.closedIndices }}</NTag>
        </NCheckbox>
        <NCheckbox id="f-special" v-model:checked="indexFilter.special">
          Special
          <NTag size="tiny" :bordered="false">{{ cluster.special_indices }}</NTag>
        </NCheckbox>
        <NInput
          v-model:value="nodeFilter.name"
          placeholder="Filter nodes..."
          clearable
          aria-label="Filter nodes"
          style="max-width: 14rem"
          :input-props="{id: 'cluster-node-filter'}"
        />
      </div>
    </NCard>

    <NCard :content-style="{padding: 0}">
      <div class="k-scroll-x">
        <table class="k-matrix">
          <thead>
            <tr>
              <th scope="col">
                <div class="k-row">
                  <NButton
                    size="tiny"
                    :title="
                      cluster.disableAllocation === 'true'
                        ? 'enable shard allocation'
                        : 'disable shard allocation'
                    "
                    @click="toggleAllocation(cluster.disableAllocation === 'true')"
                  >
                    {{ cluster.disableAllocation === 'true' ? '🔒' : '🔓' }}
                  </NButton>
                  <NButton
                    size="tiny"
                    :title="indexFilter.asc ? 'sort descending' : 'sort ascending'"
                    @click="indexFilter.asc = !indexFilter.asc"
                  >
                    {{ indexFilter.asc ? 'A→Z' : 'Z→A' }}
                  </NButton>
                  <details class="k-menu k-menu-button">
                    <summary>bulk</summary>
                    <ul class="k-menu-items">
                      <li>
                        <NButton text size="tiny" @click="promptClose(selected.join(','), true)">
                          close selected
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptOpen(selected.join(','), true)">
                          open selected
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptOptimize(selected.join(','), true)">
                          optimize selected
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptRefresh(selected.join(','), true)">
                          refresh selected
                        </NButton>
                      </li>
                      <li>
                        <NButton
                          text
                          size="tiny"
                          @click="promptClearCache(selected.join(','), true)"
                        >
                          clear selected caches
                        </NButton>
                      </li>
                      <li>
                        <NButton
                          text
                          size="tiny"
                          type="error"
                          @click="promptDelete(selected.join(','), true)"
                        >
                          delete selected
                        </NButton>
                      </li>
                    </ul>
                  </details>
                </div>
              </th>
              <th v-for="(index, i) in currentPage.elements" :key="i" scope="col">
                <template v-if="index">
                  <details class="k-menu k-index-name" :class="{'k-index-closed': index.closed}">
                    <summary>{{ index.name }}</summary>
                    <ul class="k-menu-items">
                      <li>
                        <NButton text size="tiny" @click="showIndexInfo(index.name, 'settings')">
                          show settings
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="showIndexInfo(index.name, 'mappings')">
                          show mappings
                        </NButton>
                      </li>
                      <li v-if="index.open">
                        <NButton text size="tiny" @click="promptClose(index.name)">
                          close index
                        </NButton>
                      </li>
                      <li v-else>
                        <NButton text size="tiny" @click="promptOpen(index.name)">
                          open index
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptOptimize(index.name)">
                          optimize index
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptRefresh(index.name)">
                          refresh index
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptClearCache(index.name)">
                          clear cache
                        </NButton>
                      </li>
                      <li>
                        <RouterLink
                          class="k-menu-link"
                          :to="{name: 'indexSettings', query: {index: index.name}}"
                        >
                          edit settings
                        </RouterLink>
                      </li>
                      <li>
                        <NButton text size="tiny" type="error" @click="promptDelete(index.name)">
                          delete index
                        </NButton>
                      </li>
                    </ul>
                  </details>
                  <div class="k-small k-muted" style="margin-top: 4px; font-weight: 400">
                    {{ index.num_of_shards }} × {{ index.num_of_replicas + 1 }} ·
                    {{ index.num_docs }} docs · {{ bytes(index.size_in_bytes) }}
                  </div>
                  <div
                    v-if="index.aliases.length"
                    class="k-small"
                    style="font-weight: 400"
                    :title="index.aliases.join('\n')"
                  >
                    🏷 {{ index.aliases[0] }}
                    <span v-if="index.aliases.length > 1">(+{{ index.aliases.length - 1 }})</span>
                  </div>
                </template>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="moving">
              <th scope="row">
                <div v-if="cluster.unassigned_shards" style="color: var(--k-error)">
                  ⚠ {{ cluster.unassigned_shards }} unassigned shards
                </div>
                <div v-if="cluster.relocating_shards" style="color: var(--k-info)">
                  ↻ {{ cluster.relocating_shards }} relocating shards
                </div>
                <div v-if="cluster.initializing_shards" style="color: var(--k-warning)">
                  ◌ {{ cluster.initializing_shards }} initializing shards
                </div>
                <NButton
                  text size="tiny" type="primary"
                  @click="indexFilter.healthy = !indexFilter.healthy"
                >
                  {{ indexFilter.healthy ? 'show only unhealthy indices' : 'show all indices' }}
                </NButton>
              </th>
              <td v-for="(index, i) in currentPage.elements" :key="i">
                <div class="k-shards">
                  <span
                    v-for="shard in index ? cluster.getUnassignedShards(index.name) : []"
                    :key="shard.id"
                    class="k-shard k-shard-unassigned"
                  >{{ shard.shard }}</span>
                </div>
              </td>
            </tr>
            <tr v-for="node in nodes" :key="node.id">
              <th scope="row">
                <div class="k-row">
                  <span v-if="node.master">{{ node.current_master ? '★' : '☆' }}</span>
                  <span v-if="node.data">🗄</span>
                  <span v-if="node.client">🔍</span>
                  <span class="k-strong">{{ node.name }}</span>
                </div>
                <div class="k-small k-muted k-mono">{{ node.transportAddress }}</div>
              </th>
              <td v-for="(index, i) in currentPage.elements" :key="i">
                <div class="k-shards">
                  <button
                    v-if="canReceiveShard(index, node.id)"
                    type="button"
                    class="k-shard k-shard-target"
                    title="move the selected shard here"
                    @click="promptRelocate(node.id)"
                  >
                    ✓
                  </button>
                  <details
                    v-for="shard in index ? cluster.getShards(node.id, index.name) : []"
                    :key="shard.id"
                    class="k-menu"
                  >
                    <summary :class="shardClass(shard)">{{ shard.shard }}</summary>
                    <ul class="k-menu-items">
                      <li>
                        <NButton text size="tiny" @click="showShardStats(shard)">
                          show shard stats
                        </NButton>
                      </li>
                      <li v-if="relocating?.id !== shard.id">
                        <NButton text size="tiny" @click="relocating = shard">
                          select for relocation
                        </NButton>
                      </li>
                      <li v-else>
                        <NButton text size="tiny" @click="relocating = null">
                          unselect for relocation
                        </NButton>
                      </li>
                    </ul>
                  </details>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </NCard>
  </template>
</template>

<style scoped>
.k-menu-link {
  display: block;
  padding: 2px 0;
  font-size: 12px;
  color: var(--k-primary);
  text-decoration: none;
}

.k-menu-link:hover {
  text-decoration: underline;
}
</style>
