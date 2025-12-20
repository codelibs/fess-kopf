# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 15.4.0-SNAPSHOT

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
