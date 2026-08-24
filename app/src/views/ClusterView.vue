<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';
import {RouterLink} from 'vue-router';
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
  const classes = ['shard', `shard-${shard.state.toLowerCase()}`];
  if (shard.primary) {
    classes.push('shard-primary');
  }
  if (relocating.value?.id === shard.id) {
    classes.push('shard-relocation-source');
  }
  return classes.join(' ');
}
</script>

<template>
  <div v-if="cluster">
    <div class="row g-2 mb-2 align-items-center">
      <div class="col-lg-5">
        <label class="visually-hidden" for="index-filter">Filter indices by name</label>
        <input
          id="index-filter"
          v-model="indexFilter.name"
          class="form-control form-control-sm"
          placeholder="Filter indices by name..."
        >
      </div>
      <div class="col-auto form-check">
        <input id="f-closed" v-model="indexFilter.closed" class="form-check-input" type="checkbox">
        <label class="form-check-label small" for="f-closed">
          Closed <span class="badge text-bg-secondary">{{ cluster.closedIndices }}</span>
        </label>
      </div>
      <div class="col-auto form-check">
        <input
          id="f-special"
          v-model="indexFilter.special"
          class="form-check-input"
          type="checkbox"
        >
        <label class="form-check-label small" for="f-special">
          Special <span class="badge text-bg-secondary">{{ cluster.special_indices }}</span>
        </label>
      </div>
      <div class="col-lg-3">
        <label class="visually-hidden" for="cluster-node-filter">Filter nodes</label>
        <input
          id="cluster-node-filter"
          v-model="nodeFilter.name"
          class="form-control form-control-sm"
          placeholder="Filter nodes..."
        >
      </div>
    </div>

    <div class="d-flex align-items-center gap-2 mb-2 small">
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        :disabled="!currentPage.previous"
        @click="page -= 1"
      >
        previous
      </button>
      <span>{{ currentPage.first }}-{{ currentPage.last }} of {{ currentPage.total }}
        selected indices</span>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        :disabled="!currentPage.next"
        @click="page += 1"
      >
        next
      </button>
    </div>

    <div class="table-responsive">
      <table class="table table-sm table-bordered align-top">
        <thead>
          <tr>
            <th scope="col" style="min-width: 14rem">
              <div class="d-flex gap-2 align-items-center">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  :title="
                    cluster.disableAllocation === 'true'
                      ? 'enable shard allocation'
                      : 'disable shard allocation'
                  "
                  @click="toggleAllocation(cluster.disableAllocation === 'true')"
                >
                  {{ cluster.disableAllocation === 'true' ? '🔒' : '🔓' }}
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  :title="indexFilter.asc ? 'sort descending' : 'sort ascending'"
                  @click="indexFilter.asc = !indexFilter.asc"
                >
                  {{ indexFilter.asc ? 'A→Z' : 'Z→A' }}
                </button>
                <details class="dropdown">
                  <summary class="btn btn-sm btn-outline-secondary">bulk</summary>
                  <ul
                    class="list-unstyled border rounded bg-body position-absolute p-2 shadow-sm"
                    style="z-index: 5"
                  >
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0"
                        @click="promptClose(selected.join(','), true)"
                      >
                        close selected
                      </button>
                    </li>
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0"
                        @click="promptOpen(selected.join(','), true)"
                      >
                        open selected
                      </button>
                    </li>
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0"
                        @click="promptOptimize(selected.join(','), true)"
                      >
                        optimize selected
                      </button>
                    </li>
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0"
                        @click="promptRefresh(selected.join(','), true)"
                      >
                        refresh selected
                      </button>
                    </li>
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0"
                        @click="promptClearCache(selected.join(','), true)"
                      >
                        clear selected caches
                      </button>
                    </li>
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0 text-danger"
                        @click="promptDelete(selected.join(','), true)"
                      >
                        delete selected
                      </button>
                    </li>
                  </ul>
                </details>
              </div>
            </th>
            <th v-for="(index, i) in currentPage.elements" :key="i" scope="col">
              <template v-if="index">
                <details class="dropdown">
                  <summary :class="{'text-body-secondary': index.closed}">{{ index.name }}</summary>
                  <ul
                    class="list-unstyled border rounded bg-body position-absolute p-2 shadow-sm"
                    style="z-index: 5"
                  >
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0"
                        @click="showIndexInfo(index.name, 'settings')"
                      >
                        show settings
                      </button>
                    </li>
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0"
                        @click="showIndexInfo(index.name, 'mappings')"
                      >
                        show mappings
                      </button>
                    </li>
                    <li v-if="index.open">
                      <button class="btn btn-link btn-sm p-0" @click="promptClose(index.name)">
                        close index
                      </button>
                    </li>
                    <li v-else>
                      <button class="btn btn-link btn-sm p-0" @click="promptOpen(index.name)">
                        open index
                      </button>
                    </li>
                    <li>
                      <button class="btn btn-link btn-sm p-0" @click="promptOptimize(index.name)">
                        optimize index
                      </button>
                    </li>
                    <li>
                      <button class="btn btn-link btn-sm p-0" @click="promptRefresh(index.name)">
                        refresh index
                      </button>
                    </li>
                    <li>
                      <button class="btn btn-link btn-sm p-0" @click="promptClearCache(index.name)">
                        clear cache
                      </button>
                    </li>
                    <li>
                      <RouterLink
                        class="btn btn-link btn-sm p-0"
                        :to="{name: 'indexSettings', query: {index: index.name}}"
                      >
                        edit settings
                      </RouterLink>
                    </li>
                    <li>
                      <button
                        class="btn btn-link btn-sm p-0 text-danger"
                        @click="promptDelete(index.name)"
                      >
                        delete index
                      </button>
                    </li>
                  </ul>
                </details>
                <div class="small text-body-secondary">
                  shards: {{ index.num_of_shards }} * {{ index.num_of_replicas + 1 }} |
                  docs: {{ index.num_docs }} | size: {{ bytes(index.size_in_bytes) }}
                </div>
                <div v-if="index.aliases.length" class="small" :title="index.aliases.join('\n')">
                  🏷 {{ index.aliases[0] }}
                  <span v-if="index.aliases.length > 1">(+{{ index.aliases.length - 1 }})</span>
                </div>
              </template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="moving">
            <td>
              <div v-if="cluster.unassigned_shards">
                ⚠ {{ cluster.unassigned_shards }} unassigned shards
              </div>
              <div v-if="cluster.relocating_shards">
                ↻ {{ cluster.relocating_shards }} relocating shards
              </div>
              <div v-if="cluster.initializing_shards">
                ◌ {{ cluster.initializing_shards }} initializing shards
              </div>
              <button
                type="button"
                class="btn btn-link btn-sm p-0"
                @click="indexFilter.healthy = !indexFilter.healthy"
              >
                <small><em>
                  {{ indexFilter.healthy ? 'show only unhealthy indices' : 'show all indices' }}
                </em></small>
              </button>
            </td>
            <td v-for="(index, i) in currentPage.elements" :key="i">
              <span
                v-for="shard in index ? cluster.getUnassignedShards(index.name) : []"
                :key="shard.id"
                class="shard shard-unallocated"
              >{{ shard.shard }}</span>
            </td>
          </tr>
          <tr v-for="node in nodes" :key="node.id">
            <td>
              <div>
                <span v-if="node.master">{{ node.current_master ? '★' : '☆' }}</span>
                <span v-if="node.data">🗄</span>
                <span v-if="node.client">🔍</span>
                <strong class="ms-1">{{ node.name }}</strong>
              </div>
              <div class="small text-body-secondary">{{ node.transportAddress }}</div>
            </td>
            <td v-for="(index, i) in currentPage.elements" :key="i">
              <button
                v-if="canReceiveShard(index, node.id)"
                type="button"
                class="shard shard-relocation-target btn btn-sm btn-outline-success p-0 px-1"
                @click="promptRelocate(node.id)"
              >
                ✓
              </button>
              <details
                v-for="shard in index ? cluster.getShards(node.id, index.name) : []"
                :key="shard.id"
                class="d-inline-block dropdown"
              >
                <summary :class="shardClass(shard)">{{ shard.shard }}</summary>
                <ul
                  class="list-unstyled border rounded bg-body position-absolute p-2 shadow-sm"
                  style="z-index: 5"
                >
                  <li>
                    <button class="btn btn-link btn-sm p-0" @click="showShardStats(shard)">
                      show shard stats
                    </button>
                  </li>
                  <li v-if="relocating?.id !== shard.id">
                    <button class="btn btn-link btn-sm p-0" @click="relocating = shard">
                      select for relocation
                    </button>
                  </li>
                  <li v-else>
                    <button class="btn btn-link btn-sm p-0" @click="relocating = null">
                      unselect for relocation
                    </button>
                  </li>
                </ul>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.shard {
  display: inline-block;
  min-width: 1.5rem;
  margin: 1px;
  padding: 0 0.25rem;
  text-align: center;
  border-radius: 3px;
  background: var(--bs-secondary-bg);
  cursor: pointer;
}
.shard-primary {
  font-weight: 700;
  border: 1px solid var(--bs-secondary-color);
}
.shard-unallocated {
  background: var(--bs-danger-bg-subtle);
}
.shard-initializing,
.shard-relocating {
  background: var(--bs-warning-bg-subtle);
}
.shard-relocation-source {
  outline: 2px solid var(--bs-primary);
}
details.dropdown > summary {
  list-style: none;
  cursor: pointer;
}
</style>
