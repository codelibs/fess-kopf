/**
 * Tests that a closed index appears once and keeps its aliases.
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

describe('Cluster with a closed index', () => {
  const health = {
    status: 'green', initializing_shards: 0, active_primary_shards: 0,
    active_shards: 0, relocating_shards: 0, unassigned_shards: 0,
    number_of_nodes: 1, number_of_data_nodes: 1, timed_out: false
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

  // A closed index that OpenSearch reports in BOTH routing_table and
  // blocks, which is what replicated closed indices look like since 7.2.
  // Index reads routing[name].shards[0].length to derive num_of_replicas,
  // so the shard map needs at least one shard entry.
  const state = {
    cluster_name: 'fess-search', master_node: 'n1',
    routing_table: {indices: {'closed-one': {shards: {0: [
      {primary: true, shard: 0, state: 'STARTED', node: 'n1',
        index: 'closed-one'}
    ]}}}},
    blocks: {indices: {'closed-one': {'4': {description: 'index closed'}}}},
    metadata: {indices: {}}
  };
  // Index reads its 4th constructor arg as {aliases: {name: {...}}},
  // the same shape the real /_aliases response uses per index.
  const aliases = {'closed-one': {aliases: {'an-alias': {}}}};

  test('should list a closed index exactly once', () => {
    const cluster = new Cluster(health, state, stats, nodesStats, {},
        aliases, nodes, main);
    const names = cluster.indices.map(function(i) { return i.name; });
    expect(names.filter(function(n) { return n === 'closed-one'; }).length)
        .toBe(1);
  });

  test('should keep the aliases of a closed index', () => {
    const cluster = new Cluster(health, state, stats, nodesStats, {},
        aliases, nodes, main);
    const index = cluster.indices.find(function(i) {
      return i.name === 'closed-one';
    });
    expect(index.aliases).toContain('an-alias');
  });

  test('should count the closed index', () => {
    const cluster = new Cluster(health, state, stats, nodesStats, {},
        aliases, nodes, main);
    expect(cluster.closedIndices).toBe(1);
  });

  test('should keep the derived closed/open flags consistent', () => {
    const cluster = new Cluster(health, state, stats, nodesStats, {},
        aliases, nodes, main);
    const index = cluster.indices.find(function(i) {
      return i.name === 'closed-one';
    });
    // index_filter.js and the cluster overview partials read these two,
    // not state, so they must not be left stale.
    expect(index.state).toBe('close');
    expect(index.closed).toBe(true);
    expect(index.open).toBe(false);
  });

  test('should exclude the closed index from open_indices()', () => {
    const cluster = new Cluster(health, state, stats, nodesStats, {},
        aliases, nodes, main);
    const openNames = cluster.open_indices().map(function(i) {
      return i.name;
    });
    expect(openNames).not.toContain('closed-one');
  });
});
