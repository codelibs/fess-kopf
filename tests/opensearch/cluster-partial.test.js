/**
 * Tests that Cluster can be built when cluster settings are unavailable,
 * which happens when the security plugin denies /_cluster/settings.
 */

const fs = require('fs');
const path = require('path');

function load(relative) {
  return fs.readFileSync(
    path.join(__dirname, '../../src/kopf/', relative), 'utf8');
}

eval(fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'), 'utf8'));
eval(load('opensearch/node.js'));
eval(load('opensearch/shard.js'));
eval(load('opensearch/alias.js'));
eval(load('opensearch/index.js'));
eval(load('opensearch/cluster_changes.js'));
eval(load('opensearch/cluster.js'));

describe('Cluster with unavailable settings', () => {
  const health = {
    status: 'green', initializing_shards: 0, active_primary_shards: 1,
    active_shards: 1, relocating_shards: 0, unassigned_shards: 0,
    number_of_nodes: 1, number_of_data_nodes: 1, timed_out: false
  };
  const state = {
    cluster_name: 'fess-search', master_node: 'n1',
    routing_table: {indices: {}}, blocks: {}, metadata: {indices: {}}
  };
  const stats = {indices: {}, _all: {primaries: {}, total: {}}};
  const nodesStats = {nodes: {n1: {
    jvm: {uptime_in_millis: 1, mem: {}}, fs: {total: {}}, process: {cpu: {}},
    os: {cpu: {}}
  }}};
  const nodes = {nodes: {n1: {
    name: 'search01', version: '3.8.0', transport_address: '127.0.0.1:9300',
    host: '127.0.0.1', roles: ['cluster_manager', 'data'],
    jvm: {version: '21'}, os: {available_processors: 4}
  }}};
  const main = {name: 'search01'};

  test('should build with empty settings', () => {
    const cluster = new Cluster(health, state, stats, nodesStats, {},
        {}, nodes, main);
    expect(cluster.name).toBe('fess-search');
    expect(cluster.disableAllocation).toBe('false');
    expect(cluster.settingsAvailable).toBe(false);
  });

  test('should mark settings as available when present', () => {
    const settings = {persistent: {}, transient: {}};
    const cluster = new Cluster(health, state, stats, nodesStats, settings,
        {}, nodes, main);
    expect(cluster.settingsAvailable).toBe(true);
  });
});
