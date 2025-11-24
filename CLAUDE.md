# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fess KOPF is a web administration tool for OpenSearch, integrated with Fess. It's a fork of elasticsearch-kopf, customized for OpenSearch 2.x and 3.x support. The project is built with JavaScript, AngularJS, jQuery, and Bootstrap.

## Build System

The project uses Grunt as its build system with npm scripts as the primary interface.

### Essential Commands

```bash
# Install dependencies
npm install

# Build for production (clean, lint, copy assets, concatenate files)
npm run build

# Run linting only
npm run lint

# Start development server with hot reload (runs on http://localhost:9000)
grunt server

# Run tests
npm test

# Run tests with coverage
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

## Architecture

### Source Structure

```
src/kopf/
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

4. **Fess Integration**: The built application is served through Fess at `/_plugin/kopf/`. Configuration is handled via `kopf_external_settings.json` which includes:
   - `opensearch_root_path`: OpenSearch connection path
   - `with_credentials`: CORS credentials flag
   - `theme`: UI theme (fess, light, dark)
   - `refresh_rate`: Cluster refresh interval in ms

## Development Workflow

### Making Changes

1. Edit source files in `src/kopf/`
2. Run `npm run build` to rebuild (or use `grunt server` for live reload)
3. Test changes at `http://localhost:9000/_site`
4. Run `npm test` before committing

### Code Quality

- JSHint is configured for linting (run via `npm run lint`)
- JSCS enforces Google JavaScript style guide (excludes theme-kopf.js)
- Jest is used for unit testing with tests in `tests/` directory
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
- `plugin-descriptor.properties`: Plugin metadata for Fess integration
