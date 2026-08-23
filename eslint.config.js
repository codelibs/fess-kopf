'use strict';

const globals = require('globals');

module.exports = [
  {
    files: ['src/kopf/**/*.js'],
    ignores: ['src/kopf/theme-kopf.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.jquery,
        // Vendored libraries, loaded from _site/dist/lib.js.
        angular: 'readonly',
        JSONTree: 'readonly',
        ace: 'readonly',
        doCSV: 'readonly',
        // kopf's own globals. Every src/kopf file is concatenated into a
        // single bundle, so these are shared across files by design.
        //
        // Node, Request and NodeFilter are deliberately absent: kopf
        // defines all three at bundle scope, shadowing the DOM Node, the
        // Fetch Request and the TreeWalker NodeFilter that globals.browser
        // already supplies. Cross-file uses therefore satisfy no-undef by
        // coincidence rather than by declaration. Declaring them here would
        // not change that; renaming them in the source would.
        kopf: 'writable',
        AceEditor: 'readonly',
        Alias: 'readonly',
        AliasFilter: 'readonly',
        BrokenCluster: 'readonly',
        CatResult: 'readonly',
        Cluster: 'readonly',
        ClusterChanges: 'readonly',
        ClusterMapping: 'readonly',
        ClusterSettings: 'readonly',
        createQueryDslCompleter: 'readonly',
        EditableIndexSettings: 'readonly',
        getProperty: 'readonly',
        getTimeString: 'readonly',
        HotThread: 'readonly',
        HotThreads: 'readonly',
        Index: 'readonly',
        IndexAliases: 'readonly',
        IndexFilter: 'readonly',
        IndexMetadata: 'readonly',
        IndexTemplate: 'readonly',
        IndexTemplateFilter: 'readonly',
        isDefined: 'readonly',
        ModalControls: 'readonly',
        NodeHotThreads: 'readonly',
        NodeStats: 'readonly',
        notEmpty: 'readonly',
        OpenSearchConnection: 'readonly',
        Paginator: 'readonly',
        readablizeBytes: 'readonly',
        Repository: 'readonly',
        Shard: 'readonly',
        ShardStats: 'readonly',
        Snapshot: 'readonly',
        SnapshotFilter: 'readonly',
        Token: 'readonly',
        URLAutocomplete: 'readonly',
        Version: 'readonly'
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      'no-undef': 'error',
      // caughtErrors: ecmaVersion 5 has no optional catch binding, so a
      // catch clause that only recovers (clears bad state, logs, calls a
      // failure callback) without needing the error object must still name
      // a parameter. '_'-prefixing it is this codebase's signal that the
      // omission is deliberate, not an oversight.
      'no-unused-vars': [
        'error',
        {args: 'none', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_'}
      ],
      // builtinGlobals: false - every identifier this config declares as a
      // kopf/vendor global is *defined* by exactly one src/kopf file (a
      // top-level `function Foo` or the vendored csv.js). That defining
      // file's own declaration must not be flagged as "redeclaring" the
      // global that exists only so other concatenated files pass no-undef.
      // Real same-scope redeclarations (e.g. `function X` twice in one
      // file) are still caught.
      'no-redeclare': ['error', {builtinGlobals: false}],
      'no-shadow-restricted-names': 'error',
      'eqeqeq': ['warn', 'smart'],
      'max-len': ['error', {code: 80, ignoreUrls: true}],
      'semi': 'error',
      'no-trailing-spaces': 'error'
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': ['error', {args: 'none'}],
      'semi': 'error'
    }
  }
];
