# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fess KOPF is a web administration tool for OpenSearch, integrated with Fess. It's a fork of elasticsearch-kopf, customized for OpenSearch 2.x and 3.x support.

**A migration is in progress.** Two applications live in this repository at once:

- `src/` - the original AngularJS 1.4.7 / jQuery / Bootstrap 3 app. Still the
  one Fess serves. Built by Grunt into `_site/dist/`.
- `app/` - its replacement in Vue 3 / Vite / TypeScript, built into
  `_site/app/`. Screens are ported into it one at a time.

Both ship. `_site/index.html` stays the entry point until every screen has been
ported; at that point the Vue build's outDir moves to `_site/`, and `src/`,
`Gruntfile.js` and `_site/dist/` are deleted in a single change. Nothing on the
Fess side changes at any point.

## Build System

Two build systems run side by side during the migration: Grunt for `src/` and
Vite for `app/`. npm scripts are the interface to both.

### Essential Commands

```bash
# Install dependencies
npm install

# Build both apps for production (Grunt for src/, Vite for app/)
npm run build

# Build only the Vue app
npm run build:app

# Vite dev server for the Vue app
npm run dev:app

# Run linting only
npm run lint

# Build and serve on http://localhost:9000. This does not watch for
# changes - re-run it, or run `grunt watch`, after editing a source file
grunt server

# Run both suites (Jest for src/, Vitest for app/)
npm test

# Run only the Vue app's suite
npm run test:app

# Type-check the Vue app. The bundler strips types without checking them,
# so this is the only thing that reads types inside .vue files
npm run typecheck

# Coverage. Note this covers src/ only; use `npm run test:app -- --coverage`
# for app/
npm run test:coverage
```

### Build Output

- Build artifacts are generated in `_site/dist/`
- The build process concatenates source files into:
  - `_site/dist/kopf.js` - Application JavaScript
  - `_site/dist/kopf.css` - Application CSS
  - `_site/dist/lib.js` - Vendor JavaScript libraries
  - `_site/dist/lib.css` - Vendor CSS
- Theme files are copied separately: `dark_style.css`, `light_style.css`, `fess_style.css`

The Vue app builds to `_site/app/` (`index.html` plus hashed files under
`assets/`). Source maps are deliberately off - see the serving constraints
below.

**`_site` is the shipped artifact.** Fess never builds kopf: `deps.xml` in the
fess repository downloads this repository's tag zip and extracts `_site/**`.
CI fails the build if `_site` does not match a fresh build of both trees.

## Architecture

### Source Structure

```
app/                     # Vue 3 app (the migration target)
├── index.html
├── vite.config.mts      # .mts because package.json is CommonJS
└── src/
    ├── main.ts
    ├── router/          # hash routing; 11 routes
    ├── api/             # location resolution, settings, HTTP client
    ├── model/           # data models ported from src/kopf/opensearch/
    ├── composables/     # shared state (cluster poll, alerts)
    ├── components/
    └── views/           # one per route

src/kopf/                # AngularJS app (being replaced)
├── kopf.js              # Main AngularJS app initialization and routing
├── util.js              # Utility functions
├── opensearch/          # OpenSearch client and API models
├── models/              # Data models (cluster, indices, nodes, etc.)
├── services/            # AngularJS services (business logic layer)
├── controllers/         # AngularJS controllers (view layer)
├── filters/             # AngularJS filters for data transformation
├── directives/          # AngularJS directives (custom UI components)
└── css/                 # Component-specific stylesheets
```

### Key Architecture Patterns

1. **AngularJS MVC Pattern**: Controllers handle view logic, services contain business logic, models represent data structures

2. **Build Concatenation Order** (defined in Gruntfile.js):
   - kopf.js first (app initialization)
   - opensearch/*.js (OpenSearch API layer)
   - models/*.js (data models)
   - services/*.js (business logic)
   - filters/*.js and directives/*.js (view helpers)
   - controllers/*.js (view logic)
   - util.js last (utilities)

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

For the Vue app (`app/`):

1. Edit sources under `app/src/`
2. `npm run dev:app` for the Vite dev server, or `npm run build:app`
3. `npm run typecheck` and `npm run test:app`
4. `npm run build` and commit the resulting `_site/` before pushing

For the AngularJS app (`src/kopf/`):

1. Edit source files in `src/kopf/`
2. Run `npm run build` to rebuild (or use `grunt server` for live reload)
3. Test changes at `http://localhost:9000/_site`
4. Run `npm test` before committing

### Code Quality

- ESLint is the only linter, configured in `eslint.config.js` and run via
  `npm run lint`. It is not part of the Grunt build; CI runs it separately.
  `src/kopf/theme-kopf.js` is excluded - it is a minified vendored ace theme.
  ESLint also covers `app/`, using eslint-plugin-vue and typescript-eslint.
  Those plugin configs are scoped to `app/` in `eslint.config.js`: several of
  their entries carry no `files` key, and left unscoped they impose
  `sourceType: 'module'` on `src/kopf`, which is ecmaVersion 5 script.
- Jest runs the `src/` suite from `tests/`; Vitest runs the `app/` suite from
  `app/tests/`. They do not overlap - Jest matches `*.test.js`, Vitest
  `*.test.ts`.
- Coverage reports are generated in `coverage/` directory

## OpenSearch Compatibility

- **Supported**: OpenSearch 2.x and 3.x
- **Not Supported**: Elasticsearch (any version)
- **Removed Features**: Percolator queries, index warmers, benchmark API (all deprecated/removed in modern OpenSearch)

## Important Files

- `Gruntfile.js`: Build configuration and task definitions
- `jest.config.js`: Test configuration
- `package.json`: Dependencies and npm scripts
- `kopf_external_settings.json`: Runtime configuration (in _site/)
