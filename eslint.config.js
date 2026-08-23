'use strict';

const globals = require('globals');
const tseslint = require('typescript-eslint');
const vuePlugin = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');

module.exports = [
  // The Vue app under app/.
  //
  // The plugin configs are spread whole rather than cherry-picked for their
  // rules: eslint-plugin-vue also installs a processor, and without it every
  // SFC reports vue/comment-directive.
  // Still scoped with files: some entries in these plugin configs carry no
  // files key of their own.
  ...vuePlugin.configs['flat/recommended'].map((config) => ({
    ...config,
    files: ['app/**/*.vue']
  })),
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['app/**/*.ts', 'app/**/*.vue']
  })),
  {
    // <script setup lang="ts"> needs the TypeScript parser nested inside the
    // SFC parser; vue's own config defaults the inner parser to espree.
    files: ['app/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    }
  },
  {
    files: ['app/**/*.ts', 'app/**/*.vue'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {...globals.browser}
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {args: 'none', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_'}
      ],
      // Off deliberately: this repo has no formatter, so an attribute-wrapping
      // rule only produces churn that no tool can settle.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'max-len': ['error', {code: 100, ignoreUrls: true}],
      'semi': 'error',
      'no-trailing-spaces': 'error'
    }
  }
];
