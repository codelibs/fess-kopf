# Fess KOPF

[![Test](https://github.com/codelibs/fess-kopf/actions/workflows/test.yml/badge.svg)](https://github.com/codelibs/fess-kopf/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Fess KOPF is a simple web administration tool for OpenSearch, integrated with [Fess](https://fess.codelibs.org/). Built with JavaScript + AngularJS + jQuery + Bootstrap.

## Overview

This project is a fork of [elasticsearch-kopf](https://github.com/lmenezes/elasticsearch-kopf), customized specifically for Fess and adapted to work exclusively with OpenSearch 2.x and 3.x.

## Supported Versions

| OpenSearch | Fess     | Status     |
|-----------|----------|------------|
| 2.x       | 15.x     | Supported  |
| 3.x       | 15.x     | Supported  |

**Note**: This tool supports OpenSearch only and does not support Elasticsearch.

## Key Features

- **Cluster Overview**: Real-time monitoring of cluster state, nodes, and indices
- **Index Management**: Create, delete, open, close indices and modify settings
- **Alias Management**: Create and manage index aliases
- **Snapshots**: Create, restore, and manage snapshots
- **Index Templates**: Create and edit index templates
- **Analyzer Testing**: Test and validate text analysis
- **REST Client**: Direct access to OpenSearch API
- **CAT API**: Browser-based interface for CAT API
- **Hot Threads Analysis**: Node thread analysis

## Removed Features

The following features have been removed as they are not supported in OpenSearch 2.x/3.x:

- Percolator queries (deprecated in Elasticsearch 5.x)
- Index warmers (deprecated in Elasticsearch 5.x)
- Benchmark API (removed in Elasticsearch 5.x)

## Installation

### Development Setup

```bash
# Clone the repository
git clone https://github.com/codelibs/fess-kopf.git
cd fess-kopf

# Install dependencies
npm install

# Build
npm run build
```

### Development Server

```bash
npm install
grunt server
```

Open your browser and navigate to <http://localhost:9000/_site>.

## Integration with Fess

Fess KOPF is designed to be integrated directly into Fess. The built files in the `_site/` directory are served through Fess's web interface.

Access the KOPF interface through your Fess instance at:

```
http://your-fess-instance/_plugin/kopf/
```

## Configuration

Configure Fess KOPF using the `kopf_external_settings.json` file:

```json
{
  "opensearch_root_path": "",
  "with_credentials": false,
  "theme": "fess",
  "refresh_rate": 5000
}
```

### Configuration Options

- **opensearch_root_path**: OpenSearch root path (default: "")
- **with_credentials**: Include credentials in cross-origin requests (default: false)
- **theme**: UI theme (`fess`, `light`, `dark`)
- **refresh_rate**: Cluster information refresh interval in milliseconds

### Themes

- `fess` (default) - Fess-themed interface
- `light` - Light theme
- `dark` - Dark theme

## Development

### Build

```bash
# Production build
npm run build

# Development server with hot reload
grunt server
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint
```

### Project Structure

```
fess-kopf/
├── src/
│   ├── kopf/
│   │   ├── opensearch/      # OpenSearch-related models
│   │   ├── controllers/     # AngularJS controllers
│   │   ├── services/        # AngularJS services
│   │   ├── models/          # Data models
│   │   ├── filters/         # AngularJS filters
│   │   ├── directives/      # AngularJS directives
│   │   └── css/             # Stylesheets
│   └── lib/                 # Third-party libraries
├── _site/                   # Build output
├── tests/                   # Test files
└── Gruntfile.js             # Build configuration
```

## Usage

### Connecting to Cluster

1. Access KOPF through Fess
2. Automatically connects to OpenSearch cluster
3. Cluster state is displayed on the dashboard

### Index Management

1. Click on the "cluster" tab to view cluster overview
2. Click on an index to view details
3. Select an operation from the right-click menu:
   - Open/Close
   - Delete
   - Refresh
   - Optimize (Force Merge)
   - Clear Cache

### Creating an Index

1. Select "more" → "create index"
2. Enter index name
3. Set number of shards and replicas
4. Optionally add mappings and settings
5. Click "Create"

### Creating a Snapshot

1. Select "more" → "snapshot"
2. Create a repository (first time only)
3. Click "Create Snapshot"
4. Select snapshot name and target indices
5. Click "Create"

### Using the REST API

1. Select the "rest" tab
2. Choose HTTP method (GET, POST, PUT, DELETE)
3. Enter API path (e.g., `_search`, `_cat/indices`)
4. Enter request body (optional)
5. Click "Send Request"

## Troubleshooting

### Connection Errors

If you cannot connect to OpenSearch:

1. Verify OpenSearch is running
2. Check network settings
3. Verify CORS settings (in OpenSearch's `opensearch.yml`):
   ```yaml
   http.cors.enabled: true
   http.cors.allow-origin: "*"
   ```

### Performance Issues

If cluster information loads slowly:

1. Increase refresh rate (adjust `refresh_rate` in settings)
2. For large clusters, check browser memory

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- Original [elasticsearch-kopf](https://github.com/lmenezes/elasticsearch-kopf) by Leonardo Menezes
- OpenSearch adaptation and Fess integration by [CodeLibs Project](https://www.codelibs.org/)

## Related Links

- [Fess](https://fess.codelibs.org/) - Enterprise Search Server
- [OpenSearch](https://opensearch.org/) - Open Source Search Engine
- [CodeLibs](https://www.codelibs.org/) - Fess Development Project
