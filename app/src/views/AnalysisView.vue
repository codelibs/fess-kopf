<script setup lang="ts">
import {computed, ref, watch} from 'vue';
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
  <div class="row g-3">
    <div class="col-lg-6">
      <div class="card h-100">
        <div class="card-header">analysis by field type</div>
        <div class="card-body">
          <form @submit.prevent="runFieldAnalysis">
            <div class="mb-2">
              <label class="form-label small mb-0" for="an-field-index">index</label>
              <select id="an-field-index" v-model="fieldIndex" class="form-select form-select-sm">
                <option value="">select index</option>
                <option v-for="index in indices" :key="index.name" :value="index.name">
                  {{ index.name }}
                </option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="an-field-type">type</label>
              <select id="an-field-type" v-model="fieldType" class="form-select form-select-sm">
                <option value="">select type</option>
                <option v-for="type in fieldMetadata?.getTypes() ?? []" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="an-field-field">field</label>
              <select id="an-field-field" v-model="fieldField" class="form-select form-select-sm">
                <option value="">select field</option>
                <option v-for="field in fields" :key="field" :value="field">{{ field }}</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="an-field-text">text</label>
              <textarea
                id="an-field-text"
                v-model="fieldText"
                class="form-control form-control-sm"
                rows="2"
              />
            </div>
            <button type="submit" class="btn btn-sm btn-primary">analyze</button>
          </form>
          <div v-if="fieldTokens" class="mt-3 d-flex flex-wrap gap-1">
            <span v-for="(token, i) in fieldTokens" :key="i" class="badge text-bg-secondary">
              {{ token.token }}
            </span>
            <span v-if="fieldTokens.length === 0" class="text-body-secondary small">no tokens</span>
          </div>
        </div>
      </div>
    </div>

    <div class="col-lg-6">
      <div class="card h-100">
        <div class="card-header">analysis by analyzer</div>
        <div class="card-body">
          <form @submit.prevent="runAnalyzerAnalysis">
            <div class="mb-2">
              <label class="form-label small mb-0" for="an-an-index">index</label>
              <select id="an-an-index" v-model="analyzerIndex" class="form-select form-select-sm">
                <option value="">select index</option>
                <option v-for="index in indices" :key="index.name" :value="index.name">
                  {{ index.name }}
                </option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="an-an-analyzer">analyzer</label>
              <select
                id="an-an-analyzer"
                v-model="analyzerName"
                class="form-select form-select-sm"
              >
                <option value="">select analyzer</option>
                <option
                  v-for="name in analyzerMetadata?.getAnalyzers() ?? []"
                  :key="name"
                  :value="name"
                >
                  {{ name }}
                </option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small mb-0" for="an-an-text">text</label>
              <textarea
                id="an-an-text"
                v-model="analyzerText"
                class="form-control form-control-sm"
                rows="2"
              />
            </div>
            <button type="submit" class="btn btn-sm btn-primary">analyze</button>
          </form>
          <div v-if="analyzerTokens" class="mt-3 d-flex flex-wrap gap-1">
            <span v-for="(token, i) in analyzerTokens" :key="i" class="badge text-bg-secondary">
              {{ token.token }}
            </span>
            <span v-if="analyzerTokens.length === 0" class="text-body-secondary small">
              no tokens
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
