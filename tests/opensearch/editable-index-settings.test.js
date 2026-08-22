/**
 * Tests for EditableIndexSettings
 * Ensures kopf only offers settings that current OpenSearch accepts, and
 * never resends static settings on an update.
 */

const fs = require('fs');
const path = require('path');

const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

const settingsCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/opensearch/editable_index_settings.js'),
  'utf8'
);
eval(settingsCode);

describe('EditableIndexSettings', () => {
  // Every one of these answers HTTP 400 "unknown setting" on OpenSearch
  // 3.8.0. Offering them as form fields only produces failed saves.
  const REMOVED = [
    'index.cache.filter.max_size',
    'index.cache.filter.expire',
    'index.index_concurrency',
    'index.term_index_divisor',
    'index.ttl.disable_purge',
    'index.fail_on_merge_failure',
    'index.compound_on_flush',
    'index.term_index_interval',
    'index.recovery.initial_shards',
    'index.routing.allocation.disable_allocation',
    'index.routing.allocation.disable_new_allocation',
    'index.routing.allocation.disable_replica_allocation',
    'index.translog.flush_threshold_ops',
    'index.translog.flush_threshold_period',
    'index.translog.disable_flush',
    'index.translog.fs.type'
  ];

  const KEPT = [
    'index.blocks.read_only',
    'index.number_of_replicas',
    'index.refresh_interval',
    'index.auto_expand_replicas',
    'index.routing.allocation.total_shards_per_node',
    'index.translog.flush_threshold_size'
  ];

  test('should not offer settings removed from OpenSearch', () => {
    const settings = new EditableIndexSettings({});
    REMOVED.forEach(function(key) {
      expect(settings.valid_settings).not.toContain(key);
    });
  });

  test('should keep settings that OpenSearch still accepts', () => {
    const settings = new EditableIndexSettings({});
    KEPT.forEach(function(key) {
      expect(settings.valid_settings).toContain(key);
    });
  });

  test('should still display index.codec', () => {
    const settings = new EditableIndexSettings({'index.codec': 'default'});
    expect(settings.valid_settings).toContain('index.codec');
    expect(settings['index.codec']).toBe('default');
  });

  test('should exclude static settings from the updatable set', () => {
    const settings = new EditableIndexSettings({
      'index.number_of_replicas': '1',
      'index.codec': 'default'
    });
    const updatable = settings.getUpdatable();
    expect(updatable['index.number_of_replicas']).toBe('1');
    expect(updatable['index.codec']).toBeUndefined();
  });

  test('should omit empty values from the updatable set', () => {
    const settings = new EditableIndexSettings({
      'index.number_of_replicas': '1'
    });
    const updatable = settings.getUpdatable();
    expect(Object.keys(updatable)).toEqual(['index.number_of_replicas']);
  });
});
