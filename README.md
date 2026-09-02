# Fess KOPF

[![Test](https://github.com/codelibs/fess-kopf/actions/workflows/test.yml/badge.svg)](https://github.com/codelibs/fess-kopf/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Fess KOPF is a simple web administration tool for OpenSearch, integrated with [Fess](https://fess.codelibs.org/). Built with Vue 3, Vite, TypeScript and Naive UI.

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
- **Fess indices are named, not just listed**: every index carries what it is
  to Fess -- `document`, `suggest`, `config`, `user`, `log`, `crawler`,
  `plugin` -- and the live document index is marked `search` and `update`
  after the aliases bound to it, so a generation that has been rotated out is
  visible at a glance. A `Fess` filter hides everything the cluster is not
  running Fess with
- **Index Management**: Create, delete, open, close indices and modify settings
- **Alias Management**: Create and manage index aliases
- **Snapshots**: Create, restore, and manage snapshots
- **Index Templates**: create and edit all three kinds -- `component` and
  `index`, the composable pair current OpenSearch documents, and the
  deprecated `legacy` `_template` endpoint an older cluster still carries
- **Analyzer Testing**: tokenise text by field, by named analyzer, or by a
  chain you compose out of a tokenizer, filters and char filters -- with or
  without an index. With `explain` on, every stage of the chain is shown in
  the order it ran, and the stage that dropped or added tokens is the one
  carrying a count, which is what answers "why did this query stop
  matching". Tokens come with their type, position and offsets
- **REST Client**: Direct access to OpenSearch API, with query DSL completion
  in the body editor -- keys, closed value sets, and field names from the
  mapping of the indices the path addresses
- **CAT API**: browser interface for the `_cat` APIs. The list is whatever
  the cluster publishes at `GET /_cat` rather than a set pinned to one
  OpenSearch version, so `thread_pool`, `shards`, `allocation`, `segments`
  and the rest are there when the cluster has them
- **Tasks**: what the cluster is running right now, longest-running first,
  with a cancel for the tasks that report themselves cancellable -- a force
  merge started here, or the reindex behind a Fess index rotation
- **Allocation explanations**: when shards are unassigned, the cluster
  overview can ask OpenSearch why, decider by decider
- **Top queries**: the searches the cluster spent the most on, from the Query
  Insights plugin, ranked by latency, CPU or memory, with the query DSL each
  one ran. Offered only when the plugin is installed
- **k-NN**: the vector cache behind semantic search -- whether the circuit
  breaker has tripped, how much graph memory each node holds, and which
  indices are loaded. Offered only when the plugin is installed
- **Hot Threads Analysis**: Node thread analysis
- **Localized interface**: follows the language the Fess admin console
  resolved for the request, in all sixteen locales Fess ships

## Removed Features

The following features have been removed as they are not supported in OpenSearch 2.x/3.x:

- Percolator queries (deprecated in Elasticsearch 5.x)
- Index warmers (deprecated in Elasticsearch 5.x)
- Benchmark API (removed in Elasticsearch 5.x)
- Public GitHub Gist sharing of cluster state (removed for security)
- Cluster health and cluster settings screens: nothing in the interface ever
  linked to them, and both failed against a default OpenSearch install

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
npm run dev
```

Open the address Vite prints. Set `location` in
`app/public/kopf_external_settings.json` to your cluster, for example
`http://localhost:9200`, since there is no Fess in front of it to proxy the
requests.

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
  "location": "",
  "opensearch_root_path": "",
  "with_credentials": false,
  "theme": "fess",
  "refresh_rate": 5000
}
```

### Configuration Options

- **location**: OpenSearch host URL. Leave empty when kopf is served by
  Fess; set it only for local development, for example
  `http://localhost:9200` when running `npm run dev`.
- **opensearch_root_path**: OpenSearch root path (default: "")
- **with_credentials**: Include credentials in cross-origin requests (default: false)
- **theme**: UI theme (`fess`, `light`, `dark`)
- **refresh_rate**: Cluster information refresh interval in milliseconds

### Themes

- `fess` (default) - light interface
- `light` - light interface
- `dark` - dark interface

`dark` selects the dark palette; `fess` and `light` are both the light one.

The palette is deliberately not a free choice. kopf renders inside an iframe in
the Fess admin dashboard, so the canvas (`#f4f6f9`), the dark chrome (`#343a40`)
and the semantic colours are the ones AdminLTE paints around it. Both palettes
live in `app/src/theme.ts`, which feeds Naive UI's theme overrides and the CSS
custom properties the layout layer reads, so the two cannot drift apart.

## Language

The interface renders in the language the Fess admin console resolved for the
request. Fess derives that from `Accept-Language`, or from the `browser_lang`
request parameter when one is given, and passes the result to kopf on the
iframe URL:

```
<contextPath>/admin/server_<token>/_plugin/kopf/?lang=ja
```

Sixteen locales are covered, exactly the set Fess ships a `fess_label` bundle
for: `de en es fr hi id it ja ko nl pl pt-BR ru tr zh-CN zh-TW`. Resolution
matches `java.util.ResourceBundle` -- exact tag, then the language alone, then
English -- so `ja-JP` finds Japanese while `zh` on its own falls back to
English, as it does in Fess. Without the parameter kopf uses the browser's own
preference and then English, which is what makes the bundle usable under
`npm run dev` or a plain static server.

### What is and is not translated

Translated: page headings and their explanatory lines, buttons, menu actions,
placeholders, empty states, and every alert and confirmation.

Not translated: the navigation, table headers, form field labels, cluster
status values, node roles, JSON keys and `_cat` API names. kopf is a tool for
operating OpenSearch, and an operator reads it beside the API's own responses;
translating the protocol's vocabulary would break that correspondence.

### Editing a translation

Catalogues are flat JSON in `app/src/i18n/messages/`, one file per locale, with
`en.json` as the source of truth. `en.json` also defines the key type, so a
mistyped key is a compile error. `npm test` fails if any catalogue's key set
differs from English, if a `{placeholder}` is dropped or renamed, or if a
message is left empty -- a forgotten translation is a red test, not a string
that silently renders in English.

Naive UI's own strings (the input placeholder, a select's empty state, the
pagination labels) come from its own locale, which is selected from the same
resolved tag so a form is never half English.

## Development

### Build

```bash
# Production build, into _site/
npm run build

# Development server with hot reload
npm run dev
```

`_site/` is the shipped artifact: Fess never builds this project, it downloads
a tag's zip and extracts `_site/**`. Commit `_site/` with every change; CI
fails the build if it does not match a fresh build.

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Type-check (the bundler strips types without checking them)
npm run typecheck
```

### Project Structure

```
fess-kopf/
├── app/
│   ├── index.html
│   ├── vite.config.mts
│   ├── public/           # copied verbatim into _site/
│   ├── src/
│   │   ├── api/          # location resolution, settings, HTTP, endpoints
│   │   ├── model/        # data models and formatters
│   │   ├── composables/  # shared state (cluster poll, capabilities, alerts, dialogs)
│   │   ├── components/
│   │   ├── views/        # one per route
│   │   ├── router/
│   │   ├── i18n/         # locale resolution and the sixteen catalogues
│   │   ├── theme.ts      # the palette, and Naive UI's theme overrides
│   │   └── styles.css    # layout primitives; reads theme.ts's custom properties
│   └── tests/
└── _site/                # build output; this is what ships
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

1. Select "create index"
2. Enter index name
3. Set number of shards and replicas
4. Optionally add mappings and settings
5. Click "Create"

### Creating a Snapshot

1. Select "snapshot"
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
