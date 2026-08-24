import {describe, expect, it} from 'vitest';
import {
  EditableIndexSettings,
  SETTING_GROUPS,
  STATIC_INDEX_SETTINGS,
  VALID_SETTINGS,
} from '@/model/editable-index-settings';

/** Ported from tests/opensearch/editable-index-settings.test.js. */

describe('EditableIndexSettings', () => {
  it('offers the 24 settings that OpenSearch 3.8 accepts', () => {
    // Keys that answer "unknown setting" were removed after being probed
    // against a live cluster; re-adding one would only produce HTTP 400.
    expect(VALID_SETTINGS).toHaveLength(24);
    expect(new Set(VALID_SETTINGS).size).toBe(24);
  });

  it('groups them the way the screen presents them', () => {
    expect(SETTING_GROUPS.map((g) => g.label)).toEqual([
      'index',
      'block operations',
      'translog',
      'routing',
      'slow log',
    ]);
    expect(SETTING_GROUPS.flatMap((g) => g.settings)).toEqual(VALID_SETTINGS);
  });

  it('reads values out of a nested settings tree', () => {
    const settings = new EditableIndexSettings({
      index: {number_of_replicas: 2, refresh_interval: '30s'},
    });
    expect(settings.values['index.number_of_replicas']).toBe('2');
    expect(settings.values['index.refresh_interval']).toBe('30s');
  });

  it('reads values out of flattened keys too', () => {
    const settings = new EditableIndexSettings({'index.number_of_replicas': '1'});
    expect(settings.values['index.number_of_replicas']).toBe('1');
  });

  it('leaves absent settings empty rather than undefined', () => {
    const settings = new EditableIndexSettings({});
    expect(settings.values['index.refresh_interval']).toBe('');
  });

  describe('getUpdatable', () => {
    it('sends only settings that have a value', () => {
      const settings = new EditableIndexSettings({index: {number_of_replicas: 1}});
      expect(settings.getUpdatable()).toEqual({'index.number_of_replicas': '1'});
    });

    it('never sends a create-time setting back', () => {
      // index.codec is fixed when the index is created; resending it makes the
      // whole _settings call fail, which is what used to break every save.
      const settings = new EditableIndexSettings({
        index: {codec: 'best_compression', number_of_replicas: 1},
      });
      expect(settings.values['index.codec']).toBe('best_compression');
      expect(settings.getUpdatable()).not.toHaveProperty('index.codec');
    });

    it('sends nothing when nothing is set', () => {
      expect(new EditableIndexSettings({}).getUpdatable()).toEqual({});
    });

    it('sends an edited value', () => {
      const settings = new EditableIndexSettings({});
      settings.values['index.refresh_interval'] = '10s';
      expect(settings.getUpdatable()).toEqual({'index.refresh_interval': '10s'});
    });

    it('treats a whitespace-only value as unset', () => {
      const settings = new EditableIndexSettings({});
      settings.values['index.refresh_interval'] = '   ';
      expect(settings.getUpdatable()).toEqual({});
    });
  });

  it('identifies the create-time settings', () => {
    expect(STATIC_INDEX_SETTINGS).toEqual(['index.codec']);
    expect(EditableIndexSettings.isStatic('index.codec')).toBe(true);
    expect(EditableIndexSettings.isStatic('index.number_of_replicas')).toBe(false);
  });
});
