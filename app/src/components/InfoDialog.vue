<script setup lang="ts">
import {watch, useTemplateRef} from 'vue';
import {useDialogs} from '@/composables/useDialogs';

const {infoRequest, closeInfo} = useDialogs();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

watch(infoRequest, (request) => {
  if (request === null) {
    dialog.value?.close();
  } else if (!dialog.value?.open) {
    dialog.value?.showModal();
  }
});
</script>

<template>
  <dialog
    ref="dialog"
    class="p-0 border-0 rounded"
    style="max-width: 90vw; width: 60rem"
    @cancel.prevent="closeInfo()"
  >
    <div v-if="infoRequest" class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>{{ infoRequest.title }}</span>
        <button type="button" class="btn-close" aria-label="Close" @click="closeInfo()" />
      </div>
      <div class="card-body">
        <pre class="small mb-0">{{ JSON.stringify(infoRequest.content, undefined, 2) }}</pre>
      </div>
    </div>
  </dialog>
</template>
