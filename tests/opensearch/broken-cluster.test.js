/**
 * Tests for BrokenCluster.
 * The cluster settings screen reads settingsAvailable, and basic mode
 * must not claim the settings could not be read when they were.
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
eval(load('opensearch/broken_cluster.js'));

describe('BrokenCluster', () => {
  // BrokenCluster(health, state, nodesStats, settings, nodes)
  const health = {
    status: 'red', initializing_shards: 0, active_primary_shards: 0,
    active_shards: 0, relocating_shards: 0, unassigned_shards: 0,
    number_of_nodes: 1, number_of_data_nodes: 1, timed_out: false
  };
  const state = {cluster_name: 'fess-search', master_node: 'n1'};
  const nodesStats = {nodes: {n1: {
    jvm: {uptime_in_millis: 1, mem: {}}, fs: {total: {}},
    process: {cpu: {}}, os: {cpu: {}}
  }}};
  const nodes = {nodes: {n1: {
    name: 'search01', version: '3.8.0',
    transport_address: '127.0.0.1:9300', host: '127.0.0.1',
    roles: ['cluster_manager', 'data'],
    jvm: {version: '21'}, os: {available_processors: 4}
  }}};

  function build(settings) {
    return new BrokenCluster(health, state, nodesStats, settings, nodes);
  }

  test('should report settings as available when they are', () => {
    expect(build({persistent: {}, transient: {}}).settingsAvailable)
        .toBe(true);
  });

  test('should report settings as unavailable when they are empty', () => {
    expect(build({}).settingsAvailable).toBe(false);
  });
});
