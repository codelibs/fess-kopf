<script setup lang="ts">
import {watch, useTemplateRef} from 'vue';
import {NButton} from 'naive-ui';
import {useDialogs} from '@/composables/useDialogs';
import {t} from '@/i18n';

// Native <dialog> for the same reason as ConfirmDialog: no teleport.
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
  <dialog ref="dialog" class="k-dialog" @cancel.prevent="closeInfo()">
    <div v-if="infoRequest" class="k-dialog-body" style="width: 58rem">
      <div class="k-row">
        <h2 class="k-dialog-title k-grow">{{ infoRequest.title }}</h2>
        <NButton
          size="tiny"
          quaternary
          :aria-label="t('dialog.close')"
          @click="closeInfo()"
        >
          ✕
        </NButton>
      </div>
      <pre class="k-pre" style="max-height: 60vh">{{
        JSON.stringify(infoRequest.content, undefined, 2)
      }}</pre>
    </div>
  </dialog>
</template>
