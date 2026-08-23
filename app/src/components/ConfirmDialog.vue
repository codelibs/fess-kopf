<script setup lang="ts">
import {watch, useTemplateRef} from 'vue';
import {useDialogs} from '@/composables/useDialogs';

const {confirmRequest, resolveConfirm} = useDialogs();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

watch(confirmRequest, (request) => {
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
    style="max-width: 90vw; width: 34rem"
    @cancel.prevent="resolveConfirm(false)"
  >
    <div v-if="confirmRequest" class="card">
      <div class="card-header">{{ confirmRequest.header }}</div>
      <div class="card-body">
        <p class="mb-0" style="white-space: pre-wrap">{{ confirmRequest.body }}</p>
      </div>
      <div class="card-footer d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-sm btn-secondary" @click="resolveConfirm(false)">
          cancel
        </button>
        <button type="button" class="btn btn-sm btn-danger" @click="resolveConfirm(true)">
          {{ confirmRequest.confirmText }}
        </button>
      </div>
    </div>
  </dialog>
</template>
