import {describe, expect, it} from 'vitest';
import {BrokenCluster} from '@/model/broken-cluster';
import {Cluster, type ClusterSettingsResponse} from '@/model/cluster';
import {emptyStats, health, nodes, nodesStats, state} from './fixtures';

/** Ported from tests/opensearch/broken-cluster.test.js. */

function build(settings: ClusterSettingsResponse | undefined): BrokenCluster {
  return new BrokenCluster(health(), state(), nodesStats(), settings, nodes());
}

describe('BrokenCluster', () => {
  it('reports settings as available when they are', () => {
    expect(build({persistent: {}, transient: {}}).settingsAvailable).toBe(true);
    expect(build({persistent: {}}).settingsAvailable).toBe(true);
    expect(build({transient: {}}).settingsAvailable).toBe(true);
  });

  it('reports settings as unavailable when they are empty or absent', () => {
    expect(build({}).settingsAvailable).toBe(false);
    expect(build(undefined).settingsAvailable).toBe(false);
  });

  it('decides settings availability exactly as Cluster does', () => {
    // A screen must not conclude settings are available on one and not the
    // other; the two predicates are meant to stay identical.
    const cases: (ClusterSettingsResponse | undefined)[] = [
      undefined,
      {},
      {persistent: {}},
      {transient: {}},
      {persistent: {}, transient: {}},
    ];
    for (const settings of cases) {
      const full = new Cluster(
        health(),
        state(),
        emptyStats(),
        nodesStats(),
        settings,
        {},
        nodes(),
        {name: 'search01'},
      );
      expect(build(settings).settingsAvailable).toBe(full.settingsAvailable);
    }
  });

  it('carries health, name and topology through', () => {
    const cluster = build({});
    expect(cluster.name).toBe('fess-search');
    expect(cluster.master_node).toBe('n1');
    expect(cluster.status).toBe('green');
    expect(cluster.nodes).toHaveLength(1);
    expect(cluster.nodes[0].current_master).toBe(true);
    expect(cluster.getNodes()).toBe(cluster.nodes);
  });

  it('has no indices and reports zero size', () => {
    const cluster = build({});
    expect(cluster.indices).toEqual([]);
    expect(cluster.total_size_in_bytes).toBe(0);
    // readablizeBytes returns the number 0 for a zero count.
    expect(cluster.total_size).toBe(0);
  });
});
