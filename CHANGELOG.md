# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **The front end is now Vue 3, built by Vite, in TypeScript.** It replaced the
  AngularJS 1.4.7 application screen by screen; `src/`, `Gruntfile.js` and the
  Jest suite are gone, and `_site/` is now entirely the Vite build. jQuery,
  Bootstrap 3, ace, angular-tree-dnd, jsontree, typeahead and jquery.csv are
  no longer shipped. Nothing on the Fess side changed: the bundle is still
  served from the same path, still addresses its assets relatively, and still
  routes on the hash
- **The interface was rebuilt on Naive UI.** Bootstrap is gone entirely: the
  controls, cards, tags and dialogs are Naive UI components, and the layout is
  a small CSS layer of flex and grid primitives rather than a framework. Every
  screen gained a heading, and the tables, the shard matrix and the cluster
  status bar were redesigned. The engine version moved out of the title bar,
  which no longer carries a product name, and into the cluster status bar with
  the rest of what the poll reports
- The palette is now tied to what the Fess admin dashboard paints around the
  iframe -- canvas `#f4f6f9`, chrome `#343a40`, AdminLTE's semantic colours --
  and is defined once, in `app/src/theme.ts`, for both Naive UI and the layout
  layer

### Added
- Query skeletons on the REST client for the query types a Fess cluster is
  operated with: match, knn, neural, neural_sparse and hybrid
- A type check (`npm run typecheck`) in CI. The bundler strips types without
  reading them, so nothing else would

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
- Count a special index that exists only in the cluster blocks, which
  `special_indices` previously missed (#36)
- Give alerts created in the same millisecond distinct ids, so one
  alert's timeout no longer removes another (#36)
- Report cluster settings as available in basic mode, where they are
  fetched successfully but the screen claimed they could not be read (#36)
- Surface a missing concat source at build time instead of silently
  dropping it from the bundle (#32)

### Removed
- The cluster health and cluster settings screens. Nothing in the shipped
  interface linked to either one, and both failed against a default OpenSearch
  install
- The 784-line Query DSL completer. It served the REST client alone and was
  larger than every other controller put together; the screen offers query
  skeletons (match, knn, neural, neural_sparse, hybrid) instead
- Public GitHub Gist sharing of cluster state (#23)
- The unreachable host history service, which stored credentials in
  localStorage in clear text (#24)
- The `?location=` query parameter; use the `location` key in
  `kopf_external_settings.json` for local development (#25)
- Percolator queries, index warmers and the benchmark API. The 2.0.0
  entry below already claimed these were gone; the code was still there
  (#30)
- The dead Jasmine and QUnit test trees, which no runner had executed
  since the move to Jest (#31)
- `Version`'s unused `distribution` argument, and the
  `isOpenSearch2OrLater` / `isOpenSearch3OrLater` helpers, which had no
  callers outside their own tests (#33)
- Detection of Asquera's `elasticsearch-http-basic` plugin, an
  Elasticsearch 1.x add-on that cannot be present on OpenSearch (#33)
- `dataset/create.sh`, which assumed mapping types and could not run (#33)
- The `ClusterHealth` model, which had no callers anywhere; the cluster
  health screen reads the API response directly (#39)

### Changed
- Bundled Bootstrap updated from 3.0.0 to 3.4.1 (#26)
- `Version.isGreater` renamed to `isAtLeast`. It always implemented
  "same or newer", which is what its one consumer needs; only the name
  said otherwise (#33)
- The compatibility warning now compares against a named minimum major
  version instead of a hardcoded `'2.0.0'` that had drifted from the
  real package version (#33)
- jscs and jshint replaced by ESLint. jshint ran with defaults and
  reported nothing; most of jscs's output was the google preset
  rejecting the `@callback` convention used throughout this codebase (#34)
- CI now gates on lint and build instead of ignoring both, runs on pull
  requests against any base branch so stacked pull requests are checked
  at all, and fails when the committed `_site` does not match a fresh
  build (#29, #35)
- AngularJS services can now be tested: `tests/support/angular-service.js`
  mounts them on a real injector, and `clusterRequest` has its first
  tests (#37)

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
