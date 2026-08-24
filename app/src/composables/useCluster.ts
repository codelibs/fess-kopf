import {computed, readonly, ref, shallowRef} from 'vue';
import {RequestError} from '@/api/client';
import {ClusterUnavailableError, fetchBrokenCluster, fetchCluster} from '@/api/opensearch';
import {getSettings} from '@/api/settings';
import type {BrokenCluster} from '@/model/broken-cluster';
import type {Cluster} from '@/model/cluster';
import {Version} from '@/model/version';
import {useAlerts} from './useAlerts';

/** kopf targets OpenSearch. Anything older than 2.x is not supported. */
const MIN_MAJOR = 2;

const cluster = shallowRef<Cluster | null>(null);
const brokenCluster = shallowRef<BrokenCluster | null>(null);
const version = ref<Version | null>(null);
const connected = ref(false);
const lastError = ref<Error | null>(null);

const alerts = useAlerts();

let poller: ReturnType<typeof setInterval> | null = null;
let inFlight: AbortController | null = null;
let versionWarned = false;
/** Signature of the last error reported, so a repeating poll reports it once. */
let reportedSignature: string | null = null;

function report(error: Error): void {
  const status = error instanceof RequestError ? error.status : '';
  const signature = `${error.name}:${status}:${error.message}`;
  if (signature === reportedSignature) {
    return;
  }
  reportedSignature = signature;
  const isAuth =
    (error instanceof RequestError || error instanceof ClusterUnavailableError) &&
    error.isAuthFailure;
  alerts.error(
    isAuth ? 'Not authorised to reach the search engine. Sign in to Fess again.' : error.message,
    error instanceof RequestError ? error.body : undefined,
  );
}

function recordVersion(next: Cluster): void {
  if (next.version === undefined) {
    return;
  }
  const parsed = new Version(next.version);
  version.value = parsed;
  // Warn once per page view, not once per poll.
  if (!versionWarned && parsed.valid && parsed.major < MIN_MAJOR) {
    versionWarned = true;
    alerts.warn(
      'This version of kopf supports OpenSearch 2.x and later',
      `Detected ${parsed.value} on ${next.name}`,
    );
  }
}

export async function refresh(): Promise<void> {
  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;

  try {
    const next = await fetchCluster(controller.signal);
    next.computeChanges(cluster.value ?? undefined);
    cluster.value = next;
    brokenCluster.value = null;
    connected.value = true;
    lastError.value = null;
    reportedSignature = null;
    recordVersion(next);
    return;
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    // The full poll needs an elected master and readable indices. When it
    // cannot be assembled, fall back to what can still be answered rather
    // than blanking every screen.
    try {
      brokenCluster.value = await fetchBrokenCluster(controller.signal);
      cluster.value = null;
      connected.value = true;
      lastError.value = error as Error;
      report(error as Error);
      return;
    } catch (fallbackError) {
      if (controller.signal.aborted) {
        return;
      }
      cluster.value = null;
      brokenCluster.value = null;
      connected.value = false;
      lastError.value = fallbackError as Error;
      report(fallbackError as Error);
    }
  }
}

export function startPolling(): void {
  if (poller !== null) {
    return;
  }
  void refresh();
  poller = setInterval(() => void refresh(), getSettings().refresh_rate);
}

export function stopPolling(): void {
  if (poller !== null) {
    clearInterval(poller);
    poller = null;
  }
  inFlight?.abort();
  inFlight = null;
}

/** Test seam: clears module state between cases. */
export function resetClusterForTest(): void {
  stopPolling();
  cluster.value = null;
  brokenCluster.value = null;
  version.value = null;
  connected.value = false;
  lastError.value = null;
  versionWarned = false;
  reportedSignature = null;
}

export function useCluster() {
  return {
    cluster: readonly(cluster),
    brokenCluster: readonly(brokenCluster),
    version: readonly(version),
    connected: readonly(connected),
    lastError: readonly(lastError),
    /** Whichever view is current; screens that only need health use this. */
    current: computed(() => cluster.value ?? brokenCluster.value),
    clusterName: computed(() => cluster.value?.name ?? brokenCluster.value?.name ?? null),
    /** True once there is something to render. */
    hasConnection: computed(() => cluster.value !== null || brokenCluster.value !== null),
    /** True when only the reduced view is available. */
    degraded: computed(() => cluster.value === null && brokenCluster.value !== null),
    refresh,
  };
}
