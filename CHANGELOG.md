# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Recognize the `cluster_manager` node role, so the current-master marker,
  the node-type classification and the master filter work against
  OpenSearch 2.x and 3.x (#16)
- Drop the removed `all=true` parameter from `_nodes/stats`, which made
  the cluster health screen fail on every load (#17)
- Stop leaking Basic credentials into error alerts and the debug log (#18)
- Make the prefilled index template body valid, so creating a template
  without editing it no longer fails (#19)
- Remove cluster and index settings that OpenSearch no longer accepts,
  and stop resending static settings such as `index.codec`, which made
  every index settings save fail on a Fess index (#20)
- Propagate the HTTP status to error callbacks, handle 401/403, and keep
  error alerts on screen long enough to read (#21)
- Tolerate an unavailable `/_cluster/settings` response instead of
  blanking every screen (#22)
- List a closed index once instead of twice, and keep its aliases (#27)

### Removed
- Public GitHub Gist sharing of cluster state (#23)
- The unreachable host history service, which stored credentials in
  localStorage in clear text (#24)
- The `?location=` query parameter; use the `location` key in
  `kopf_external_settings.json` for local development (#25)

### Changed
- Bundled Bootstrap updated from 3.0.0 to 3.4.1 (#26)

## [15.8.0] - 2026

### Changed
- Version aligned with the Fess 15.8.0 release (no functional changes since 15.7.0)

## [15.7.0] - 2026

### Changed
- Improve list implementations with filtering, sorting, and UI states (#7)

## [15.5.0] - 2025

### Added
- Comprehensive test coverage analysis (#6)

## [15.4.0] - 2025

### Added
- Version management scripts (`npm run version:set`, `version:release`, `version:snapshot`)
- GitHub Actions release workflow for automated releases
- Version aligned with Fess 15.x

### Changed
- Rebased version numbering to align with Fess releases

### Removed
- Legacy Elasticsearch plugin files
- Unused Docker configuration

## [2.0.0] - 2024

### Added
- OpenSearch 2.x and 3.x support
- Fess integration at `/_plugin/kopf/`

### Changed
- Rebranded from elasticsearch-kopf to fess-kopf
- Updated all dependencies for modern Node.js

### Removed
- Elasticsearch compatibility
- Deprecated features: Percolator queries, Index warmers, Benchmark API
