function ClusterSettings(settings) {
  // Every key here was verified against OpenSearch 3.8.0. Keys that answer
  // "unknown setting" are not listed, because rendering them as form
  // fields only produced HTTP 400 on save.
  var valid = [
    // cluster
    'cluster.blocks.read_only',
    // recovery
    'indices.recovery.max_bytes_per_sec',
    // routing
    'cluster.routing.allocation.node_initial_primaries_recoveries',
    'cluster.routing.allocation.cluster_concurrent_rebalance',
    'cluster.routing.allocation.awareness.attributes',
    'cluster.routing.allocation.node_concurrent_recoveries'
  ];
  var instance = this;
  ['persistent', 'transient'].forEach(function(type) {
    instance[type] = {};
    var currentSettings = settings[type];
    valid.forEach(function(setting) {
      instance[type][setting] = getProperty(currentSettings, setting);
    });
  });
}
