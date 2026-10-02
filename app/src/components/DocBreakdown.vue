<script setup lang="ts">
import {computed} from 'vue';
import {NCard} from 'naive-ui';
import {t} from '@/i18n';
import type {FieldBreakdown} from '@/model/doc-stats';

/**
 * One field's counts as a ranked list with a bar per value.
 *
 * The bars are plain CSS, like the gauges on the nodes screen: a chart
 * library would buy axes and tooltips this list does not need, at a cost to
 * a `_site` that is kept under a megabyte. Each bar is the value's share of
 * every document in the index, the same number the percentage column shows,
 * so a multi-valued field such as `label` can add up to more than 100%.
 */
const props = defineProps<{
  breakdown: FieldBreakdown;
  /** Every document in the index; the denominator of each share. */
  total: number;
  /** Why this field reads differently from its name, when it does. */
  note?: string;
}>();

const field = computed(() => props.breakdown.state.field);

function share(count: number): number {
  return props.total > 0 ? (count / props.total) * 100 : 0;
}
</script>

<template>
  <NCard size="small" :title="field" :data-field="field">
    <p v-if="note" class="k-small k-muted" style="margin: 0 0 8px">{{ note }}</p>

    <p v-if="breakdown.state.status === 'unmapped'" class="k-empty">
      {{ t('documents.unmapped') }}
    </p>
    <p v-else-if="breakdown.state.status === 'unaggregatable'" class="k-empty">
      {{ t('documents.unaggregatable', {types: breakdown.state.types.join(', ')}) }}
    </p>
    <template v-else>
      <table v-if="breakdown.buckets.length" class="k-table k-doc-buckets">
        <tbody>
          <tr v-for="bucket in breakdown.buckets" :key="bucket.key">
            <td class="k-mono k-small k-doc-key" :title="bucket.key">{{ bucket.key }}</td>
            <td class="k-mono k-doc-count">{{ bucket.count.toLocaleString() }}</td>
            <td class="k-doc-bar-cell">
              <div class="k-doc-bar">
                <span :style="{width: `${Math.min(share(bucket.count), 100)}%`}" />
              </div>
            </td>
            <td class="k-mono k-small k-muted k-doc-share">
              {{ share(bucket.count).toFixed(1) }}%
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="k-empty">{{ t('documents.noValues') }}</p>
      <p v-if="breakdown.other > 0" class="k-small k-muted k-doc-foot">
        {{ t('documents.other', {count: breakdown.other.toLocaleString()}) }}
      </p>
      <p v-if="breakdown.missing > 0" class="k-small k-muted k-doc-foot">
        {{ t('documents.missing', {count: breakdown.missing.toLocaleString()}) }}
      </p>
    </template>
  </NCard>
</template>

<style scoped>
.k-doc-buckets {
  width: 100%;
  table-layout: fixed;
}

/* Twenty rows to a card: the shared table padding is sized for a few. */
.k-doc-buckets td {
  padding: 4px 8px;
  vertical-align: middle;
}

.k-doc-key {
  width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.k-doc-count {
  width: 18%;
  text-align: right;
}

.k-doc-share {
  width: 12%;
  text-align: right;
}

.k-doc-bar {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--k-border);
  overflow: hidden;
}

.k-doc-bar > span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--k-info);
}

.k-doc-foot {
  margin: 6px 0 0;
}
</style>
