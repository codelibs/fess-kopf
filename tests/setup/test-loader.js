/**
 * Test loader - loads source files in the correct order for Jest tests
 * This follows the same concatenation order as Gruntfile.js
 */

const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../../src/kopf');

// Load files in the correct order (matching Gruntfile.js concat order)
const loadOrder = [
  // util.js first (defines isDefined, notEmpty, getProperty, etc.)
  'util.js',
  // opensearch models
  'opensearch/cluster_changes.js',
  'opensearch/shard.js',
  'opensearch/node.js',
  'opensearch/index.js',
  'opensearch/cluster.js',
  'opensearch/version.js',
  'opensearch/alias.js',
  'opensearch/broken_cluster.js',
  'opensearch/cat_result.js',
  'opensearch/cluster_health.js',
  'opensearch/cluster_mapping.js',
  'opensearch/cluster_settings.js',
  'opensearch/editable_index_settings.js',
  'opensearch/hot_thread.js',
  'opensearch/hot_threads.js',
  'opensearch/index_metadata.js',
  'opensearch/index_template.js',
  'opensearch/node_hot_threads.js',
  'opensearch/node_stats.js',
  'opensearch/opensearch_connection.js',
  'opensearch/percolator.js',
  'opensearch/repository.js',
  'opensearch/shard_stats.js',
  'opensearch/snapshot.js',
  'opensearch/token.js',
  'opensearch/warmer.js',
  // models
  'models/paginator.js',
  'models/index_filter.js',
  'models/node_filter.js',
  'models/alias_filter.js',
  'models/index_template_filter.js',
  'models/snapshot_filter.js',
  'models/warmer_filter.js',
  'models/ace_editor.js',
  'models/benchmark.js',
  'models/gist.js',
  'models/modal_controls.js',
  'models/request.js',
  'models/url_autocomplete.js',
];

function loadSourceFiles() {
  // First load util.js
  const utilCode = fs.readFileSync(path.join(srcPath, 'util.js'), 'utf8');
  eval(utilCode);

  // Make utility functions global
  global.isDefined = isDefined;
  global.notEmpty = notEmpty;
  global.getProperty = getProperty;
  global.readablizeBytes = readablizeBytes;
  global.getTimeString = getTimeString;

  // Load each file in order
  loadOrder.slice(1).forEach(file => {
    const filePath = path.join(srcPath, file);
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      try {
        eval(code);
      } catch (e) {
        // Some files depend on AngularJS 'kopf' module, skip those
        if (!e.message.includes('kopf is not defined')) {
          console.warn(`Warning: Could not load ${file}: ${e.message}`);
        }
      }
    }
  });

  // Export classes to global scope for tests
  if (typeof ClusterChanges !== 'undefined') global.ClusterChanges = ClusterChanges;
  if (typeof Shard !== 'undefined') global.Shard = Shard;
  if (typeof Node !== 'undefined') global.Node = Node;
  if (typeof Index !== 'undefined') global.Index = Index;
  if (typeof Cluster !== 'undefined') global.Cluster = Cluster;
  if (typeof Version !== 'undefined') global.Version = Version;
  if (typeof Paginator !== 'undefined') global.Paginator = Paginator;
  if (typeof Page !== 'undefined') global.Page = Page;
  if (typeof IndexFilter !== 'undefined') global.IndexFilter = IndexFilter;
  if (typeof NodeFilter !== 'undefined') global.NodeFilter = NodeFilter;
  if (typeof Alias !== 'undefined') global.Alias = Alias;
  if (typeof IndexAliases !== 'undefined') global.IndexAliases = IndexAliases;
  if (typeof Repository !== 'undefined') global.Repository = Repository;
  if (typeof Snapshot !== 'undefined') global.Snapshot = Snapshot;
  if (typeof OpenSearchConnection !== 'undefined') global.OpenSearchConnection = OpenSearchConnection;
}

module.exports = { loadSourceFiles, srcPath };
