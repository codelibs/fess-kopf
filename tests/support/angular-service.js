'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../../src/kopf');

/**
 * Evaluates kopf sources with a stubbed `kopf` module object and returns
 * the registration arrays they hand it, so a service can be mounted on a
 * fresh AngularJS module without regex-extracting its body. Depends on
 * the registration call, not on how the file is formatted.
 *
 * All sources are evaluated in one function scope, so the globals they
 * define for each other (isDefined, Version, OpenSearchConnection, ...)
 * resolve exactly as they do in the concatenated bundle.
 *
 * @param {string[]} sources - paths under src/kopf, in load order
 * @return {Object} map of registered name to its DI array
 */
function collectRegistrations(sources) {
  const registrations = {};
  const stub = {};
  ['factory', 'service', 'controller', 'directive', 'filter', 'value']
      .forEach(function(kind) {
        stub[kind] = function(name, definition) {
          registrations[name] = definition;
          return stub;
        };
      });
  const body = sources
      .map(function(relative) {
        return fs.readFileSync(path.join(SRC, relative), 'utf8');
      })
      .join('\n');
  new Function('kopf', body)(stub);
  return registrations;
}

module.exports = {collectRegistrations};
