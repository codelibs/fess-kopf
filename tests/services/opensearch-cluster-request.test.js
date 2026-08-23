/**
 * Tests for OpenSearchService.clusterRequest.
 *
 * Phase 1 replaced $http(...).success()/.error() - removed in AngularJS
 * 1.6 - with .then(success, error), and started passing the HTTP status
 * to the error callback. Before that the status was always undefined,
 * which is why rest.js's "unreachable" branch was dead code. These tests
 * pin that contract.
 *
 * angular-mocks is deliberately NOT used: it only defines
 * angular.mock.module/inject when window.jasmine or window.mocha exists,
 * and Jest's default runner provides neither. Instead the real injector
 * is built and $httpBackend - AngularJS's documented low-level transport
 * contract - is replaced with a stub.
 *
 * @jest-environment jsdom
 */

const angular = require('angular');
const {collectRegistrations} = require('../support/angular-service');

describe('OpenSearchService.clusterRequest', () => {
  let service;
  let $rootScope;
  let backendCalls;
  let respondWith;

  beforeEach(() => {
    const registrations = collectRegistrations([
      'util.js',
      'opensearch/version.js',
      'opensearch/opensearch_connection.js',
      'services/opensearch.js'
    ]);

    backendCalls = [];
    respondWith = {status: 200, body: {}};

    angular.module('kopfHarness', ['ng'])
        // $location needs $rootElement, which only bootstrap provides.
        .value('$rootElement', angular.element(document))
        .factory('OpenSearchService', registrations.OpenSearchService)
        .factory('ExternalSettingsService', () => ({
          getOpenSearchRootPath: () => '',
          withCredentials: () => false,
          getRefreshRate: () => 5000
        }))
        .factory('DebugService', () => ({debug: () => {}}))
        .factory('AlertService', () => ({
          error: () => {}, warn: () => {}, info: () => {}, success: () => {}
        }))
        .factory('$httpBackend', () => function(method, url, post, callback,
            headers) {
          backendCalls.push({method, url, post, headers});
          callback(respondWith.status, respondWith.body, '', '');
        });

    const injector = angular.injector(['kopfHarness']);
    service = injector.get('OpenSearchService');
    $rootScope = injector.get('$rootScope');
    // The factory ends in `return this`, and AngularJS binds that to the
    // provider object it built for this registration - not, as is easy to
    // assume, to the global object. A fresh module per test therefore
    // gives a fresh service. Set connection explicitly anyway: the tests
    // depend on it, and it should not come from somewhere else.
    service.connection = {host: 'http://os.test:9200', withCredentials: false};
  });

  function flush() {
    $rootScope.$digest();
  }

  test('should pass the response body to success', () => {
    respondWith = {status: 200, body: {ok: true}};
    let seen;
    service.clusterRequest('GET', '/_probe', {}, {},
        function(data) { seen = data; },
        function() { seen = 'error'; });
    flush();
    expect(seen).toEqual({ok: true});
    expect(backendCalls[0].url).toBe('http://os.test:9200/_probe');
  });

  test('should pass the body AND the status to error', () => {
    respondWith = {status: 400, body: {error: {reason: 'bad'}}};
    let received;
    service.clusterRequest('GET', '/_probe', {}, {},
        function() { received = 'success'; },
        function(data, status) { received = {data: data, status: status}; });
    flush();
    expect(received.status).toBe(400);
    expect(received.data).toEqual({error: {reason: 'bad'}});
  });

  test('should report a transport failure with a non-positive status', () => {
    respondWith = {status: -1, body: ''};
    let status;
    service.clusterRequest('GET', '/_probe', {}, {},
        function() {},
        function(data, s) { status = s; });
    flush();
    // rest.js routes anything <= 0 to "is unreachable"; before Phase 1
    // this arrived as undefined and that branch could never run.
    expect(status <= 0).toBe(true);
  });

  // Phase 1 found the real leak shape twice: a handler that passes the
  // whole AngularJS response object instead of response.data. That object
  // carries .config.headers, so the Basic credential travels with it into
  // alerts and the debug log. getShardStats shipped exactly that bug.
  //
  // What this pins: the error callback receives the response BODY. Under
  // error(response, ...) both assertions below fail.
  // What it cannot pin: whether the credential reaches somewhere else
  // entirely. The stub backend replies with a fixed body and never echoes
  // the request, so a change that put the auth value into, say, the
  // request payload would not be visible here.
  test('should send Authorization but hand the error callback only the body',
      () => {
        service.connection = {
          host: 'http://os.test:9200',
          withCredentials: false,
          auth: 'Basic c2VjcmV0'
        };
        respondWith = {status: 500, body: {error: 'boom'}};
        let received;
        service.clusterRequest('GET', '/_probe', {}, {},
            function() {},
            function(data) { received = data; });
        flush();
        expect(backendCalls[0].headers.Authorization).toBe('Basic c2VjcmV0');
        expect(received).toEqual({error: 'boom'});
        expect(JSON.stringify(received)).not.toContain('c2VjcmV0');
      });
});
