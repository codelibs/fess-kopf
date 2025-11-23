# Fess KOPF Tests

This directory contains the test suite for Fess KOPF, ensuring robust OpenSearch 2.x/3.x support.

## Test Structure

### Jest Tests (Node.js 20+)

The project uses Jest for modern JavaScript testing with the following test files:

#### Core Functionality Tests

1. **`version.test.js`** - Version Detection and Comparison
   - OpenSearch version parsing (2.x, 3.x, 4.x+)
   - Version comparison logic
   - Distribution parameter handling
   - Edge cases and error handling
   - Future version compatibility
   - **73 test cases**

2. **`util.test.js`** - Utility Functions
   - `isDefined()` function tests
   - `notEmpty()` function tests
   - `getProperty()` function tests
   - `readablizeBytes()` function tests
   - **22 test cases**

3. **`external_settings.test.js`** - Configuration Service
   - OpenSearch host configuration
   - Root path settings (opensearch_root_path vs elasticsearch_root_path)
   - Backward compatibility with Elasticsearch naming
   - Theme and refresh rate settings
   - Migration scenarios
   - Edge case handling
   - **29 test cases**

4. **`opensearch_integration.test.js`** - Integration Tests
   - Service integration between ExternalSettingsService and OpenSearchService
   - Configuration precedence testing
   - Docker environment compatibility
   - Default configuration validation
   - Method deprecation strategy
   - Real-world usage scenarios
   - **19 test cases**

**Total: 143+ test cases covering critical functionality**

### Jasmine Tests (Legacy)

Located in `tests/jasmine/`, these are older AngularJS-specific tests that complement the Jest tests:

- Service tests (external_settings, opensearch, etc.)
- Controller tests
- Directive tests
- Filter tests

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

- ✅ **OpenSearch 3 Support**: Comprehensive version detection and comparison
- ✅ **Configuration Management**: Settings precedence and backward compatibility
- ✅ **Migration Scenarios**: Smooth upgrade path from Elasticsearch to OpenSearch naming
- ✅ **Edge Cases**: Null/undefined handling, invalid inputs, boundary conditions
- ✅ **Integration**: Service interaction and Docker deployment scenarios

## Key Test Scenarios

### OpenSearch 3 Version Detection

```javascript
// Tests verify proper detection of OpenSearch 3.x
const version = new Version('3.0.0');
expect(version.isOpenSearch3OrLater()).toBe(true);
expect(version.isOpenSearch2OrLater()).toBe(true);
```

### Backward Compatibility

```javascript
// Old elasticsearch_root_path still works
service.settings = {
  elasticsearch_root_path: '/es'
};
expect(service.getOpenSearchRootPath()).toBe('/es');

// New opensearch_root_path takes precedence
service.settings = {
  opensearch_root_path: '/opensearch',
  elasticsearch_root_path: '/old'
};
expect(service.getOpenSearchRootPath()).toBe('/opensearch');
```

### Migration Testing

```javascript
// Tests ensure smooth transition
// From: elasticsearch_root_path
// To: opensearch_root_path
// While maintaining full backward compatibility
```

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

## Test Quality Standards

- **Coverage**: Aim for comprehensive coverage of critical paths
- **Clarity**: Tests should be self-documenting
- **Independence**: Each test should be independent and isolated
- **Speed**: Tests should run quickly (< 5 seconds for full suite)
- **Reliability**: Tests should not be flaky or dependent on timing

## OpenSearch Version Support Matrix

Our tests verify compatibility with:

| OpenSearch Version | Support Status | Test Coverage |
|-------------------|----------------|---------------|
| 2.0.x - 2.17.x    | ✅ Supported   | Comprehensive |
| 3.0.x - 3.x.x     | ✅ Supported   | Comprehensive |
| 4.x.x+            | ✅ Future-proof| Basic         |

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
