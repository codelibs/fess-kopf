# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fess KOPF is a web administration tool for OpenSearch, integrated with Fess.
It's a fork of elasticsearch-kopf, customized for OpenSearch 2.x and 3.x.

The application is Vue 3 + Vite + TypeScript with Naive UI, in `app/`, built
into `_site/`. It replaced an AngularJS 1.4.7 application screen by screen;
nothing on the Fess side changed in the process, because the serving contract
in "Serving constraints" below was treated as fixed throughout.

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
    ├── router/          # hash routing; 14 routes, two plugin-gated
    ├── api/             # location resolution, settings, HTTP client, endpoints
    ├── model/           # data models and formatters
    ├── composables/     # shared state (cluster poll, capabilities, alerts, dialogs)
    ├── components/
    ├── views/           # one per route
    ├── i18n/            # locale resolution and the sixteen catalogues
    ├── theme.ts         # the palette, and Naive UI's theme overrides
    └── styles.css       # layout primitives, reading theme.ts's properties
```

### Key Architecture Patterns

1. **Composition API throughout.** Views own their own state; anything shared
   between screens is a composable in `app/src/composables/` with
   module-scoped refs (the cluster poll, the alert stack, the dialogs). There
   is no store library.

2. **The cluster poll is the spine.** `useCluster` issues eight calls every
   `refresh_rate` ms and builds a `Cluster`; nine of the fourteen screens read
   from it rather than fetching their own copy. A poll that cannot be
   assembled falls back to the reduced `local=true` view instead of blanking
   every screen.

3. **One palette, two consumers.** kopf renders inside an iframe in the Fess
   admin dashboard, so its colours are not a free choice: the canvas
   (`#f4f6f9`), the dark chrome (`#343a40`) and the semantic colours are what
   AdminLTE 3.2 paints around it. `app/src/theme.ts` holds both palettes and
   feeds them to Naive UI's theme overrides *and* to the CSS custom properties
   `styles.css` reads, so the components and the layout cannot end up on
   different colours. Note that the Fess admin interface ships AdminLTE 3.2.0
   with **Bootstrap 4.6.2** and Font Awesome 5.12 - not Bootstrap 5.

4. **Naive UI supplies controls, not layout.** Cards, inputs, selects,
   checkboxes, buttons, tags and alerts are Naive UI. Layout is the small flex
   and grid layer in `styles.css`; no CSS framework is bundled. Four things
   are deliberately *not* Naive UI components:
   - the confirmation and info dialogs are native `<dialog>` elements, because
     `NModal` teleports to `document.body` and would put the confirmation of a
     destructive action outside the component tree
   - the cluster grid's per-index and per-shard menus are `<details>`, because
     the grid renders hundreds of them and a teleporting menu component would
     move every popover out of the table. Their panels are `position: fixed`
     and placed by `useDetailsMenu`: the grid scrolls horizontally, and a box
     that scrolls on one axis clips the other one too, so a panel laid out
     inside it is cut off
   - the tables are hand-rolled: each has a composite cell and its own filter
     and sort model, so a data-grid component would mean more render functions,
     not fewer
   - the REST client's completion popup is a plain list positioned at the
     caret, because the body editor is an `NInput` textarea and Naive UI has
     no control that completes inside one

5. **The body editor completes without an editor library.** The REST client
   offers query DSL completions from a scanner and a definition table
   (`app/src/model/query-dsl.ts`, `query-dsl-completer.ts`), which take the
   text and a caret offset and return what to offer and what the text becomes
   when one is accepted -- no DOM, so all of it is unit-tested. The only DOM
   part is `app/src/components/caret.ts`, which lays the text out again in a
   hidden div to find the caret's coordinates. Reaching for CodeMirror or
   Monaco instead would buy syntax highlighting at several hundred kB in a
   `_site` that was deliberately cut from 3.0 MB to under 1 MB when ace was
   dropped. `JsonEditor` takes the completer as an optional prop, so the four
   other screens that use it stay plain textareas.

6. **The locale comes from Fess, not from the browser.** Fess resolves the
   admin console's locale itself (`FessUserLocaleProcessProvider`: browser
   `Accept-Language`, overridable per request with `browser_lang`) and passes
   it to kopf as `?lang=` on the iframe URL. `app/src/i18n/locale.ts`
   reproduces `java.util.ResourceBundle`'s fallback over the same sixteen
   `fess_label` locales -- exact tag, then language, then English -- so the
   iframe and the page around it cannot disagree. Reading
   `navigator.language` instead is only the fallback for when kopf is served
   outside Fess; it is wrong whenever `browser_lang` was used.

   `en.json` is both the fallback for a missing key and the type that defines
   the key set, so a mistyped key is a compile error. The catalogue tests fail
   on a missing key, a dropped `{placeholder}` or an empty message, which is
   what keeps fifteen hand-authored catalogues honest. Naive UI's own strings
   come from its locale export, selected from the same resolved tag.

   What gets translated is a rule, not a judgement call: **if kopf says it,
   translate it; if OpenSearch says it, leave it.** Prose, buttons, menu
   actions, placeholders, empty states, alerts and confirmations are
   translated. The navigation, table headers, form field labels, status
   values, node roles, JSON keys and `_cat` API names are not.

7. **Capability detection, not version branching.** kopf serves OpenSearch
   2.x and 3.x from one build, and what separates those versions is not the
   number: it is which plugins are installed and which `_cat` APIs the
   distribution publishes. `app/src/composables/useCapabilities.ts` asks the
   cluster once, at mount -- `GET /_cat` for the API list and
   `GET /_nodes/_all/plugins` for the plugins -- and screens read the answer.
   Deliberately not part of the poll: that answer changes when a node
   restarts, not every `refresh_rate`. Both halves fail safe. A denied
   `GET /_cat` leaves the shipped `CAT_APIS` list in place, and a denied
   plugin probe leaves the set empty, which hides a plugin-backed screen
   rather than offering something the cluster cannot answer. `Version` stays
   what it is -- the warning for anything older than 2.x -- and is not the
   place to add feature checks.

   `ROUTE_PLUGINS` in `app/src/router/index.ts` is the whole of the gating:
   it maps a route name to the plugin it needs, and `AppHeader` drops any
   route whose plugin is absent. Adding a plugin-backed screen means adding
   one entry there, not a condition in the header.

8. **OpenSearch Integration**: This tool is designed exclusively for OpenSearch 2.x and 3.x (not Elasticsearch). It connects to OpenSearch clusters via REST API and provides a web UI for cluster management.

9. **Fess Integration**: The built application is served through Fess at
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

- Naive UI is pinned to the 2.x line, which is MIT. Do not reach for PrimeVue:
  from 5.0.0 it is distributed under the commercial PrimeUI licence, which
  requires a licence key and restricts redistribution - and `_site` ships
  inside Fess to every user. PrimeVue 4.5.5 is still MIT but is the end of that
  line.
- ESLint is the only linter, configured in `eslint.config.js` and run via
  `npm run lint`. It uses eslint-plugin-vue and typescript-eslint, both scoped
  with `files` because several of their config entries carry no `files` key of
  their own.
- Vitest runs the suite from `app/tests/`, in jsdom. Views are mounted with
  `@vue/test-utils`; `fetch` is stubbed rather than the API layer, so the
  request each screen actually issues is what gets asserted.
- `app/tests/support/setup.ts` shims `matchMedia`, `ResizeObserver` and
  `Element.scrollTo`, none of which jsdom implements and all of which Naive
  UI's dropdowns call. Without them a mounted view throws before the first
  assertion.
- `NSelect` and `NCheckbox` are not native form controls - a non-filterable
  `NSelect` renders no `<input>` at all - so tests reach them through
  `app/tests/support/naive.ts`, which matches on the `id` that falls through
  to their root element.
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
