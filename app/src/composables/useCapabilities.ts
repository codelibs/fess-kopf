import {computed, readonly, ref} from 'vue';
import {CAT_APIS, fetchCatApis, fetchInstalledPlugins} from '@/api/opensearch';

/**
 * What this cluster can actually do.
 *
 * kopf serves OpenSearch 2.x and 3.x from one build, and the difference
 * between those versions is not a version number: it is which plugins are
 * installed and which _cat APIs the distribution publishes. Asking the
 * cluster is the only answer that keeps working on a version that did not
 * exist when this was written.
 *
 * The probe runs once, from App.vue, and never from the cluster poll -- the
 * answer changes when a node restarts, not every few seconds. Both halves
 * fail safe: no _cat list means the shipped one, and no plugin list means no
 * plugin-backed screens.
 */
const catApis = ref<string[]>([...CAT_APIS]);
const plugins = ref<Set<string>>(new Set());
const probed = ref(false);

let inFlight: Promise<void> | null = null;

async function probe(): Promise<void> {
  // Each half is independent: a cluster that denies /_nodes must still get
  // its _cat list, and the other way round.
  const [cat, installed] = await Promise.allSettled([fetchCatApis(), fetchInstalledPlugins()]);
  if (cat.status === 'fulfilled' && cat.value.length > 0) {
    catApis.value = cat.value;
  }
  if (installed.status === 'fulfilled') {
    plugins.value = new Set(installed.value);
  }
  probed.value = true;
}

/** Runs the probe once. Concurrent callers share the one round trip. */
export function probeCapabilities(): Promise<void> {
  if (probed.value) {
    return Promise.resolve();
  }
  inFlight ??= probe().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** True when the named plugin is installed on at least one node. */
export function hasPlugin(name: string): boolean {
  return plugins.value.has(name);
}

/** True when this cluster publishes the named _cat API. */
export function hasCat(api: string): boolean {
  return catApis.value.includes(api);
}

/** Test seam: clears module state between cases. */
export function resetCapabilitiesForTest(): void {
  catApis.value = [...CAT_APIS];
  plugins.value = new Set();
  probed.value = false;
  inFlight = null;
}

export function useCapabilities() {
  return {
    catApis: readonly(catApis),
    plugins: readonly(plugins),
    probed: readonly(probed),
    /** The CAT list as select options, in the order the cluster listed them. */
    catApiOptions: computed(() => catApis.value.map((name) => ({label: name, value: name}))),
  };
}
