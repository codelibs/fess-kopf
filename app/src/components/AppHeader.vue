<script setup lang="ts">
import {computed} from 'vue';
import {RouterLink} from 'vue-router';
import {NTag} from 'naive-ui';
import {NAV_ROUTES, ROUTE_LABELS, ROUTE_PLUGINS} from '@/router';
import {hasPlugin} from '@/composables/useCapabilities';
import {useCluster} from '@/composables/useCluster';
import {t} from '@/i18n';

// No product name in the bar: kopf only ever renders inside the Fess admin
// dashboard, which already says whose page this is. The row is for navigation
// and for which cluster you are pointed at.
const {clusterName, connected} = useCluster();

// A plugin-backed screen is offered only when the cluster has the plugin.
// Before the probe answers, and if it is denied, none of them are: an
// absent link is better than one that can only 404.
const routes = computed(() =>
  NAV_ROUTES.filter((name) => {
    const plugin = ROUTE_PLUGINS[name];
    return plugin === undefined || hasPlugin(plugin);
  }),
);
</script>

<template>
  <header class="k-header">
    <nav class="k-nav" :aria-label="t('header.sections')">
      <RouterLink v-for="name in routes" :key="name" :to="{name}">
        {{ ROUTE_LABELS[name] }}
      </RouterLink>
    </nav>
    <div class="k-row k-push">
      <span v-if="clusterName" class="k-strong" style="color: var(--k-chrome-text)">
        {{ clusterName }}
      </span>
      <NTag size="small" :type="connected ? 'success' : 'error'" round :bordered="false">
        <span role="status">
          {{ connected ? t('header.connected') : t('header.disconnected') }}
        </span>
      </NTag>
    </div>
  </header>
</template>
