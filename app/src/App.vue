<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue';
import {RouterView} from 'vue-router';
import AlertList from '@/components/AlertList.vue';
import ClusterStats from '@/components/ClusterStats.vue';
import NavBar from '@/components/NavBar.vue';
import {startPolling, stopPolling} from '@/composables/useCluster';

onMounted(startPolling);
onBeforeUnmount(stopPolling);
</script>

<template>
  <NavBar />
  <AlertList />
  <ClusterStats />
  <main class="container-fluid py-3">
    <RouterView />
  </main>
</template>
