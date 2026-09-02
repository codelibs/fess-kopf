<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';
import {RouterLink} from 'vue-router';
import {NButton, NCard, NCheckbox, NInput, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {
  clearIndexCache,
  closeIndex,
  deleteIndex,
  explainAllocation,
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
import {useDetailsMenu} from '@/composables/useDetailsMenu';
import {confirm, showInfo} from '@/composables/useDialogs';
import {t} from '@/i18n';
import {bytes} from '@/model/format';
import {fessIndexInfo} from '@/model/fess-index';
import {IndexFilter} from '@/model/index-filter';
import {NodeFilter} from '@/model/node-filter';
import type {Index} from '@/model/opensearch-index';
import {Paginator} from '@/model/paginator';
import type {Shard} from '@/model/shard';

const alerts = useAlerts();
const {cluster} = useCluster();
const {onToggle} = useDetailsMenu();

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

/**
 * Asks the cluster why a shard has nowhere to go.
 *
 * Until now the screen could say a cluster was red but not why, which left
 * the REST client as the only way to find out. A green cluster answers the
 * explain API with a 400, so "nothing to explain" is a result, not a
 * failure.
 */
async function explainUnassigned(): Promise<void> {
  try {
    const explanation = await explainAllocation();
    if (explanation === null) {
      alerts.info(t('cluster.allocationHealthy'));
      return;
    }
    showInfo(
      t('cluster.allocationTitle', {index: explanation.index, shard: explanation.shard}),
      explanation,
    );
  } catch (error) {
    alerts.error(
      t('cluster.allocationFailed'),
      error instanceof RequestError ? error.body : String(error),
    );
  }
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

const NAMES = (indices: string[]): string =>
  `\n\n${t('cluster.selectedIndices')}\n${indices.join('\n')}`;

async function promptDelete(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? t('cluster.confirm.deleteBulk')
      : t('cluster.confirm.deleteOne', {index}),
    t('cluster.confirm.deleteBody') + (bulk ? NAMES(selected.value) : ''),
    t('cluster.confirm.deleteAction'),
  );
  if (ok) {
    await run(
      () => deleteIndex(index),
      t('cluster.deleted'),
      t('cluster.deleteFailed'),
      true,
    );
  }
}

async function promptOptimize(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? t('cluster.confirm.optimizeBulk')
      : t('cluster.confirm.optimizeOne', {index}),
    t('cluster.confirm.optimizeBody') + (bulk ? NAMES(selected.value) : ''),
    t('cluster.confirm.optimizeAction'),
  );
  if (ok) {
    await run(
      () => optimizeIndex(index),
      t('cluster.optimized'),
      t('cluster.optimizeFailed'),
    );
  }
}

async function promptRefresh(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? t('cluster.confirm.refreshBulk')
      : t('cluster.confirm.refreshOne', {index}),
    t('cluster.confirm.refreshBody') + (bulk ? NAMES(selected.value) : ''),
    t('cluster.confirm.refreshAction'),
  );
  if (ok) {
    await run(
      () => refreshIndex(index),
      t('cluster.refreshed'),
      t('cluster.refreshFailed'),
    );
  }
}

async function promptClearCache(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? t('cluster.confirm.clearCacheBulk')
      : t('cluster.confirm.clearCacheOne', {index}),
    t('cluster.confirm.clearCacheBody') + (bulk ? NAMES(selected.value) : ''),
    t('cluster.confirm.clearCacheAction'),
  );
  if (ok) {
    await run(
      () => clearIndexCache(index),
      t('cluster.cacheCleared'),
      t('cluster.clearCacheFailed'),
      true,
    );
  }
}

async function promptClose(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? t('cluster.confirm.closeBulk')
      : t('cluster.confirm.closeOne', {index}),
    t('cluster.confirm.closeBody') + (bulk ? NAMES(selected.value) : ''),
    t('cluster.confirm.closeAction'),
  );
  if (ok) {
    await run(
      () => closeIndex(index),
      t('cluster.closed'),
      t('cluster.closeFailed'),
      true,
    );
  }
}

async function promptOpen(index: string, bulk = false): Promise<void> {
  const ok = await ask(
    bulk
      ? t('cluster.confirm.openBulk')
      : t('cluster.confirm.openOne', {index}),
    t('cluster.confirm.openBody') + (bulk ? NAMES(selected.value) : ''),
    t('cluster.confirm.openAction'),
  );
  if (ok) {
    await run(
      () => openIndex(index),
      t('cluster.opened'),
      t('cluster.openFailed'),
      true,
    );
  }
}

async function toggleAllocation(enable: boolean): Promise<void> {
  await run(
    () => setShardAllocation(enable),
    enable ? t('cluster.allocationEnabled') : t('cluster.allocationDisabled'),
    enable ? t('cluster.enableAllocationFailed') : t('cluster.disableAllocationFailed'),
    true,
  );
}

async function showIndexInfo(index: string, what: 'settings' | 'mappings'): Promise<void> {
  try {
    const metadata = await fetchIndexMetadata(index);
    showInfo(
      what === 'settings'
        ? t('cluster.settingsTitle', {index})
        : t('cluster.mappingsTitle', {index}),
      what === 'settings' ? metadata.settings : metadata.mappings,
    );
  } catch (error) {
    alerts.error(
      what === 'settings' ? t('cluster.settingsFailed') : t('cluster.mappingsFailed'),
      describe(error),
    );
  }
}

async function showShardStats(shard: Shard): Promise<void> {
  try {
    const stats = await fetchShardStats(shard.shard, shard.index, shard.node ?? '');
    showInfo(t('cluster.shardStatsTitle', {shard: shard.shard}), stats.stats);
  } catch (error) {
    alerts.error(t('cluster.shardStatsFailed'), describe(error));
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
    t('cluster.confirm.relocate'),
    t('cluster.confirm.relocateBody'),
    t('cluster.confirm.relocateAction'),
  );
  if (!ok) {
    return;
  }
  try {
    const response = await relocateShard(shard.shard, shard.index, shard.node ?? '', toNode);
    alerts.success(t('cluster.relocated'), response);
    await refreshCluster();
  } catch (error) {
    alerts.error(t('cluster.relocateFailed'), describe(error));
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
        <h1 class="k-page-title">{{ t('cluster.title') }}</h1>
        <p class="k-page-sub">
          {{ t('cluster.sub', {first: currentPage.first, last: currentPage.last,
                               total: currentPage.total, nodes: nodes.length}) }}
        </p>
      </div>
      <div class="k-row">
        <NButton size="small" :disabled="!currentPage.previous" @click="page -= 1">
          {{ t('common.previous') }}
        </NButton>
        <NButton size="small" :disabled="!currentPage.next" @click="page += 1">
          {{ t('common.next') }}
        </NButton>
      </div>
    </div>

    <NCard>
      <div class="k-row k-wrap k-gap-lg">
        <NInput
          v-model:value="indexFilter.name"
          :placeholder="t('cluster.filterIndices')"
          clearable
          :aria-label="t('cluster.filterIndices')"
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
        <NCheckbox id="f-fess" v-model:checked="indexFilter.fessOnly"> Fess </NCheckbox>
        <NInput
          v-model:value="nodeFilter.name"
          :placeholder="t('cluster.filterNodes')"
          clearable
          :aria-label="t('cluster.filterNodes')"
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
                        ? t('cluster.enableAllocation')
                        : t('cluster.disableAllocation')
                    "
                    @click="toggleAllocation(cluster.disableAllocation === 'true')"
                  >
                    {{ cluster.disableAllocation === 'true' ? '🔒' : '🔓' }}
                  </NButton>
                  <NButton
                    size="tiny"
                    :title="
                      indexFilter.asc
                        ? t('cluster.sortDescending')
                        : t('cluster.sortAscending')
                    "
                    @click="indexFilter.asc = !indexFilter.asc"
                  >
                    {{ indexFilter.asc ? 'A→Z' : 'Z→A' }}
                  </NButton>
                  <details class="k-menu k-menu-button" @toggle="onToggle">
                    <summary>{{ t('cluster.bulk') }}</summary>
                    <ul class="k-menu-items">
                      <li>
                        <NButton text size="tiny" @click="promptClose(selected.join(','), true)">
                          {{ t('cluster.closeSelected') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptOpen(selected.join(','), true)">
                          {{ t('cluster.openSelected') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptOptimize(selected.join(','), true)">
                          {{ t('cluster.optimizeSelected') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptRefresh(selected.join(','), true)">
                          {{ t('cluster.refreshSelected') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton
                          text
                          size="tiny"
                          @click="promptClearCache(selected.join(','), true)"
                        >
                          {{ t('cluster.clearSelectedCaches') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton
                          text
                          size="tiny"
                          type="error"
                          @click="promptDelete(selected.join(','), true)"
                        >
                          {{ t('cluster.deleteSelected') }}
                        </NButton>
                      </li>
                    </ul>
                  </details>
                </div>
              </th>
              <th v-for="(index, i) in currentPage.elements" :key="i" scope="col">
                <template v-if="index">
                  <details
                    class="k-menu k-index-name"
                    :class="{'k-index-closed': index.closed}"
                    @toggle="onToggle"
                  >
                    <summary>{{ index.name }}</summary>
                    <ul class="k-menu-items">
                      <li>
                        <NButton text size="tiny" @click="showIndexInfo(index.name, 'settings')">
                          {{ t('cluster.showSettings') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="showIndexInfo(index.name, 'mappings')">
                          {{ t('cluster.showMappings') }}
                        </NButton>
                      </li>
                      <li v-if="index.open">
                        <NButton text size="tiny" @click="promptClose(index.name)">
                          {{ t('cluster.closeIndex') }}
                        </NButton>
                      </li>
                      <li v-else>
                        <NButton text size="tiny" @click="promptOpen(index.name)">
                          {{ t('cluster.openIndex') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptOptimize(index.name)">
                          {{ t('cluster.optimizeIndex') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptRefresh(index.name)">
                          {{ t('cluster.refreshIndex') }}
                        </NButton>
                      </li>
                      <li>
                        <NButton text size="tiny" @click="promptClearCache(index.name)">
                          {{ t('cluster.clearCache') }}
                        </NButton>
                      </li>
                      <li>
                        <RouterLink
                          class="k-menu-link"
                          :to="{name: 'indexSettings', query: {index: index.name}}"
                        >
                          {{ t('cluster.editSettings') }}
                        </RouterLink>
                      </li>
                      <li>
                        <NButton text size="tiny" type="error" @click="promptDelete(index.name)">
                          {{ t('cluster.deleteIndex') }}
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
                  <!-- What this index is to Fess. The role and the two alias
                       names are Fess's own vocabulary, like a node role or a
                       cluster status, so they are not translated. -->
                  <div
                    v-if="fessIndexInfo(index).role !== 'other'"
                    class="k-row k-small k-fess-roles"
                  >
                    <NTag size="tiny" :bordered="false">
                      {{ fessIndexInfo(index).role }}
                    </NTag>
                    <NTag
                      v-for="alias in fessIndexInfo(index).documentAliases"
                      :key="alias"
                      size="tiny"
                      :bordered="false"
                      :type="alias === 'search' ? 'success' : 'info'"
                      :title="`fess.${alias}`"
                    >
                      {{ alias }}
                    </NTag>
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
                  v-if="cluster.unassigned_shards"
                  id="explain-allocation"
                  text size="tiny" type="primary"
                  style="display: block"
                  @click="explainUnassigned()"
                >
                  {{ t('cluster.explainAllocation') }}
                </NButton>
                <NButton
                  text size="tiny" type="primary"
                  @click="indexFilter.healthy = !indexFilter.healthy"
                >
                  {{ indexFilter.healthy
                    ? t('cluster.showOnlyUnhealthy')
                    : t('cluster.showAll') }}
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
                    :title="t('cluster.moveShardHere')"
                    @click="promptRelocate(node.id)"
                  >
                    ✓
                  </button>
                  <details
                    v-for="shard in index ? cluster.getShards(node.id, index.name) : []"
                    :key="shard.id"
                    class="k-menu"
                    @toggle="onToggle"
                  >
                    <summary :class="shardClass(shard)">{{ shard.shard }}</summary>
                    <ul class="k-menu-items">
                      <li>
                        <NButton text size="tiny" @click="showShardStats(shard)">
                          {{ t('cluster.showShardStats') }}
                        </NButton>
                      </li>
                      <li v-if="relocating?.id !== shard.id">
                        <NButton text size="tiny" @click="relocating = shard">
                          {{ t('cluster.selectForRelocation') }}
                        </NButton>
                      </li>
                      <li v-else>
                        <NButton text size="tiny" @click="relocating = null">
                          {{ t('cluster.unselectForRelocation') }}
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
.k-fess-roles {
  gap: 4px;
  margin-top: 4px;
  font-weight: 400;
}

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
