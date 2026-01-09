# Test Coverage Analysis for Fess KOPF

## Executive Summary

The current test coverage for the Fess KOPF codebase is **effectively 0%** according to Jest's coverage report. This document analyzes the root causes and proposes prioritized areas for improvement.

## Current State

### Test Framework Status

| Framework | Location | Status | Files |
|-----------|----------|--------|-------|
| Jest | `tests/*.test.js` | ✅ Running | 4 test files |
| Karma/Jasmine | `tests/jasmine/*.tests.js` | ❌ Not Running | 20+ test files |

### Why Coverage Shows 0%

1. **Jest tests don't import source files**: The 4 Jest test files (`util.test.js`, `version.test.js`, `external_settings.test.js`, `opensearch_integration.test.js`) test functionality in isolation or mock behavior rather than importing the actual source files from `src/kopf/`.

2. **Legacy Jasmine tests are disconnected**: The Karma/Jasmine tests in `tests/jasmine/` reference **legacy Elasticsearch naming** (e.g., `ElasticService` instead of `OpenSearchService`, `getElasticsearchRootPath` instead of `getOpenSearchRootPath`). These tests are not compatible with the current codebase.

3. **Karma is not integrated with npm test**: Running `npm test` only executes Jest, not Karma.

## Coverage Gaps by Priority

### 🔴 Critical Priority (Core functionality, 0% coverage)

#### 1. OpenSearch Service (`src/kopf/services/opensearch.js` - 984 lines)
The main service handling all OpenSearch API communications. No working tests.

**Missing tests for:**
- Connection handling (`connect()`, `reset()`, `isConnected()`)
- Cluster state management (`refresh()`, `autoRefreshCluster()`)
- Index operations (`createIndex()`, `deleteIndex()`, `openIndex()`, `closeIndex()`)
- Shard operations (`relocateShard()`, `getShardStats()`)
- Snapshot/repository operations
- Error handling and edge cases

#### 2. Cluster Model (`src/kopf/opensearch/cluster.js` - 203 lines)
Represents the OpenSearch cluster state. No tests.

**Missing tests for:**
- Cluster initialization from API responses
- Change detection (`computeChanges()`)
- Shard routing logic
- Index/node aggregation

#### 3. Cluster Overview Controller (`src/kopf/controllers/cluster_overview.js` - 429 lines)
The main UI controller. Has legacy tests that don't run.

**Missing tests for:**
- Index pagination and filtering
- Node filtering
- Shard relocation UI logic
- Bulk operations (close/open/delete multiple indices)

### 🟠 High Priority (Key features, 0% coverage)

#### 4. Snapshot Controller (`src/kopf/controllers/snapshot.js` - 240 lines)
No tests at all. Handles backup/restore functionality.

#### 5. REST Controller (`src/kopf/controllers/rest.js` - 198 lines)
No tests. Handles manual REST API requests.

#### 6. External Settings Service (`src/kopf/services/external_settings.js` - 134 lines)
Has some Jest tests but coverage is incomplete.

#### 7. All OpenSearch Models (`src/kopf/opensearch/*.js`)
- `index.js`, `node.js`, `shard.js` - No tests
- `alias.js`, `repository.js`, `snapshot.js` - No tests
- `version.js` - Has Jest tests but not integrated with source

### 🟡 Medium Priority (Supporting functionality)

#### 8. Filter Models (`src/kopf/models/*.js`)
- `index_filter.js` (99 lines) - Has legacy tests
- `node_filter.js` (51 lines) - Has legacy tests
- `paginator.js` (90 lines) - Has legacy tests
- `url_autocomplete.js` (132 lines) - Has legacy tests
- Other filters - No tests

#### 9. Other Controllers
- `aliases.js` (157 lines) - Legacy tests only
- `analysis.js` (113 lines) - Legacy tests only
- `index_templates.js` (104 lines) - Legacy tests only
- `warmers.js` (100 lines) - Legacy tests only

#### 10. AngularJS Filters (`src/kopf/filters/*.js`)
- `bytes.js`, `time_interval.js`, `starts_with.js` - Legacy tests only

### 🟢 Lower Priority (UI components)

#### 11. Directives (`src/kopf/directives/*.js`)
- `navbar_section.js` - Legacy tests
- `json_tree.js`, `pagination.js`, `sort_table.js` - No tests

## Recommended Action Plan

### Phase 1: Fix Test Infrastructure
1. **Migrate legacy Jasmine tests to Jest** or configure both frameworks to run
2. **Update legacy tests** to use new OpenSearch naming conventions
3. **Configure Jest to properly import source files** for coverage measurement

### Phase 2: Add Critical Tests

#### OpenSearch Service Tests (Highest ROI)
```javascript
// tests/services/opensearch.test.js
describe('OpenSearchService', () => {
  describe('connection management', () => {
    it('should connect to OpenSearch cluster');
    it('should handle connection errors');
    it('should auto-refresh cluster state');
  });

  describe('index operations', () => {
    it('should create an index');
    it('should delete an index');
    it('should open/close indices');
  });

  describe('cluster operations', () => {
    it('should enable/disable shard allocation');
    it('should relocate shards');
  });
});
```

#### Cluster Model Tests
```javascript
// tests/opensearch/cluster.test.js
describe('Cluster', () => {
  it('should parse cluster health response');
  it('should detect node joins/leaves');
  it('should detect index creation/deletion');
  it('should compute shard allocation');
});
```

### Phase 3: Improve Controller Coverage
- Add integration tests for key user workflows
- Test error handling paths
- Test edge cases (empty clusters, disconnected state)

### Phase 4: Expand Model Coverage
- Add unit tests for all model classes
- Test serialization/deserialization
- Test validation logic

## Specific Test Cases to Add

### Connection Handling
- [ ] Test connecting with valid credentials
- [ ] Test connecting with invalid URL
- [ ] Test reconnection after network failure
- [ ] Test handling of 503 (no master) responses

### Index Operations
- [ ] Test creating index with settings
- [ ] Test deleting index
- [ ] Test opening/closing indices
- [ ] Test refreshing index
- [ ] Test clearing cache
- [ ] Test force merge (optimize)

### Snapshot Operations
- [ ] Test creating repository
- [ ] Test creating snapshot
- [ ] Test restoring snapshot
- [ ] Test deleting snapshot/repository

### Error Handling
- [ ] Test handling of network timeouts
- [ ] Test handling of authentication failures
- [ ] Test handling of malformed responses
- [ ] Test handling of OpenSearch errors

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Line Coverage | 0% | 60%+ |
| Branch Coverage | 0% | 50%+ |
| Function Coverage | 0% | 70%+ |
| Test Files | 4 | 20+ |
| Test Cases | 91 | 300+ |

## Quick Wins

1. **Add source imports to existing Jest tests** - This alone will increase measured coverage
2. **Convert 3-5 legacy Jasmine tests to Jest** - Start with simpler ones like filters
3. **Add tests for utility functions** - `util.js` is well-contained and easy to test
4. **Add version compatibility tests** - Critical for OpenSearch 2.x/3.x support

## Conclusion

The test coverage situation requires significant investment but can be improved incrementally. The priority should be:

1. Fix the test infrastructure to get accurate measurements
2. Focus on the OpenSearch service (highest impact)
3. Add tests for cluster state management
4. Expand to controllers and models

A reasonable target would be **60% line coverage within 3 months** of focused effort, prioritizing the critical paths identified above.
