<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {
  NButton,
  NCard,
  NCheckbox,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NTag,
} from 'naive-ui';
import {RequestError} from '@/api/client';
import {analyzeText, fetchIndexMetadata} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import {t} from '@/i18n';
import type {AnalysisResult, AnalysisStep} from '@/model/analysis';
import type {IndexMetadata} from '@/model/index-metadata';

const alerts = useAlerts();
const {cluster} = useCluster();

/** How the text should be analysed. These are the _analyze request's own terms. */
const SOURCES = ['field', 'analyzer', 'custom'] as const;
type Source = (typeof SOURCES)[number];

const source = ref<Source>('field');
const index = ref('');
const metadata = ref<IndexMetadata | null>(null);
const type = ref('');
const field = ref('');
const analyzer = ref('');
const charFilters = ref<string[]>([]);
const tokenizer = ref('');
const filters = ref<string[]>([]);
const text = ref('');
const explain = ref(true);
const result = ref<AnalysisResult | null>(null);
const running = ref(false);

const indices = computed(() => cluster.value?.open_indices() ?? []);

/** Naive UI takes {label, value} pairs; these lists are all plain strings. */
function asOptions(values: readonly string[]): {label: string; value: string}[] {
  return values.map((value) => ({label: value, value}));
}

const indexOptions = computed(() => asOptions(indices.value.map((i) => i.name)));
const typeOptions = computed(() => asOptions(metadata.value?.getTypes() ?? []));
const fieldOptions = computed(() =>
  asOptions(type.value === '' ? [] : (metadata.value?.getFields(type.value) ?? [])),
);
const analyzerOptions = computed(() => asOptions(metadata.value?.getAnalyzers() ?? []));
const tokenizerOptions = computed(() => asOptions(metadata.value?.getTokenizers() ?? []));
const filterOptions = computed(() => asOptions(metadata.value?.getFilters() ?? []));
const charFilterOptions = computed(() => asOptions(metadata.value?.getCharFilters() ?? []));

/** Naming a field or an index's analyzer needs an index; a chain does not. */
const indexRequired = computed(() => source.value !== 'custom');

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

watch(index, async (name) => {
  type.value = '';
  field.value = '';
  analyzer.value = '';
  metadata.value = null;
  if (name === '') {
    return;
  }
  try {
    metadata.value = await fetchIndexMetadata(name);
    // A typeless index has exactly one mapping type, `_doc`, and every
    // OpenSearch index is typeless. Making the user pick it before the field
    // list appears is a step that has had one possible answer for years.
    const types = metadata.value.getTypes();
    if (types.length === 1) {
      type.value = types[0];
    }
  } catch (error) {
    index.value = '';
    alerts.error(t('analysis.typesFailed'), describe(error));
  }
});

function ready(): boolean {
  if (text.value === '') {
    return false;
  }
  if (indexRequired.value && index.value === '') {
    return false;
  }
  if (source.value === 'field') {
    return field.value !== '';
  }
  if (source.value === 'analyzer') {
    return analyzer.value !== '';
  }
  return tokenizer.value !== '';
}

async function run(): Promise<void> {
  if (!ready()) {
    return;
  }
  running.value = true;
  try {
    result.value = await analyzeText({
      index: index.value,
      field: source.value === 'field' ? field.value : undefined,
      analyzer: source.value === 'analyzer' ? analyzer.value : undefined,
      tokenizer: source.value === 'custom' ? tokenizer.value : undefined,
      charFilters: source.value === 'custom' ? charFilters.value : undefined,
      filters: source.value === 'custom' ? filters.value : undefined,
      text: text.value,
      explain: explain.value,
    });
  } catch (error) {
    result.value = null;
    alerts.error(t('analysis.failed'), describe(error));
  } finally {
    running.value = false;
  }
}

/** `+2` / `−3`, or nothing at all when a stage changed no token count. */
function delta(step: AnalysisStep): string {
  if (step.kind !== 'filter' || step.delta === 0) {
    return '';
  }
  return step.delta > 0 ? `+${step.delta}` : `−${-step.delta}`;
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">{{ t('analysis.title') }}</h1>
      <p class="k-page-sub">{{ t('analysis.sub') }}</p>
    </div>
  </div>

  <div class="k-split k-split-even">
    <NCard :title="t('analysis.input')">
      <form class="k-stack" @submit.prevent="run">
        <div>
          <!-- Three mutually exclusive choices, all short: a segmented
               control shows them at once where a dropdown hides two. -->
          <span id="an-source-label" class="k-label">source</span>
          <NRadioGroup
            id="an-source"
            v-model:value="source"
            aria-labelledby="an-source-label"
            size="small"
          >
            <NRadioButton v-for="name in SOURCES" :key="name" :value="name">
              {{ name }}
            </NRadioButton>
          </NRadioGroup>
        </div>
        <div>
          <span id="an-index-label" class="k-label">index</span>
          <NSelect
            id="an-index"
            v-model:value="index"
            aria-labelledby="an-index-label"
            :options="indexOptions"
            :placeholder="t('analysis.selectIndex')"
            clearable
            filterable
          />
          <!-- Without an index the request goes to the cluster-wide
               /_analyze, which knows the built-ins and nothing more. -->
          <p v-if="!indexRequired && index === ''" class="k-small k-muted">
            {{ t('analysis.builtInsOnly') }}
          </p>
        </div>

        <template v-if="source === 'field'">
          <div v-if="typeOptions.length > 1">
            <span id="an-type-label" class="k-label">type</span>
            <NSelect
              id="an-type"
              v-model:value="type"
              aria-labelledby="an-type-label"
              :options="typeOptions"
              :placeholder="t('analysis.selectType')"
            />
          </div>
          <div>
            <span id="an-field-label" class="k-label">field</span>
            <NSelect
              id="an-field"
              v-model:value="field"
              aria-labelledby="an-field-label"
              :options="fieldOptions"
              :placeholder="t('analysis.selectField')"
              filterable
            />
          </div>
        </template>

        <div v-else-if="source === 'analyzer'">
          <span id="an-analyzer-label" class="k-label">analyzer</span>
          <NSelect
            id="an-analyzer"
            v-model:value="analyzer"
            aria-labelledby="an-analyzer-label"
            :options="analyzerOptions"
            :placeholder="t('analysis.selectAnalyzer')"
            filterable
            tag
          />
        </div>

        <template v-else>
          <!-- Every one of these accepts a name the index does not define,
               because the built-ins are not in an index's settings and the
               point of composing a chain is to try one that is not there
               yet. -->
          <div>
            <span id="an-char-filters-label" class="k-label">char_filter</span>
            <NSelect
              id="an-char-filters"
              v-model:value="charFilters"
              aria-labelledby="an-char-filters-label"
              :options="charFilterOptions"
              :placeholder="t('analysis.selectCharFilters')"
              multiple
              filterable
              tag
            />
          </div>
          <div>
            <span id="an-tokenizer-label" class="k-label">tokenizer</span>
            <NSelect
              id="an-tokenizer"
              v-model:value="tokenizer"
              aria-labelledby="an-tokenizer-label"
              :options="tokenizerOptions"
              :placeholder="t('analysis.selectTokenizer')"
              filterable
              tag
            />
          </div>
          <div>
            <span id="an-filters-label" class="k-label">filter</span>
            <NSelect
              id="an-filters"
              v-model:value="filters"
              aria-labelledby="an-filters-label"
              :options="filterOptions"
              :placeholder="t('analysis.selectFilters')"
              multiple
              filterable
              tag
            />
          </div>
        </template>

        <div>
          <label class="k-label" for="an-text">text</label>
          <NInput
            v-model:value="text"
            type="textarea"
            :rows="3"
            :input-props="{id: 'an-text'}"
          />
        </div>
        <div class="k-row">
          <NButton attr-type="submit" type="primary" :loading="running" :disabled="!ready()">
            {{ t('analysis.analyze') }}
          </NButton>
          <NCheckbox id="an-explain" v-model:checked="explain">
            {{ t('analysis.explain') }}
          </NCheckbox>
        </div>
      </form>
    </NCard>

    <NCard :title="t('analysis.result')">
      <p v-if="result === null" class="k-empty">{{ t('analysis.nothingYet') }}</p>
      <template v-else>
        <div class="k-row k-wrap">
          <NTag
            v-for="(token, i) in result.tokens"
            :key="i"
            size="small"
            :bordered="false"
            :title="
              `${token.type} · position ${token.position} · ` +
                `${token.startOffset}-${token.endOffset}`
            "
          >
            {{ token.token }}
          </NTag>
          <span v-if="result.tokens.length === 0" class="k-muted k-small">
            {{ t('analysis.noTokens') }}
          </span>
        </div>

        <div v-if="result.tokens.length" class="k-scroll-x" style="margin-top: 14px">
          <table class="k-matrix">
            <thead>
              <tr>
                <th scope="col">token</th>
                <th scope="col">type</th>
                <th scope="col">position</th>
                <th scope="col">offsets</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(token, i) in result.tokens" :key="i">
                <td class="k-mono">{{ token.token }}</td>
                <td class="k-mono k-small">{{ token.type }}</td>
                <td class="k-mono">{{ token.position }}</td>
                <td class="k-mono k-small">{{ token.startOffset }}–{{ token.endOffset }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- The chain, stage by stage. The stage carrying a delta is the one
             that dropped or added tokens, which is the question this screen
             exists to answer. -->
        <div v-if="result.explained" class="k-pipeline">
          <h3 class="k-label" style="margin-top: 18px">{{ t('analysis.pipeline') }}</h3>
          <ol class="k-steps">
            <li v-for="(step, i) in result.steps" :key="i">
              <div class="k-row k-wrap">
                <NTag
                  size="tiny"
                  :bordered="false"
                  :type="step.kind === 'tokenizer' ? 'info' : 'default'"
                >
                  {{ step.kind }}
                </NTag>
                <span class="k-strong k-mono k-small">{{ step.name }}</span>
                <NTag
                  v-if="delta(step)"
                  size="tiny"
                  :bordered="false"
                  :type="step.delta < 0 ? 'warning' : 'success'"
                >
                  {{ delta(step) }}
                </NTag>
              </div>
              <p v-if="step.kind === 'char_filter'" class="k-mono k-small k-filtered">
                {{ step.text }}
              </p>
              <div v-else class="k-row k-wrap k-small">
                <NTag
                  v-for="(token, j) in step.tokens"
                  :key="j"
                  size="tiny"
                  :bordered="false"
                  :title="`${token.type} · position ${token.position}`"
                >
                  {{ token.token }}
                </NTag>
                <span v-if="step.tokens.length === 0" class="k-muted">
                  {{ t('analysis.noTokens') }}
                </span>
              </div>
            </li>
          </ol>
        </div>
      </template>
    </NCard>
  </div>
</template>

<style scoped>
.k-steps {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.k-steps > li {
  padding: 8px 0 8px 10px;
  border-left: 2px solid var(--k-border);
}

.k-filtered {
  margin: 6px 0 0;
  word-break: break-all;
}
</style>
