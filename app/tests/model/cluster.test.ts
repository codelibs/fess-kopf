import {describe, expect, it} from 'vitest';
import {Cluster, type ClusterSettingsResponse} from '@/model/cluster';
import type {ClusterState, IndexAliases} from '@/model/opensearch-index';
import {emptyStats, health, nodes, nodesStats, shardRouting, state} from './fixtures';

/**
 * Ported from tests/opensearch/cluster-closed-index.test.js and
 * cluster-partial.test.js. These pin fixes made to the AngularJS model, so
 * they are the ones that must not quietly change meaning in the port.
 */

const main = {name: 'search01'};

function build(
  clusterState: ClusterState,
  settings: ClusterSettingsResponse | undefined = {},
  aliases: Record<string, IndexAliases> = {},
): Cluster {
  return new Cluster(
    health(),
    clusterState,
    emptyStats(),
    nodesStats(),
    settings,
    aliases,
    nodes(),
    main,
  );
}

/**
 * A closed index that OpenSearch reports in BOTH routing_table and blocks,
 * which is what a replicated closed index has looked like since ES 7.2.
 */
/** The tree shape /_cluster/settings returns without flat_settings. */
function nested(scope: 'persistent' | 'transient', enable: string): ClusterSettingsResponse {
  return {[scope]: {cluster: {routing: {allocation: {enable}}}}};
}

const closedState: ClusterState = {
  cluster_name: 'fess-search',
  master_node: 'n1',
  routing_table: {
    indices: {'closed-one': {shards: {0: [shardRouting({index: 'closed-one'})]}}},
  },
  blocks: {indices: {'closed-one': {'4': {description: 'index closed'}}}},
};

const closedAliases: Record<string, IndexAliases> = {
  'closed-one': {aliases: {'an-alias': {}}},
};

describe('Cluster with a closed index', () => {
  it('lists the closed index exactly once', () => {
    const cluster = build(closedState, {}, closedAliases);
    const names = cluster.indices.map((index) => index.name);
    expect(names.filter((name) => name === 'closed-one')).toHaveLength(1);
  });

  it('keeps the aliases of the closed index', () => {
    const cluster = build(closedState, {}, closedAliases);
    const index = cluster.indices.find((i) => i.name === 'closed-one');
    expect(index?.aliases).toContain('an-alias');
  });

  it('counts it as closed', () => {
    expect(build(closedState, {}, closedAliases).closedIndices).toBe(1);
  });

  it('leaves state and the derived flags consistent', () => {
    const index = build(closedState, {}, closedAliases).indices.find(
      (i) => i.name === 'closed-one',
    );
    expect(index?.state).toBe('close');
    expect(index?.closed).toBe(true);
    expect(index?.open).toBe(false);
  });

  it('excludes it from open_indices()', () => {
    const cluster = build(closedState, {}, closedAliases);
    expect(cluster.open_indices().map((i) => i.name)).not.toContain('closed-one');
  });

  it('counts a special index that exists only in blocks', () => {
    // Special indices were counted in the routing-table pass only, so one
    // that appears solely under blocks was missed.
    const blocksOnly: ClusterState = {
      cluster_name: 'fess-search',
      master_node: 'n1',
      routing_table: {indices: {}},
      blocks: {indices: {'.closed-special': {'4': {description: 'closed'}}}},
    };
    expect(build(blocksOnly).special_indices).toBe(1);
  });

  it('ignores a block that is not the closed block', () => {
    const readOnly: ClusterState = {
      ...closedState,
      blocks: {indices: {'closed-one': {'5': {description: 'index read-only'}}}},
    };
    const cluster = build(readOnly, {}, closedAliases);
    expect(cluster.closedIndices).toBe(0);
    expect(cluster.open_indices().map((i) => i.name)).toContain('closed-one');
  });
});

describe('Cluster settings', () => {
  it('builds with empty settings and reports them unavailable', () => {
    const cluster = build(state(), {});
    expect(cluster.name).toBe('fess-search');
    expect(cluster.disableAllocation).toBe('false');
    expect(cluster.settingsAvailable).toBe(false);
  });

  it('reports settings as available when persistent or transient is present', () => {
    expect(build(state(), {persistent: {}}).settingsAvailable).toBe(true);
    expect(build(state(), {transient: {}}).settingsAvailable).toBe(true);
  });

  it('survives settings being absent entirely', () => {
    // /_cluster/settings can fail on its own; that must not blank the cluster.
    const cluster = build(state(), undefined);
    expect(cluster.settingsAvailable).toBe(false);
    expect(cluster.disableAllocation).toBe('false');
  });

  it('reads allocation as disabled when persistent is not "all"', () => {
    // Nested, because that is what /_cluster/settings returns: the request
    // carries no flat_settings parameter.
    const settings = nested('persistent', 'none');
    expect(build(state(), settings).disableAllocation).toBe('true');
  });

  it('lets a transient setting override a persistent one', () => {
    const settings = {...nested('persistent', 'none'), ...nested('transient', 'all')};
    expect(build(state(), settings).disableAllocation).toBe('false');
  });

  it('does not read the flat form', () => {
    // Pinning the limit, not endorsing it: adding flat_settings=true to the
    // request would silently stop allocation state being detected, because
    // the dotted path is walked as nested objects.
    const flat = {persistent: {'cluster.routing.allocation.enable': 'none'}};
    expect(build(state(), flat).disableAllocation).toBe('false');
  });
});

describe('Cluster topology', () => {
  it('builds its nodes and marks the current master', () => {
    const cluster = build(state());
    expect(cluster.nodes).toHaveLength(1);
    expect(cluster.number_of_nodes).toBe(1);
    expect(cluster.nodes[0].current_master).toBe(true);
    expect(cluster.getNodes()).toBe(cluster.nodes);
  });

  it('groups assigned shards by node and index', () => {
    const cluster = build(state());
    expect(cluster.getShards('n1', 'test-index')).toHaveLength(1);
    expect(cluster.getShards('n1', 'absent')).toEqual([]);
  });

  it('keeps unassigned shards separate', () => {
    const withUnassigned = state({
      routing_table: {
        indices: {
          'test-index': {shards: {0: [shardRouting({state: 'UNASSIGNED', node: null})]}},
        },
      },
    });
    const cluster = build(withUnassigned);
    expect(cluster.getUnassignedShards('test-index')).toHaveLength(1);
    expect(cluster.getShards('n1', 'test-index')).toEqual([]);
    expect(cluster.getUnassignedShards('absent')).toEqual([]);
  });

  it('totals the shard counts from health', () => {
    const cluster = new Cluster(
      health({
        active_shards: 4,
        relocating_shards: 1,
        unassigned_shards: 2,
        initializing_shards: 3,
      }),
      state(),
      emptyStats(),
      nodesStats(),
      {},
      {},
      nodes(),
      main,
    );
    expect(cluster.shards).toBe(10);
  });
});

describe('Cluster.computeChanges', () => {
  it('reports nothing when there is no previous cluster', () => {
    const cluster = build(state());
    cluster.computeChanges(undefined);
    expect(cluster.changes?.hasChanges()).toBe(false);
  });

  it('reports nothing when the previous poll is a different cluster', () => {
    const previous = build(state());
    const current = build(state({cluster_name: 'other'}));
    current.computeChanges(previous);
    expect(current.changes?.hasChanges()).toBe(false);
  });

  it('reports a created index', () => {
    const previous = build(state({routing_table: {indices: {}}}));
    const current = build(state());
    current.computeChanges(previous);
    expect(current.changes?.indicesCreated?.map((i) => i.name)).toEqual(['test-index']);
  });

  it('reports a deleted index', () => {
    const previous = build(state());
    const current = build(state({routing_table: {indices: {}}}));
    current.computeChanges(previous);
    expect(current.changes?.indicesDeleted?.map((i) => i.name)).toEqual(['test-index']);
  });

  it('records the doc and data deltas', () => {
    const previous = build(state());
    const current = build(state());
    current.computeChanges(previous);
    expect(current.changes?.getDocDelta()).toBe(0);
    expect(current.changes?.getDataDelta()).toBe(0);
  });
});
