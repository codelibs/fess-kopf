<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {NButton, NInput} from 'naive-ui';

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
    <!-- The id goes on the textarea itself, not on NInput's wrapper: callers
         label it, and the tests drive it. -->
    <NInput
      v-model:value="model"
      type="textarea"
      :status="error === null ? undefined : 'error'"
      :rows="props.rows ?? 4"
      :input-props="{id: props.id, spellcheck: 'false'}"
      :style="{fontFamily: 'var(--k-mono)'}"
    />
    <div class="k-row k-row-top" style="margin-top: 4px">
      <span v-if="error" class="k-small k-grow" style="color: var(--k-error)">{{ error }}</span>
      <span v-else class="k-grow" />
      <NButton text size="tiny" type="primary" @click="format">format</NButton>
    </div>
  </div>
</template>
