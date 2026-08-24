<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {NButton, NCard, NInput, NSelect, NTag} from 'naive-ui';
import {RequestError} from '@/api/client';
import {analyzeByAnalyzer, analyzeByField, fetchIndexMetadata} from '@/api/opensearch';
import {useAlerts} from '@/composables/useAlerts';
import {useCluster} from '@/composables/useCluster';
import type {IndexMetadata, Token} from '@/model/index-metadata';

const alerts = useAlerts();
const {cluster} = useCluster();

const indices = computed(() => cluster.value?.open_indices() ?? []);

// Analyse by field.
const fieldIndex = ref('');
const fieldMetadata = ref<IndexMetadata | null>(null);
const fieldType = ref('');
const fieldField = ref('');
const fieldText = ref('');
const fieldTokens = ref<Token[] | null>(null);

// Analyse by analyzer.
const analyzerIndex = ref('');
const analyzerMetadata = ref<IndexMetadata | null>(null);
const analyzerName = ref('');
const analyzerText = ref('');
const analyzerTokens = ref<Token[] | null>(null);

const fields = computed(() =>
  fieldType.value === '' ? [] : (fieldMetadata.value?.getFields(fieldType.value) ?? []),
);

/** Naive UI takes {label, value} pairs; these lists are all plain strings. */
function asOptions(values: readonly string[]): {label: string; value: string}[] {
  return values.map((value) => ({label: value, value}));
}

const indexOptions = computed(() => asOptions(indices.value.map((index) => index.name)));
const typeOptions = computed(() => asOptions(fieldMetadata.value?.getTypes() ?? []));
const fieldOptions = computed(() => asOptions(fields.value));
const analyzerOptions = computed(() => asOptions(analyzerMetadata.value?.getAnalyzers() ?? []));

watch(fieldIndex, async (index) => {
  fieldType.value = '';
  fieldField.value = '';
  fieldMetadata.value = null;
  if (index === '') {
    return;
  }
  try {
    fieldMetadata.value = await fetchIndexMetadata(index);
  } catch (error) {
    fieldIndex.value = '';
    alerts.error('Error loading index types', describe(error));
  }
});

watch(analyzerIndex, async (index) => {
  analyzerName.value = '';
  analyzerMetadata.value = null;
  if (index === '') {
    return;
  }
  try {
    analyzerMetadata.value = await fetchIndexMetadata(index);
  } catch (error) {
    analyzerIndex.value = '';
    alerts.error('Error loading index analyzers', describe(error));
  }
});

function describe(error: unknown): unknown {
  return error instanceof RequestError ? error.body : String(error);
}

async function runFieldAnalysis(): Promise<void> {
  if (fieldField.value === '' || fieldText.value === '') {
    return;
  }
  fieldTokens.value = null;
  try {
    fieldTokens.value = await analyzeByField(fieldIndex.value, fieldField.value, fieldText.value);
  } catch (error) {
    fieldTokens.value = null;
    alerts.error('Error analyzing text by field', describe(error));
  }
}

async function runAnalyzerAnalysis(): Promise<void> {
  if (analyzerName.value === '' || analyzerText.value === '') {
    return;
  }
  analyzerTokens.value = null;
  try {
    analyzerTokens.value = await analyzeByAnalyzer(
      analyzerIndex.value,
      analyzerName.value,
      analyzerText.value,
    );
  } catch (error) {
    analyzerTokens.value = null;
    alerts.error('Error analyzing text by analyzer', describe(error));
  }
}
</script>

<template>
  <div class="k-page-head">
    <div>
      <h1 class="k-page-title">Analysis</h1>
      <p class="k-page-sub">See how text is tokenised before it reaches the index.</p>
    </div>
  </div>

  <div class="k-split k-split-even">
    <NCard title="analysis by field type">
      <form class="k-stack" @submit.prevent="runFieldAnalysis">
        <div>
          <span id="an-field-index-label" class="k-label">index</span>
          <NSelect
            id="an-field-index"
            v-model:value="fieldIndex"
            aria-labelledby="an-field-index-label"
            :options="indexOptions"
            placeholder="select index"
            filterable
          />
        </div>
        <div>
          <span id="an-field-type-label" class="k-label">type</span>
          <NSelect
            id="an-field-type"
            v-model:value="fieldType"
            aria-labelledby="an-field-type-label"
            :options="typeOptions"
            placeholder="select type"
          />
        </div>
        <div>
          <span id="an-field-field-label" class="k-label">field</span>
          <NSelect
            id="an-field-field"
            v-model:value="fieldField"
            aria-labelledby="an-field-field-label"
            :options="fieldOptions"
            placeholder="select field"
            filterable
          />
        </div>
        <div>
          <label class="k-label" for="an-field-text">text</label>
          <NInput
            v-model:value="fieldText"
            type="textarea"
            :rows="2"
            :input-props="{id: 'an-field-text'}"
          />
        </div>
        <div>
          <NButton attr-type="submit" type="primary">analyze</NButton>
        </div>
      </form>
      <div v-if="fieldTokens" class="k-row k-wrap" style="margin-top: 14px">
        <NTag v-for="(token, i) in fieldTokens" :key="i" size="small" :bordered="false">
          {{ token.token }}
        </NTag>
        <span v-if="fieldTokens.length === 0" class="k-muted k-small">no tokens</span>
      </div>
    </NCard>

    <NCard title="analysis by analyzer">
      <form class="k-stack" @submit.prevent="runAnalyzerAnalysis">
        <div>
          <span id="an-an-index-label" class="k-label">index</span>
          <NSelect
            id="an-an-index"
            v-model:value="analyzerIndex"
            aria-labelledby="an-an-index-label"
            :options="indexOptions"
            placeholder="select index"
            filterable
          />
        </div>
        <div>
          <span id="an-an-analyzer-label" class="k-label">analyzer</span>
          <NSelect
            id="an-an-analyzer"
            v-model:value="analyzerName"
            aria-labelledby="an-an-analyzer-label"
            :options="analyzerOptions"
            placeholder="select analyzer"
            filterable
          />
        </div>
        <div>
          <label class="k-label" for="an-an-text">text</label>
          <NInput
            v-model:value="analyzerText"
            type="textarea"
            :rows="2"
            :input-props="{id: 'an-an-text'}"
          />
        </div>
        <div>
          <NButton attr-type="submit" type="primary">analyze</NButton>
        </div>
      </form>
      <div v-if="analyzerTokens" class="k-row k-wrap" style="margin-top: 14px">
        <NTag v-for="(token, i) in analyzerTokens" :key="i" size="small" :bordered="false">
          {{ token.token }}
        </NTag>
        <span v-if="analyzerTokens.length === 0" class="k-muted k-small">no tokens</span>
      </div>
    </NCard>
  </div>
</template>
