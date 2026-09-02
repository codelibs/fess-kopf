import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {CLUSTER_PATHS, BROKEN_CLUSTER_PATHS} from '@/api/opensearch';
import {resetSettingsForTest} from '@/api/settings';
import {refresh, resetClusterForTest, useCluster} from '@/composables/useCluster';
import {useAlerts} from '@/composables/useAlerts';
import {stubFetch} from '../api/routes';

const cluster = useCluster();
const alerts = useAlerts();

/**
 * Every full-poll path fails except /_nodes/_all/os,jvm, which the reduced
 * view uses too -- failing it would take the fallback down with the poll.
 */
function fullPollFails(status = 500): Record<string, number> {
  return Object.fromEntries(
    [
      CLUSTER_PATHS.state,
      CLUSTER_PATHS.indexStats,
      CLUSTER_PATHS.nodesStats,
      CLUSTER_PATHS.aliases,
      CLUSTER_PATHS.health,
      CLUSTER_PATHS.main,
    ].map((path) => [path, status]),
  );
}

beforeEach(() => {
  resetSettingsForTest();
  resetClusterForTest();
  alerts.clear();
  window.history.replaceState({}, '', '/admin/server_tok/_plugin/kopf/app/');
});

afterEach(() => vi.unstubAllGlobals());

describe('useCluster', () => {
  it('holds the cluster after a successful poll', async () => {
    stubFetch();
    await refresh();
    expect(cluster.connected.value).toBe(true);
    expect(cluster.hasConnection.value).toBe(true);
    expect(cluster.degraded.value).toBe(false);
    expect(cluster.clusterName.value).toBe('fess-search');
    expect(cluster.version.value?.value).toBe('3.8.0');
  });

  it('computes changes against the previous poll', async () => {
    stubFetch();
    await refresh();
    await refresh();
    // Same cluster twice: a diff was computed, and it found nothing.
    expect(cluster.cluster.value?.changes).not.toBeNull();
    expect(cluster.cluster.value?.changes?.hasChanges()).toBe(false);
  });

  it('reports a created index between polls', async () => {
    stubFetch({
      routes: {
        ...(await import('../api/routes')).okRoutes(),
        '/_cluster/state/master_node,cluster_manager_node,routing_table,blocks/': {
          cluster_name: 'fess-search',
          master_node: 'n1',
          routing_table: {indices: {}},
          blocks: {},
        },
      },
    });
    await refresh();
    stubFetch();
    await refresh();
    expect(cluster.cluster.value?.changes?.indicesCreated?.map((i) => i.name)).toEqual([
      'test-index',
    ]);
  });

  it('falls back to the reduced view when the full poll cannot be assembled', async () => {
    stubFetch({failing: fullPollFails()});
    await refresh();
    expect(cluster.connected.value).toBe(true);
    expect(cluster.degraded.value).toBe(true);
    expect(cluster.brokenCluster.value?.name).toBe('fess-search');
    expect(cluster.cluster.value).toBeNull();
  });

  it('cannot fall back when the endpoint both views share is the broken one', () => {
    // /_nodes/_all/os,jvm appears in CLUSTER_PATHS and BROKEN_CLUSTER_PATHS.
    // Pinning the coupling: if it is what fails, there is no reduced view to
    // fall back to.
    expect(CLUSTER_PATHS.nodes).toBe(BROKEN_CLUSTER_PATHS.nodes);
  });

  it('disconnects only when the reduced view fails too', async () => {
    stubFetch({
      failing: {
        ...fullPollFails(),
        [BROKEN_CLUSTER_PATHS.state]: 500,
        [BROKEN_CLUSTER_PATHS.nodesStats]: 500,
        [BROKEN_CLUSTER_PATHS.health]: 500,
        [BROKEN_CLUSTER_PATHS.nodes]: 500,
      },
    });
    await refresh();
    expect(cluster.connected.value).toBe(false);
    expect(cluster.hasConnection.value).toBe(false);
    expect(cluster.lastError.value).not.toBeNull();
  });

  it('raises the same failure once, not once per poll', async () => {
    // The poll repeats every few seconds; an unreachable cluster used to
    // push a fresh alert onto the stack forever.
    stubFetch({
      failing: {
        ...fullPollFails(),
        [BROKEN_CLUSTER_PATHS.state]: 500,
        [BROKEN_CLUSTER_PATHS.nodesStats]: 500,
        [BROKEN_CLUSTER_PATHS.health]: 500,
        [BROKEN_CLUSTER_PATHS.nodes]: 500,
      },
    });
    await refresh();
    await refresh();
    await refresh();
    expect(alerts.alerts.value).toHaveLength(1);
  });

  it('reports an authentication failure in terms the user can act on', async () => {
    stubFetch({
      failing: Object.fromEntries(
        [...Object.values(CLUSTER_PATHS), ...Object.values(BROKEN_CLUSTER_PATHS)].map((path) => [
          path,
          401,
        ]),
      ),
    });
    await refresh();
    expect(alerts.alerts.value[0].message).toContain('Sign in to Fess again');
  });

  it('recovers after a failure without leaving the old error on screen', async () => {
    stubFetch({
      failing: {
        ...fullPollFails(),
        [BROKEN_CLUSTER_PATHS.state]: 500,
        [BROKEN_CLUSTER_PATHS.nodesStats]: 500,
        [BROKEN_CLUSTER_PATHS.health]: 500,
        [BROKEN_CLUSTER_PATHS.nodes]: 500,
      },
    });
    await refresh();
    expect(cluster.connected.value).toBe(false);
    stubFetch();
    await refresh();
    expect(cluster.connected.value).toBe(true);
    expect(cluster.lastError.value).toBeNull();
  });

  it('warns once when the engine predates OpenSearch 2', async () => {
    const {okRoutes} = await import('../api/routes');
    stubFetch({routes: {...okRoutes(), '/': {name: 'old', version: {number: '1.3.0'}}}});
    await refresh();
    await refresh();
    const warnings = alerts.alerts.value.filter((a) => a.level === 'warn');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('OpenSearch 2.x and later');
  });
});
