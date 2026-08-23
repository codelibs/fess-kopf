# Fess KOPF Tests

This directory contains the test suite for Fess KOPF, ensuring robust OpenSearch 2.x/3.x support.

## Test Structure

### Jest Tests (Node.js 20+)

The project uses Jest for all JavaScript testing. `jest.config.js` matches
`**/tests/**/*.test.js`, so every file listed below is the only thing that
actually runs; there is no other test runner in this project.

As of this writing there are **24 test files** totaling **709 test cases**
(`npx jest` reports `Test Suites: 24 passed, 24 total` /
`Tests: 709 passed, 709 total`). Re-run `npx jest` after adding or removing
tests to keep these numbers current.

`tests/support/` holds helpers, not tests. Its files do not end in
`.test.js`, so `testMatch` does not pick them up.

#### Core Functionality Tests

- **`version.test.js`** - Version Detection and Comparison
  - OpenSearch version parsing (2.x, 3.x, 4.x+)
  - `isAtLeast()` comparison logic, including the equal-version boundary
  - Edge cases and error handling
  - Future version compatibility

- **`util.test.js`** - Utility Functions
  - `isDefined()`, `notEmpty()`, `getProperty()`, `readablizeBytes()`

- **`external_settings.test.js`** - Configuration Service
  - OpenSearch host and root path settings
  - Theme and refresh rate settings
  - Asserts that the legacy Elasticsearch naming
    (`getElasticsearchHost`, `getElasticsearchRootPath`) is **absent** from
    `src/kopf/services/external_settings.js` — there is no
    `elasticsearch_root_path` backward-compatibility fallback in this
    codebase, only `opensearch_root_path`

- **`opensearch_integration.test.js`** - Integration Tests
  - Service integration between `ExternalSettingsService` and
    `OpenSearchService`
  - Configuration precedence testing
  - Docker environment compatibility

- **`alerts.test.js`** - Alerts service, including that alerts created in
  the same millisecond get distinct ids

- **`services/opensearch-cluster-request.test.js`** - `clusterRequest`'s
  callback contract, using the harness described below

#### Filters

- **`filters/bytes.test.js`**, **`filters/time-interval.test.js`**

#### Models

- **`models/alias-filter.test.js`**, **`models/index-filter.test.js`**,
  **`models/index-template-filter.test.js`**, **`models/node-filter.test.js`**,
  **`models/paginator.test.js`**, **`models/query_dsl_completer.test.js`**,
  **`models/snapshot-filter.test.js`**

#### OpenSearch Service Tests

- **`opensearch/cluster-changes.test.js`**,
  **`opensearch/cluster-closed-index.test.js`**,
  **`opensearch/cluster-partial.test.js`**,
  **`opensearch/editable-index-settings.test.js`**,
  **`opensearch/index.test.js`**, **`opensearch/node.test.js`**,
  **`opensearch/repository.test.js`**, **`opensearch/shard.test.js`**,
  **`opensearch/broken-cluster.test.js`**

#### Test Support

- **`support/angular-service.js`** - not a test. Evaluates `src/kopf`
  sources with a stubbed `kopf` module object and returns the registration
  arrays they hand it, so an AngularJS factory can be mounted on a real
  injector without extracting its body with a regular expression. Use it
  for any further service or controller tests.

There is no other test tree. The Jasmine specs and QUnit harness that used
to live under `tests/` (`tests/jasmine/**`, `tests/all.html`,
`tests/qunit.*`, `tests/karma.config.js`, and their supporting model/mock
files) never ran under Jest's `testMatch` and were deleted along with the
Grunt `qunit`/`karma` tasks that referenced them.

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npx jest tests/version.test.js
```

### Watch Mode (for development)
```bash
npx jest --watch
```

## Test Coverage

The Jest tests focus on:

- **OpenSearch 3 Support**: Version detection and comparison
- **Configuration Management**: Settings precedence, and confirming legacy
  Elasticsearch naming has been removed rather than kept for compatibility
- **Edge Cases**: Null/undefined handling, invalid inputs, boundary conditions
- **Integration**: Service interaction and Docker deployment scenarios

## Requirements

- **Node.js**: >= 20.0.0
- **Jest**: ^29.7.0

## Adding New Tests

When adding new tests:

1. Use descriptive test names that explain what is being tested
2. Group related tests using `describe()` blocks
3. Test both success and failure cases
4. Include edge cases and boundary conditions
5. Follow the existing test structure and naming conventions
6. Update the file/test counts in this README if they change

### Example Test Structure

```javascript
describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    test('should do something specific', () => {
      // Arrange
      const input = setupInput();

      // Act
      const result = performAction(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

## Continuous Integration

Tests are automatically run on:
- Pull requests
- Commits to main branches
- Release builds

All tests must pass before code can be merged.

## Debugging Tests

### Run with verbose output
```bash
npm test -- --verbose
```

### Run specific test pattern
```bash
npm test -- --testNamePattern="OpenSearch 3"
```

### Debug in VS Code
Add this configuration to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## Contributing

When contributing new features:

1. Write tests first (TDD approach recommended)
2. Ensure all existing tests pass
3. Add tests for edge cases
4. Update this README if adding new test files
5. Run `npm run test:coverage` to check coverage

## License

Same as the main project (MIT License).
