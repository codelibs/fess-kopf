function Index(indexName, clusterState, indexStats, aliases) {
  this.name = indexName;
  this.shards = null;
  this.metadata = {};
  this.state = 'close';
  this.num_of_shards = 0;
  this.num_of_replicas = 0;
  this.aliases = [];
  if (isDefined(aliases)) {
    var indexAliases = aliases.aliases;
    if (isDefined(indexAliases)) {
      this.aliases = Object.keys(aliases.aliases);
    }
  }

  if (isDefined(clusterState)) {
    var routing = getProperty(clusterState, 'routing_table.indices');
    this.state = 'open';
    if (isDefined(routing)) {
      var shards = Object.keys(routing[indexName].shards);
      this.num_of_shards = shards.length;
      var shardMap = routing[indexName].shards;
      this.num_of_replicas = shardMap[0].length - 1;
    }
  }
  this.num_docs = getProperty(indexStats, 'primaries.docs.count', 0);
  this.deleted_docs = getProperty(indexStats, 'primaries.docs.deleted', 0);
  this.size_in_bytes = getProperty(indexStats,
      'primaries.store.size_in_bytes', 0);
  this.total_size_in_bytes = getProperty(indexStats,
      'total.store.size_in_bytes', 0);

  this.unassigned = [];
  this.unhealthy = false;

  if (isDefined(clusterState) && isDefined(clusterState.routing_table)) {
    var instance = this;
    var shardsMap = clusterState.routing_table.indices[this.name].shards;
    Object.keys(shardsMap).forEach(function(shardNum) {
      shardsMap[shardNum].forEach(function(shard) {
        if (shard.state != 'STARTED') {
          instance.unhealthy = true;
        }
      });
    });
  }

  this.special = this.name.indexOf('.') === 0 || this.name.indexOf('_') === 0;

  this.equals = function(index) {
    return index !== null && index.name == this.name;
  };

  // Closed indices still appear in the routing table since ES 7.2, so
  // Cluster builds them as open first and marks them afterwards. Keep
  // state and the derived flags in one place so they cannot drift.
  this.markClosed = function() {
    this.state = 'close';
    this.closed = true;
    this.open = false;
  };

  this.closed = this.state === 'close';

  this.open = this.state === 'open';

}
