<script setup lang="ts">
import {computed, ref, watch} from 'vue';

const model = defineModel<string>({required: true});
const props = defineProps<{id: string; rows?: number}>();

const touched = ref(false);

/** Null when the text parses, otherwise the parser's complaint. */
const error = computed<string | null>(() => {
  if (model.value.trim() === '') {
    return null;
  }
  try {
    JSON.parse(model.value);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
});

defineExpose({error});

watch(model, () => {
  touched.value = true;
});

function format(): void {
  if (error.value !== null || model.value.trim() === '') {
    return;
  }
  model.value = JSON.stringify(JSON.parse(model.value), undefined, 2);
}
</script>

<template>
  <div>
    <textarea
      :id="props.id"
      v-model="model"
      class="form-control form-control-sm font-monospace"
      :class="{'is-invalid': error !== null}"
      :rows="props.rows ?? 4"
      spellcheck="false"
    />
    <div class="d-flex justify-content-between align-items-start">
      <div v-if="error" class="invalid-feedback d-block small">{{ error }}</div>
      <span v-else />
      <button type="button" class="btn btn-link btn-sm p-0" @click="format">format</button>
    </div>
  </div>
</template>
