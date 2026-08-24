# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fess KOPF is a web administration tool for OpenSearch, integrated with Fess.
It's a fork of elasticsearch-kopf, customized for OpenSearch 2.x and 3.x.

The application is Vue 3 + Vite + TypeScript, in `app/`, built into `_site/`.
It replaced an AngularJS 1.4.7 application screen by screen; nothing on the
Fess side changed in the process, because the serving contract in
"Serving constraints" below was treated as fixed throughout.

## Build System

Vite builds the application; npm scripts are the interface.

### Essential Commands

```bash
# Install dependencies
npm install

# Production build, into _site/
npm run build

# Vite dev server
npm run dev

# Run linting only
npm run lint

# Run the test suite
npm test

# Type-check. The bundler strips types without checking them, so this is the
# only thing that reads types inside .vue files
npm run typecheck

# Coverage
npm run test:coverage
```

### Build Output

- `npm run build` writes the whole of `_site/`: `index.html`, hashed files
  under `_site/assets/`, and everything in `app/public/` copied verbatim
  (`favicon.ico`, `kopf_external_settings.json`)
- Source maps are deliberately off - see the serving constraints below

**`_site` is the shipped artifact.** Fess never builds kopf: `deps.xml` in the
fess repository downloads this repository's tag zip and extracts `_site/**`.
CI fails the build if `_site` does not match a fresh build.

## Architecture

### Source Structure

```
app/
├── index.html
├── vite.config.mts      # .mts because package.json is CommonJS
├── public/              # copied verbatim into _site/
├── tests/
└── src/
    ├── main.ts
    ├── router/          # hash routing; 11 routes
    ├── api/             # location resolution, settings, HTTP client, endpoints
    ├── model/           # data models and formatters
    ├── composables/     # shared state (cluster poll, alerts, dialogs)
    ├── components/
    └── views/           # one per route
```

### Key Architecture Patterns

1. **Composition API throughout.** Views own their own state; anything shared
   between screens is a composable in `app/src/composables/` with
   module-scoped refs (the cluster poll, the alert stack, the dialogs). There
   is no store library.

2. **The cluster poll is the spine.** `useCluster` issues eight calls every
   `refresh_rate` ms and builds a `Cluster`; nine of the eleven screens read
   from it rather than fetching their own copy. A poll that cannot be
   assembled falls back to the reduced `local=true` view instead of blanking
   every screen.

3. **OpenSearch Integration**: This tool is designed exclusively for OpenSearch 2.x and 3.x (not Elasticsearch). It connects to OpenSearch clusters via REST API and provides a web UI for cluster management.

4. **Fess Integration**: The built application is served through Fess at
   `/_plugin/kopf/`. Configuration is handled via `kopf_external_settings.json`
   which includes:
   - `location`: OpenSearch URL for local development. Empty in the
     shipped file; Fess serves kopf from the same origin. This is the
     only way to point kopf elsewhere - the `?location=` query parameter
     was removed
   - `opensearch_root_path`: OpenSearch connection path
   - `with_credentials`: CORS credentials flag
   - `theme`: UI theme (fess, light, dark)
   - `refresh_rate`: Cluster refresh interval in ms

### Serving constraints (these decide what a build may emit)

Fess serves these files from `SearchEngineApiManager`, and three of its
behaviours constrain any build in this repository:

1. **The mount path is not knowable at build time.** kopf is served from
   `<contextPath>/admin/server_<token>/_plugin/kopf/`, where the token is a
   fresh UUID written to the session on every dashboard render
   (`SearchEngineApiManager.saveToken()`). Every asset reference must therefore
   be document-relative - which is why the Vite config sets `base: './'`, and
   why anything that bakes in a base path at build time cannot be used here.
   The REST base URL is derived at runtime from `window.location` by cutting
   the page URL at `/_plugin/kopf` (`app/src/api/location.ts`).

2. **There is no SPA fallback.** A request resolves to `index.html` only when
   the path is a real directory on disk; anything else is a hard 404. Client
   routing must therefore be hash-based.

3. **Unmapped file extensions are served with no Content-Type at all.** The
   map covers `.html .css .eot .ico .js .json .otf .svg .ttf .txt .woff
   .woff2` and nothing else. Do not emit `.mjs`, `.map`, `.wasm`, `.webp` or
   `.avif`.

## Development Workflow

### Making Changes

1. Edit sources under `app/src/`
2. `npm run dev` for the Vite dev server, or `npm run build`
3. `npm run typecheck` and `npm test`
4. `npm run build` and commit the resulting `_site/` before pushing

### Code Quality

- ESLint is the only linter, configured in `eslint.config.js` and run via
  `npm run lint`. It uses eslint-plugin-vue and typescript-eslint, both scoped
  with `files` because several of their config entries carry no `files` key of
  their own.
- Vitest runs the suite from `app/tests/`, in jsdom. Views are mounted with
  `@vue/test-utils`; `fetch` is stubbed rather than the API layer, so the
  request each screen actually issues is what gets asserted.
- Coverage reports are generated in `coverage/` directory

## OpenSearch Compatibility

- **Supported**: OpenSearch 2.x and 3.x
- **Not Supported**: Elasticsearch (any version)
- **Removed Features**: Percolator queries, index warmers, benchmark API (all
  deprecated/removed in modern OpenSearch); public Gist sharing; the cluster
  health and cluster settings screens, which nothing linked to and which both
  failed against a default OpenSearch install

## Important Files

- `app/vite.config.mts`: Build configuration
- `vitest.config.mts`: Test configuration
- `package.json`: Dependencies and npm scripts
- `app/public/kopf_external_settings.json`: Runtime configuration, copied
  into `_site/` by the build
