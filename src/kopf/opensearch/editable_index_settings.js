// Settings that OpenSearch only accepts at index creation time.
// Resending them on an update makes the whole _settings call fail.
var STATIC_INDEX_SETTINGS = [
  'index.codec'
];

function EditableIndexSettings(settings) {
  // Every key here was verified against OpenSearch 3.8.0. Keys that answer
  // "unknown setting" are not listed, because rendering them as form
  // fields only produced HTTP 400 on save.
  this.valid_settings = [
    // blocks
    'index.blocks.read_only',
    'index.blocks.read',
    'index.blocks.write',
    'index.blocks.metadata',
    // index
    'index.number_of_replicas',
    'index.refresh_interval',
    'index.gc_deletes',
    'index.codec',
    'index.auto_expand_replicas',
    'index.compound_format',
    // routing
    'index.routing.allocation.total_shards_per_node',
    // slowlog
    'index.search.slowlog.threshold.query.warn',
    'index.search.slowlog.threshold.query.info',
    'index.search.slowlog.threshold.query.debug',
    'index.search.slowlog.threshold.query.trace',
    'index.search.slowlog.threshold.fetch.warn',
    'index.search.slowlog.threshold.fetch.info',
    'index.search.slowlog.threshold.fetch.debug',
    'index.search.slowlog.threshold.fetch.trace',
    'index.indexing.slowlog.threshold.index.warn',
    'index.indexing.slowlog.threshold.index.info',
    'index.indexing.slowlog.threshold.index.debug',
    'index.indexing.slowlog.threshold.index.trace',
    // translog
    'index.translog.flush_threshold_size'
  ];
  var instance = this;
  this.valid_settings.forEach(function(setting) {
    instance[setting] = getProperty(settings, setting);
  });

  this.getUpdatable = function() {
    var updatable = {};
    var self = this;
    this.valid_settings.forEach(function(setting) {
      if (STATIC_INDEX_SETTINGS.indexOf(setting) < 0 &&
          notEmpty(self[setting])) {
        updatable[setting] = self[setting];
      }
    });
    return updatable;
  };
}
