/**
 * Tests for Repository class
 * Tests repository data model for snapshot management
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load Repository
const repositoryCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/opensearch/repository.js'),
  'utf8'
);
eval(repositoryCode);

describe('Repository', () => {

  describe('initialization', () => {
    test('should set name, type, and settings', () => {
      const repo = new Repository('my-repo', {
        type: 'fs',
        settings: {location: '/backups'}
      });
      expect(repo.name).toBe('my-repo');
      expect(repo.type).toBe('fs');
      expect(repo.settings).toEqual({location: '/backups'});
    });

    test('should handle empty settings', () => {
      const repo = new Repository('empty', {
        type: 'fs',
        settings: {}
      });
      expect(repo.settings).toEqual({});
    });
  });

  describe('asJson', () => {

    describe('fs type', () => {
      test('should serialize fs settings', () => {
        const repo = new Repository('fs-repo', {
          type: 'fs',
          settings: {
            location: '/data/backups',
            chunk_size: '1g',
            compress: 'true'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.type).toBe('fs');
        expect(json.settings.location).toBe('/data/backups');
        expect(json.settings.chunk_size).toBe('1g');
        expect(json.settings.compress).toBe('true');
      });

      test('should include all fs settings', () => {
        const repo = new Repository('fs-repo', {
          type: 'fs',
          settings: {
            location: '/backups',
            chunk_size: '10m',
            max_restore_bytes_per_sec: '40mb',
            max_snapshot_bytes_per_sec: '40mb',
            compress: 'true'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings).toEqual({
          location: '/backups',
          chunk_size: '10m',
          max_restore_bytes_per_sec: '40mb',
          max_snapshot_bytes_per_sec: '40mb',
          compress: 'true'
        });
      });

      test('should exclude unknown settings', () => {
        const repo = new Repository('fs-repo', {
          type: 'fs',
          settings: {
            location: '/backups',
            unknown_setting: 'value'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings.location).toBe('/backups');
        expect(json.settings.unknown_setting).toBeUndefined();
      });
    });

    describe('url type', () => {
      test('should serialize url settings', () => {
        const repo = new Repository('url-repo', {
          type: 'url',
          settings: {url: 'http://example.com/snapshots'}
        });
        const json = JSON.parse(repo.asJson());
        expect(json.type).toBe('url');
        expect(json.settings).toEqual({
          url: 'http://example.com/snapshots'
        });
      });
    });

    describe('s3 type', () => {
      test('should serialize s3 settings with client', () => {
        const repo = new Repository('s3-repo', {
          type: 's3',
          settings: {
            client: 'secondary',
            region: 'us-west-2',
            bucket: 'my-bucket',
            base_path: 'snapshots'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.type).toBe('s3');
        expect(json.settings.client).toBe('secondary');
        expect(json.settings.region).toBe('us-west-2');
        expect(json.settings.bucket).toBe('my-bucket');
        expect(json.settings.base_path).toBe('snapshots');
      });

      test('should omit client when not provided', () => {
        const repo = new Repository('s3-repo', {
          type: 's3',
          settings: {
            bucket: 'my-bucket'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings.client).toBeUndefined();
        expect(json.settings.bucket).toBe('my-bucket');
      });

      test('should include all s3 settings', () => {
        const repo = new Repository('s3-full', {
          type: 's3',
          settings: {
            client: 'my-client',
            region: 'eu-west-1',
            bucket: 'backup-bucket',
            base_path: 'path/to/snapshots',
            access_key: 'AKID',
            secret_key: 'SECRET',
            chunk_size: '100m',
            max_retries: '5',
            compress: 'true',
            server_side_encryption: 'true'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings).toEqual({
          client: 'my-client',
          region: 'eu-west-1',
          bucket: 'backup-bucket',
          base_path: 'path/to/snapshots',
          access_key: 'AKID',
          secret_key: 'SECRET',
          chunk_size: '100m',
          max_retries: '5',
          compress: 'true',
          server_side_encryption: 'true'
        });
      });

      test('should exclude unknown s3 settings', () => {
        const repo = new Repository('s3-repo', {
          type: 's3',
          settings: {
            bucket: 'my-bucket',
            unknown_field: 'value'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings.unknown_field).toBeUndefined();
      });
    });

    describe('hdfs type', () => {
      test('should serialize hdfs settings', () => {
        const repo = new Repository('hdfs-repo', {
          type: 'hdfs',
          settings: {
            uri: 'hdfs://namenode:8020',
            path: '/snapshots',
            compress: 'true'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.type).toBe('hdfs');
        expect(json.settings.uri).toBe('hdfs://namenode:8020');
        expect(json.settings.path).toBe('/snapshots');
        expect(json.settings.compress).toBe('true');
      });
    });

    describe('azure type', () => {
      test('should serialize azure settings with client', () => {
        const repo = new Repository('azure-repo', {
          type: 'azure',
          settings: {
            client: 'secondary_account',
            container: 'my-container',
            base_path: 'snapshots'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.type).toBe('azure');
        expect(json.settings.client).toBe('secondary_account');
        expect(json.settings.container).toBe('my-container');
        expect(json.settings.base_path).toBe('snapshots');
      });

      test('should omit client when not provided', () => {
        const repo = new Repository('azure-repo', {
          type: 'azure',
          settings: {
            container: 'my-container'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings.client).toBeUndefined();
        expect(json.settings.container).toBe('my-container');
      });

      test('should include all azure settings', () => {
        const repo = new Repository('azure-full', {
          type: 'azure',
          settings: {
            client: 'billing_account',
            container: 'backup-container',
            base_path: 'path/to/snapshots',
            concurrent_streams: '10',
            chunk_size: '32m',
            compress: 'true'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings).toEqual({
          client: 'billing_account',
          container: 'backup-container',
          base_path: 'path/to/snapshots',
          concurrent_streams: '10',
          chunk_size: '32m',
          compress: 'true'
        });
      });

      test('should exclude unknown azure settings', () => {
        const repo = new Repository('azure-repo', {
          type: 'azure',
          settings: {
            container: 'my-container',
            unknown_setting: 'value'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings.unknown_setting).toBeUndefined();
      });
    });

    describe('empty settings handling', () => {
      test('should omit empty string settings', () => {
        const repo = new Repository('azure-repo', {
          type: 'azure',
          settings: {
            client: '',
            container: 'my-container'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings.client).toBeUndefined();
        expect(json.settings.container).toBe('my-container');
      });

      test('should omit undefined settings', () => {
        const repo = new Repository('s3-repo', {
          type: 's3',
          settings: {
            client: undefined,
            bucket: 'my-bucket'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings.client).toBeUndefined();
        expect(json.settings.bucket).toBe('my-bucket');
      });

      test('should omit null settings', () => {
        const repo = new Repository('s3-repo', {
          type: 's3',
          settings: {
            client: null,
            bucket: 'my-bucket'
          }
        });
        const json = JSON.parse(repo.asJson());
        expect(json.settings.client).toBeUndefined();
      });
    });

    describe('unknown type', () => {
      test('should return json without settings', () => {
        const repo = new Repository('unknown-repo', {
          type: 'gcs',
          settings: {bucket: 'my-bucket'}
        });
        const json = JSON.parse(repo.asJson());
        expect(json.type).toBe('gcs');
        expect(json.settings).toBeUndefined();
      });
    });
  });

  describe('validate', () => {
    test('should throw when name is empty', () => {
      const repo = new Repository('', {
        type: 'fs',
        settings: {location: '/backups'}
      });
      expect(() => repo.validate())
        .toThrow('Repository name is required');
    });

    test('should throw when type is empty', () => {
      const repo = new Repository('my-repo', {
        type: '',
        settings: {}
      });
      expect(() => repo.validate())
        .toThrow('Repository type is required');
    });

    test('should throw when fs location is missing', () => {
      const repo = new Repository('fs-repo', {
        type: 'fs',
        settings: {}
      });
      expect(() => repo.validate())
        .toThrow('location is required for snapshot of type fs');
    });

    test('should throw when url is missing', () => {
      const repo = new Repository('url-repo', {
        type: 'url',
        settings: {}
      });
      expect(() => repo.validate())
        .toThrow('url is required for snapshot of type url');
    });

    test('should throw when s3 bucket is missing', () => {
      const repo = new Repository('s3-repo', {
        type: 's3',
        settings: {client: 'my-client'}
      });
      expect(() => repo.validate())
        .toThrow('bucket is required for snapshot of type s3');
    });

    test('should throw when hdfs path is missing', () => {
      const repo = new Repository('hdfs-repo', {
        type: 'hdfs',
        settings: {}
      });
      expect(() => repo.validate())
        .toThrow('path is required for snapshot of type hdfs');
    });

    test('should pass for valid fs repository', () => {
      const repo = new Repository('fs-repo', {
        type: 'fs',
        settings: {location: '/backups'}
      });
      expect(() => repo.validate()).not.toThrow();
    });

    test('should pass for valid s3 repository with client', () => {
      const repo = new Repository('s3-repo', {
        type: 's3',
        settings: {client: 'secondary', bucket: 'my-bucket'}
      });
      expect(() => repo.validate()).not.toThrow();
    });

    test('should pass for valid s3 repository without client', () => {
      const repo = new Repository('s3-repo', {
        type: 's3',
        settings: {bucket: 'my-bucket'}
      });
      expect(() => repo.validate()).not.toThrow();
    });

    test('should pass for azure repository (no required fields)', () => {
      const repo = new Repository('azure-repo', {
        type: 'azure',
        settings: {}
      });
      expect(() => repo.validate()).not.toThrow();
    });

    test('should pass for azure repository with client', () => {
      const repo = new Repository('azure-repo', {
        type: 'azure',
        settings: {client: 'billing_account', container: 'snaps'}
      });
      expect(() => repo.validate()).not.toThrow();
    });

    test('should not require client for s3', () => {
      const repo = new Repository('s3-repo', {
        type: 's3',
        settings: {bucket: 'my-bucket'}
      });
      expect(() => repo.validate()).not.toThrow();
    });

    test('should not require client for azure', () => {
      const repo = new Repository('azure-repo', {
        type: 'azure',
        settings: {container: 'my-container'}
      });
      expect(() => repo.validate()).not.toThrow();
    });
  });

  describe('getSettings', () => {
    test('should return only specified settings', () => {
      const repo = new Repository('test', {
        type: 'fs',
        settings: {
          location: '/backups',
          compress: 'true',
          extra: 'ignored'
        }
      });
      const result = repo.getSettings(['location', 'compress']);
      expect(result).toEqual({
        location: '/backups',
        compress: 'true'
      });
      expect(result.extra).toBeUndefined();
    });

    test('should skip empty values', () => {
      const repo = new Repository('test', {
        type: 'fs',
        settings: {
          location: '/backups',
          compress: ''
        }
      });
      const result = repo.getSettings(
        ['location', 'compress']
      );
      expect(result).toEqual({location: '/backups'});
    });

    test('should skip undefined values', () => {
      const repo = new Repository('test', {
        type: 'fs',
        settings: {location: '/backups'}
      });
      const result = repo.getSettings(
        ['location', 'chunk_size']
      );
      expect(result).toEqual({location: '/backups'});
    });

    test('should return empty object for no matches', () => {
      const repo = new Repository('test', {
        type: 'fs',
        settings: {}
      });
      const result = repo.getSettings(['location']);
      expect(result).toEqual({});
    });
  });
});
