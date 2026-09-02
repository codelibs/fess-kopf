<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted} from 'vue';
import {RouterView} from 'vue-router';
import {NConfigProvider} from 'naive-ui';
import AlertList from '@/components/AlertList.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import InfoDialog from '@/components/InfoDialog.vue';
import ClusterStats from '@/components/ClusterStats.vue';
import AppHeader from '@/components/AppHeader.vue';
import {startPolling, stopPolling} from '@/composables/useCluster';
import {probeCapabilities} from '@/composables/useCapabilities';
import {getSettings} from '@/api/settings';
import {locale} from '@/i18n';
import {NAIVE_LOCALES} from '@/i18n/naive';
import {baseTheme, DARK, LIGHT, themeOverrides} from '@/theme';

const dark = computed(() => getSettings().theme === 'dark');
const theme = computed(() => baseTheme(dark.value));
const overrides = computed(() => themeOverrides(dark.value ? DARK : LIGHT));
const naiveLocale = computed(() => NAIVE_LOCALES[locale.value]);

onMounted(() => {
  startPolling();
  // Once, beside the first poll rather than inside it: what a cluster can do
  // changes when a node restarts, not every refresh_rate.
  void probeCapabilities();
});
onBeforeUnmount(stopPolling);
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="overrides" :locale="naiveLocale">
    <AppHeader />
    <ClusterStats />
    <AlertList />
    <main class="k-page">
      <RouterView />
    </main>
    <ConfirmDialog />
    <InfoDialog />
  </NConfigProvider>
</template>
