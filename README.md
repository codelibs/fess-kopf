Fess KOPF
=======================

Fess KOPF is a simple web administration tool for [OpenSearch](https://opensearch.org/) written in JavaScript + AngularJS + jQuery + Bootstrap.

This is a fork of [elasticsearch-kopf](https://github.com/lmenezes/elasticsearch-kopf) maintained for [Fess](https://fess.codelibs.org/), adapted to work with OpenSearch 2.x and 3.x.

It offers an easy way of performing common tasks on an OpenSearch cluster. Not every single API is covered by this plugin, but it does offer a REST client which allows you to explore the full potential of the OpenSearch API.

## Supported Versions

| OpenSearch version | Fess version | Status     |
| ------------------ | ------------ | ---------- |
| 2.x                | Fess 15.x    | Supported  |
| 3.x                | Fess 15.x    | Supported  |

## Changes from Original KOPF

- Updated dependencies (Grunt, Karma, etc.) to latest versions
- Added OpenSearch 2.x and 3.x support
- Removed deprecated features (Percolator, Warmers, Benchmark)
- Optimized for use with Fess

## Installation

### Building from Source

```bash
git clone https://github.com/codelibs/fess-kopf.git
cd fess-kopf
npm install
grunt build
```

### Development Server

```bash
npm install
grunt server
```

Browse to <http://localhost:9000/_site>.

### Integration with Fess

Fess KOPF is designed to be integrated directly into Fess. The built files in `_site/` directory can be served through Fess's web interface.

Simply access the KOPF interface through your Fess instance at:
```
http://your-fess-instance/_plugin/kopf/
```

## Configuration

You can configure Fess KOPF using `kopf_external_settings.json`:

```json
{
  "elasticsearch_root_path": "",
  "with_credentials": false,
  "theme": "fess",
  "refresh_rate": 5000
}
```

Available themes:
- `fess` (default) - Fess-themed interface
- `light` - Light theme
- `dark` - Dark theme

## Features

- Cluster overview and monitoring
- Index management (create, delete, open, close)
- Alias management
- Snapshot and restore operations
- Index template management
- Analysis tools
- REST client
- CAT API browser
- Hot threads analysis

## Removed Features (OpenSearch Incompatibility)

The following features from the original KOPF have been removed as they are not supported in OpenSearch 2.x/3.x:

- Percolator queries (deprecated in Elasticsearch 5.x)
- Index warmers (deprecated in Elasticsearch 5.x)
- Benchmark API (removed in Elasticsearch 5.x)

Screenshots
------------
####cluster overview
![cluster overview](imgs/cluster_view.png)

####header reflects cluster state
![cluster state](imgs/cluster_state.png)

####REST Client
![rest client](imgs/rest_client.png)

####aliases management
![aliases management](imgs/aliases.png)

####warmers management
![warmers management](imgs/warmer.png)

####percolator
![percolator](imgs/percolator.png)

####snapshots management
![snapshots management](imgs/snapshot.png)

####analysis api
![analysis api](imgs/analysis.png)
